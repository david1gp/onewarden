import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"

export function extensionWebAuthnFramePolicyValidate(frameId: number, featureAllowed: boolean): Result<void> {
  const op = "extensionWebAuthnFramePolicyValidate"
  if (frameId !== 0) {
    return resultErrorCreate(op, "WebAuthn is only enabled in the top-level frame.", {
      code: "platform.forbidden",
      statusCode: 403,
    })
  }
  if (!featureAllowed) {
    return resultErrorCreate(op, "WebAuthn is not enabled by this document's Permissions Policy.", {
      code: "platform.forbidden",
      statusCode: 403,
    })
  }
  return resultCreate(undefined)
}
