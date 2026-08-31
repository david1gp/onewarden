import * as v from "valibot"
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

const extensionWebAuthnRequestContextSenderSchema = v.looseObject({
  tab: v.looseObject({ id: v.pipe(v.number(), v.safeInteger(), v.minValue(0)) }),
  frameId: v.optional(v.pipe(v.number(), v.safeInteger(), v.minValue(0)), 0),
  url: v.string(),
})

export function extensionWebAuthnRequestContextResolve(sender: unknown): Result<ExtensionWebAuthnRequestContext> {
  const op = "extensionWebAuthnRequestContextResolve"
  const senderResult = v.safeParse(extensionWebAuthnRequestContextSenderSchema, sender)
  if (!senderResult.success) {
    return resultErrorCreate(op, "WebAuthn message sender is invalid.", {
      code: "platform.forbidden",
      statusCode: 403,
    })
  }
  const { tab, frameId, url } = senderResult.output
  const originResult = extensionWebAuthnOriginValidate(url)
  if (!originResult.success) return originResult

  return resultCreate({
    tabId: tab.id,
    frameId,
    url,
    origin: originResult.data.origin,
    hostname: originResult.data.hostname,
    isLocalhost: originResult.data.isLocalhost,
  })
}

export type { ExtensionWebAuthnRequestContext }
