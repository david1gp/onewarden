import { parse as tldtsParse } from "tldts"
import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionPasskeyRpIdNormalize } from "../passkey/extensionPasskeyRpIdNormalize.js"

export function extensionWebAuthnRpIdValidate(rpId: string | null, originHostname: string): Result<string> {
  const op = "extensionWebAuthnRpIdValidate"
  const normalizedOriginHostname = originHostname.toLowerCase().replace(/\.$/u, "")
  const rpIdResult = extensionPasskeyRpIdNormalize(rpId ?? normalizedOriginHostname)
  if (!rpIdResult.success) return rpIdResult
  const normalizedRpId = rpIdResult.data

  if (normalizedOriginHostname === "localhost") {
    if (normalizedRpId !== "localhost") return invalid(op)
    return resultCreate(normalizedRpId)
  }

  const originDomain = tldtsParse(normalizedOriginHostname, { allowPrivateDomains: true })
  const rpDomain = tldtsParse(normalizedRpId, { allowPrivateDomains: true })
  if (originDomain.isIp || rpDomain.isIp || rpDomain.domain === null) return invalid(op)
  if (normalizedOriginHostname !== normalizedRpId && !normalizedOriginHostname.endsWith(`.${normalizedRpId}`)) {
    return invalid(op)
  }
  return resultCreate(normalizedRpId)
}

function invalid<T>(op: string): Result<T> {
  return resultErrorCreate(op, "WebAuthn RP ID is not valid for the requesting origin.", {
    code: "platform.forbidden",
    statusCode: 403,
  })
}
