import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { TwoFactorWebAuthnState } from "./twoFactorAdapters.js"
import { twoFactorWebAuthnOriginResolve } from "./twoFactorWebAuthnOriginResolve.js"

export function twoFactorWebAuthnStateRead(data: string): Result<TwoFactorWebAuthnState> {
  try {
    const parsed = JSON.parse(data) as TwoFactorWebAuthnState
    if (
      typeof parsed.challenge !== "string" ||
      !Array.isArray(parsed.credentialIds) ||
      !parsed.credentialIds.every((credentialId) => typeof credentialId === "string") ||
      (parsed.kind !== "registration" && parsed.kind !== "login") ||
      typeof parsed.userUuid !== "string" ||
      !Number.isSafeInteger(parsed.expiresAt) ||
      typeof parsed.origin !== "string" ||
      typeof parsed.rpId !== "string" ||
      (parsed.appId !== undefined && typeof parsed.appId !== "string") ||
      (parsed.credentials !== undefined &&
        (!Array.isArray(parsed.credentials) ||
          !parsed.credentials.every(
            (credential) =>
              typeof credential.id === "string" &&
              (credential.publicKey === undefined || typeof credential.publicKey === "string") &&
              (credential.counter === undefined ||
                (Number.isSafeInteger(credential.counter) && credential.counter >= 0)) &&
              (credential.transports === undefined ||
                (Array.isArray(credential.transports) &&
                  credential.transports.every((transport) => typeof transport === "string"))),
          )))
    )
      return resultErrorCreate("twoFactorWebAuthnStateRead", "Webauthn state is invalid")
    const originResult = twoFactorWebAuthnOriginResolve(parsed.origin)
    if (!originResult.success || originResult.data !== parsed.origin || parsed.rpId !== new URL(parsed.origin).hostname)
      return resultErrorCreate("twoFactorWebAuthnStateRead", "Webauthn state is invalid")
    return resultCreate(parsed)
  } catch {
    return resultErrorCreate("twoFactorWebAuthnStateRead", "Webauthn state is invalid")
  }
}
