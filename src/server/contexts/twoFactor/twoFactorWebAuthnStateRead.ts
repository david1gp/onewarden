import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { TwoFactorWebAuthnState } from "./twoFactorAdapters.js"
import { twoFactorWebAuthnOriginResolve } from "./twoFactorWebAuthnOriginResolve.js"
import { twoFactorPersistedJsonParse } from "./twoFactorPersistedJsonParse.js"
import { twoFactorWebAuthnStateSchema } from "./twoFactorWebAuthnStateSchema.js"

export function twoFactorWebAuthnStateRead(data: string): Result<TwoFactorWebAuthnState> {
  const op = "twoFactorWebAuthnStateRead"
  const stateResult = twoFactorPersistedJsonParse(op, data, twoFactorWebAuthnStateSchema, "Webauthn state is invalid")
  if (!stateResult.success) return stateResult
  const originResult = twoFactorWebAuthnOriginResolve(stateResult.data.origin)
  if (
    !originResult.success ||
    originResult.data !== stateResult.data.origin ||
    stateResult.data.rpId !== new URL(stateResult.data.origin).hostname
  )
    return resultErrorCreate(op, "Webauthn state is invalid")
  return resultCreate(stateResult.data)
}
