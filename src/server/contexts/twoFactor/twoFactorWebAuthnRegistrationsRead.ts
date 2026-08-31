import { twoFactorPersistedJsonParse } from "./twoFactorPersistedJsonParse.js"
import { twoFactorWebAuthnRegistrationsSchema } from "./twoFactorWebAuthnRegistrationsSchema.js"

export function twoFactorWebAuthnRegistrationsRead(data: string) {
  const op = "twoFactorWebAuthnRegistrationsRead"
  return twoFactorPersistedJsonParse(op, data, twoFactorWebAuthnRegistrationsSchema, "Webauthn data is invalid")
}
