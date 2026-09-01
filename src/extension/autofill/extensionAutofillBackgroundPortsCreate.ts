import * as v from "valibot"
import type { ExtensionAutofillBackgroundMessage } from "./extensionAutofillBackgroundMessageSchema.js"
import { extensionAutofillContentMessageSchema } from "./extensionAutofillContentMessageSchema.js"
import { extensionAutofillPortName } from "./extensionAutofillPortName.js"

type BackgroundPort = {
  name: string
  sender?: { tab?: { id?: number }; frameId?: number; url?: string }
  postMessage: (message: unknown) => void
  disconnect: () => void
  onMessage: { addListener: (listener: (message: unknown) => void) => void }
  onDisconnect: { addListener: (listener: () => void) => void }
}
type BackgroundRuntime = {
  onConnect: { addListener: (listener: (port: BackgroundPort) => void) => void }
}

/** Owns validated per-tab/frame autofill ports without accepting page values or distributing vault data. */
export function extensionAutofillBackgroundPortsCreate(runtime: BackgroundRuntime): {
  stopAll: (reason: "background" | "locked" | "logout" | "accountChanged") => void
  connectionsCount: () => number
} {
  const connections = new Map<string, { port: BackgroundPort; documentId: string | null; lastRevision: number }>()

  runtime.onConnect.addListener((port) => {
    if (port.name !== extensionAutofillPortName) return
    const tabId = port.sender?.tab?.id
    const frameId = port.sender?.frameId
    if (tabId === undefined || frameId === undefined || !extensionAutofillSenderUrlCheck(port.sender?.url)) {
      port.disconnect()
      return
    }
    const key = `${tabId}:${frameId}`
    const previous = connections.get(key)
    if (previous !== undefined && previous.port !== port) previous.port.disconnect()
    const connection = { port, documentId: null as string | null, lastRevision: -1 }
    connections.set(key, connection)

    port.onMessage.addListener((rawMessage) => {
      if (connections.get(key)?.port !== port) return
      const parsed = v.safeParse(extensionAutofillContentMessageSchema, rawMessage)
      if (!parsed.success) return
      const message = parsed.output
      if (message.type === "autofill.ready") {
        if (connection.documentId !== null) return
        connection.documentId = message.documentId
        connection.lastRevision = message.revision
        extensionAutofillBackgroundMessagePost(port, {
          type: "autofill.start",
          documentId: message.documentId,
        })
        return
      }
      if (connection.documentId === null || message.documentId !== connection.documentId) return
      if ("revision" in message) {
        if (message.revision <= connection.lastRevision) return
        connection.lastRevision = message.revision
      }
      // Valid field/lifecycle metadata is intentionally ephemeral. Candidate lookup starts in task 10.
    })
    port.onDisconnect.addListener(() => {
      if (connections.get(key)?.port === port) connections.delete(key)
    })
  })

  return {
    stopAll: (reason) => {
      for (const connection of connections.values()) {
        if (connection.documentId === null) continue
        extensionAutofillBackgroundMessagePost(connection.port, {
          type: "autofill.stop",
          documentId: connection.documentId,
          reason,
        })
      }
    },
    connectionsCount: () => connections.size,
  }
}

function extensionAutofillBackgroundMessagePost(
  port: BackgroundPort,
  message: ExtensionAutofillBackgroundMessage,
): void {
  try {
    port.postMessage(message)
  } catch {
    // A disconnected frame is removed by its onDisconnect callback.
  }
}

function extensionAutofillSenderUrlCheck(url: string | undefined): boolean {
  if (url === undefined) return false
  try {
    const protocol = new URL(url).protocol
    return ["http:", "https:", "about:", "blob:", "data:"].includes(protocol)
  } catch {
    return false
  }
}
