import type { TwoFactorWebAuthnCredential } from "./twoFactorAdapters.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export function twoFactorWebAuthnRegistrationsRead(data: string) {
  const op = "twoFactorWebAuthnRegistrationsRead"
  try {
    const parsed: unknown = JSON.parse(data)
    if (!Array.isArray(parsed)) return resultErrorCreate(op, "Webauthn data is invalid")
    const registrations = []
    const ids = new Set<number>()
    const credentialIds = new Set<string>()
    for (const entry of parsed) {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry))
        return resultErrorCreate(op, "Webauthn registration is invalid")
      const value = entry as Record<string, unknown>
      if (
        typeof value.id !== "number" ||
        !Number.isSafeInteger(value.id) ||
        value.id < 1 ||
        value.id > 5 ||
        typeof value.name !== "string" ||
        ids.has(value.id)
      )
        return resultErrorCreate(op, "Webauthn registration is invalid")
      const credential = twoFactorWebAuthnCredentialRead(value.credential)
      if (value.credential !== undefined && credential === undefined)
        return resultErrorCreate(op, "Webauthn credential is invalid")
      const credentialId =
        credential?.id ?? (typeof value.credentialId === "string" ? value.credentialId : String(value.id))
      if (credentialId === "" || credentialIds.has(credentialId))
        return resultErrorCreate(op, "Webauthn credential is invalid")
      ids.add(value.id)
      credentialIds.add(credentialId)
      registrations.push({
        credential,
        credentialId,
        id: value.id,
        migrated: value.migrated === true,
        name: value.name,
      })
    }
    return resultCreate(registrations)
  } catch {
    return resultErrorCreate(op, "Webauthn data is invalid")
  }
}

function twoFactorWebAuthnCredentialRead(value: unknown): TwoFactorWebAuthnCredential | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined
  const credential = value as Record<string, unknown>
  if (typeof credential.id !== "string" || credential.id === "") return undefined
  if (credential.publicKey !== undefined && typeof credential.publicKey !== "string") return undefined
  if (
    credential.counter !== undefined &&
    (typeof credential.counter !== "number" || !Number.isSafeInteger(credential.counter) || credential.counter < 0)
  )
    return undefined
  if (credential.transports !== undefined && !Array.isArray(credential.transports)) return undefined
  if (credential.transports !== undefined && !credential.transports.every((transport) => typeof transport === "string"))
    return undefined
  return {
    counter: typeof credential.counter === "number" ? credential.counter : undefined,
    id: credential.id,
    publicKey: credential.publicKey as string | undefined,
    transports: credential.transports as string[] | undefined,
  }
}
