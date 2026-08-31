import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionWebAuthnOriginValidate } from "./extensionWebAuthnOriginValidate.js"

type ExtensionWebAuthnRequestContext = {
  tabId: number
  frameId: number
  url: string
  origin: string
  hostname: string
  isLocalhost: boolean
}

export function extensionWebAuthnRequestContextResolve(sender: unknown): Result<ExtensionWebAuthnRequestContext> {
  const op = "extensionWebAuthnRequestContextResolve"
  if (sender === null || typeof sender !== "object" || Array.isArray(sender)) {
    return resultErrorCreate(op, "WebAuthn message sender is invalid.", {
      code: "platform.forbidden",
      statusCode: 403,
    })
  }

  const senderRecord = sender as Record<string, unknown>
  const tab = senderRecord.tab
  if (tab === null || typeof tab !== "object" || Array.isArray(tab)) {
    return resultErrorCreate(op, "WebAuthn message sender is not a tab.", {
      code: "platform.forbidden",
      statusCode: 403,
    })
  }
  const tabId = (tab as Record<string, unknown>).id
  if (!Number.isSafeInteger(tabId) || (tabId as number) < 0) {
    return resultErrorCreate(op, "WebAuthn message tab is invalid.", {
      code: "platform.forbidden",
      statusCode: 403,
    })
  }

  const url = senderRecord.url
  if (typeof url !== "string") {
    return resultErrorCreate(op, "WebAuthn message sender URL is missing.", {
      code: "platform.forbidden",
      statusCode: 403,
    })
  }
  const originResult = extensionWebAuthnOriginValidate(url)
  if (!originResult.success) return originResult

  const frameId = senderRecord.frameId === undefined ? 0 : senderRecord.frameId
  if (!Number.isSafeInteger(frameId) || (frameId as number) < 0) {
    return resultErrorCreate(op, "WebAuthn message frame is invalid.", {
      code: "platform.forbidden",
      statusCode: 403,
    })
  }

  return resultCreate({
    tabId: tabId as number,
    frameId: frameId as number,
    url,
    origin: originResult.data.origin,
    hostname: originResult.data.hostname,
    isLocalhost: originResult.data.isLocalhost,
  })
}

export type { ExtensionWebAuthnRequestContext }
