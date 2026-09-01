import { expect, test } from "bun:test"
import { extensionAutofillBackgroundPortsCreate } from "../../../src/extension/autofill/extensionAutofillBackgroundPortsCreate.js"
import { extensionAutofillPortName } from "../../../src/extension/autofill/extensionAutofillPortName.js"

function eventCreate<T extends (...args: never[]) => void>() {
  const listeners: T[] = []
  return {
    addListener: (listener: T) => listeners.push(listener),
    emit: (...args: Parameters<T>) => {
      for (const listener of listeners) listener(...args)
    },
  }
}

function portCreate(tabId: number, frameId: number, url = "https://example.test/login") {
  const messages: unknown[] = []
  const onMessage = eventCreate<(message: unknown) => void>()
  const onDisconnect = eventCreate<() => void>()
  let disconnected = false
  return {
    name: extensionAutofillPortName,
    sender: { tab: { id: tabId }, frameId, url },
    postMessage: (message: unknown) => messages.push(message),
    disconnect: () => {
      disconnected = true
      onDisconnect.emit()
    },
    onMessage,
    onDisconnect,
    messages,
    disconnected: () => disconnected,
  }
}

test("background ports are isolated per tab/frame, validate messages, and clean up disconnects", () => {
  const onConnect = eventCreate<(port: ReturnType<typeof portCreate>) => void>()
  const manager = extensionAutofillBackgroundPortsCreate({ onConnect })
  const top = portCreate(4, 0)
  const frame = portCreate(4, 7, "https://embedded.example.test/form")
  onConnect.emit(top)
  onConnect.emit(frame)

  top.onMessage.emit({ type: "autofill.ready", documentId: "top-doc", revision: 0 })
  top.onMessage.emit({ type: "autofill.ready", documentId: "replayed-doc", revision: 9 })
  frame.onMessage.emit({ type: "autofill.ready", documentId: "frame-doc", revision: 0 })
  top.onMessage.emit({ type: "autofill.fieldsChanged", documentId: "wrong-doc", revision: 1, fields: [] })
  top.onMessage.emit({ type: "autofill.fieldsChanged", documentId: "top-doc", revision: 1, fields: [], value: "leak" })

  expect(manager.connectionsCount()).toBe(2)
  expect(top.messages).toEqual([{ type: "autofill.start", documentId: "top-doc" }])
  expect(frame.messages).toEqual([{ type: "autofill.start", documentId: "frame-doc" }])

  manager.stopAll("locked")
  expect(top.messages.at(-1)).toEqual({ type: "autofill.stop", documentId: "top-doc", reason: "locked" })
  expect(frame.messages.at(-1)).toEqual({ type: "autofill.stop", documentId: "frame-doc", reason: "locked" })
  frame.disconnect()
  expect(manager.connectionsCount()).toBe(1)
})

test("background replaces stale same-frame ports and rejects untrusted sender contexts", () => {
  const onConnect = eventCreate<(port: ReturnType<typeof portCreate>) => void>()
  const manager = extensionAutofillBackgroundPortsCreate({ onConnect })
  const stale = portCreate(8, 2)
  const current = portCreate(8, 2)
  const invalid = portCreate(9, 0, "chrome://settings")

  onConnect.emit(stale)
  onConnect.emit(current)
  onConnect.emit(invalid)

  expect(stale.disconnected()).toBe(true)
  expect(invalid.disconnected()).toBe(true)
  expect(manager.connectionsCount()).toBe(1)
})
