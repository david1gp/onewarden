import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"

const labelPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u
const ipv4Pattern = /^(?:\d{1,3}\.){3}\d{1,3}$/u

export function extensionPasskeyRpIdNormalize(value: string): Result<string> {
  const op = "extensionPasskeyRpIdNormalize"
  const rpId = value.toLowerCase().replace(/\.$/u, "")
  if (rpId === "localhost") return resultCreate(rpId)
  if (rpId.length === 0 || rpId.length > 253 || rpId.includes(".") === false || ipv4Pattern.test(rpId))
    return resultErrorCreate(op, "WebAuthn RP ID is invalid.", { code: "platform.invalid-request", statusCode: 400 })
  const labels = rpId.split(".")
  if (labels.some((label) => !labelPattern.test(label)))
    return resultErrorCreate(op, "WebAuthn RP ID is invalid.", { code: "platform.invalid-request", statusCode: 400 })
  return resultCreate(rpId)
}
