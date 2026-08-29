import { type Result } from "#result"
import { randomUUID } from "node:crypto"
import { base64Decode } from "../../../shared/crypto/base64Decode.js"
import { base64UrlDecode } from "../../../shared/crypto/base64UrlDecode.js"
import { base64UrlEncode } from "../../../shared/crypto/base64UrlEncode.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { DatabaseConnection } from "../../database/database.js"
import { twoFactorProviderType } from "./twoFactorProviderType.js"
import { twoFactorRecordFindByUserAndType } from "./twoFactorRecordFindByUserAndType.js"
import { twoFactorRecordSave } from "./twoFactorRecordSave.js"
import { twoFactorWebAuthnRegistrationsRead } from "./twoFactorWebAuthnRegistrationsRead.js"

type LegacyU2fRegistration = {
  counter: number
  id: number
  migrated: boolean
  name: string
  reg: {
    keyHandle: Uint8Array
    pubKey: Uint8Array
  }
  source: Record<string, unknown>
}

export function twoFactorWebAuthnU2fMigrate(database: DatabaseConnection): Result<void> {
  const op = "twoFactorWebAuthnU2fMigrate"
  try {
    const rows = database
      .query<
        { uuid: string; user_uuid: string; atype: number; enabled: number; data: string; last_used: number },
        [number]
      >("SELECT uuid, user_uuid, atype, enabled, data, last_used FROM twofactor WHERE atype = ?")
      .all(twoFactorProviderType.u2f)
    for (const row of rows) {
      const registrationsResult = legacyU2fRegistrationsRead(row.data)
      if (!registrationsResult.success) return registrationsResult
      const registrations = registrationsResult.data
      if (registrations.length === 0 || registrations[0]?.migrated === true) continue

      const webauthnResult = twoFactorRecordFindByUserAndType(database, row.user_uuid, twoFactorProviderType.webauthn)
      if (!webauthnResult.success) return webauthnResult
      if (webauthnResult.data !== null) {
        const existingRegistrationsResult = twoFactorWebAuthnRegistrationsRead(webauthnResult.data.data)
        if (!existingRegistrationsResult.success) return existingRegistrationsResult
        if (existingRegistrationsResult.data.length > 0) continue
      }

      const webauthnRegistrations = registrations.map((registration) => ({
        credential: {
          counter: registration.counter,
          id: base64UrlEncode(registration.reg.keyHandle),
          publicKey: base64UrlEncode(twoFactorWebAuthnCosePublicKeyCreate(registration.reg.pubKey)),
        },
        credentialId: base64UrlEncode(registration.reg.keyHandle),
        id: registration.id,
        migrated: true,
        name: registration.name,
      }))
      const migratedData = JSON.stringify(
        registrations.map((registration) => ({ ...registration.source, migrated: true })),
      )
      const saveResult = databaseTransaction(database, () => {
        const u2fSaveResult = twoFactorRecordSave(database, {
          uuid: row.uuid,
          userUuid: row.user_uuid,
          type: twoFactorProviderType.u2f,
          enabled: row.enabled === 1,
          data: migratedData,
          lastUsed: row.last_used,
        })
        if (!u2fSaveResult.success) return u2fSaveResult
        return twoFactorRecordSave(database, {
          uuid: webauthnResult.data?.uuid ?? randomUUID(),
          userUuid: row.user_uuid,
          type: twoFactorProviderType.webauthn,
          enabled: true,
          data: JSON.stringify(webauthnRegistrations),
          lastUsed: 0,
        })
      })
      if (!saveResult.success) return saveResult
    }
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Webauthn U2F migration failed.")
  }
}

function legacyU2fRegistrationsRead(data: string): Result<LegacyU2fRegistration[]> {
  const op = "twoFactorWebAuthnU2fMigrate"
  try {
    const parsed: unknown = JSON.parse(data)
    if (!Array.isArray(parsed)) return resultErrorCreate(op, "Webauthn U2F data is invalid.")
    const registrations: LegacyU2fRegistration[] = []
    for (const entry of parsed) {
      if (typeof entry !== "object" || entry === null || Array.isArray(entry))
        return resultErrorCreate(op, "Webauthn U2F registration is invalid.")
      const value = entry as Record<string, unknown>
      const id = value.id
      const name = value.name
      const counter = value.counter
      const nested = value.reg
      if (
        typeof id !== "number" ||
        !Number.isSafeInteger(id) ||
        id < 1 ||
        id > 5 ||
        typeof name !== "string" ||
        typeof counter !== "number" ||
        !Number.isSafeInteger(counter) ||
        counter < 0 ||
        typeof nested !== "object" ||
        nested === null ||
        Array.isArray(nested)
      )
        return resultErrorCreate(op, "Webauthn U2F registration is invalid.")
      const registration = nested as Record<string, unknown>
      const keyHandleResult = legacyBytesRead(registration.keyHandle ?? registration.key_handle)
      const publicKeyResult = legacyBytesRead(registration.pubKey ?? registration.pub_key)
      if (
        !keyHandleResult.success ||
        !publicKeyResult.success ||
        publicKeyResult.data.length !== 65 ||
        publicKeyResult.data[0] !== 4
      )
        return resultErrorCreate(op, "Webauthn U2F key is invalid.")
      registrations.push({
        counter,
        id,
        migrated: value.migrated === true,
        name,
        reg: { keyHandle: keyHandleResult.data, pubKey: publicKeyResult.data },
        source: value,
      })
    }
    return resultCreate(registrations)
  } catch {
    return resultErrorCreate(op, "Webauthn U2F data is invalid.")
  }
}

function legacyBytesRead(value: unknown): Result<Uint8Array> {
  if (
    Array.isArray(value) &&
    value.every((byte) => typeof byte === "number" && Number.isInteger(byte) && byte >= 0 && byte <= 255)
  )
    return resultCreate(Uint8Array.from(value as number[]))
  if (typeof value !== "string" || value === "")
    return resultErrorCreate("legacyBytesRead", "Legacy bytes are invalid.")
  const base64Result = base64Decode(value)
  if (base64Result.success) return base64Result
  return base64UrlDecode(value)
}

function twoFactorWebAuthnCosePublicKeyCreate(publicKey: Uint8Array): Uint8Array {
  return Uint8Array.from([
    0xa5,
    0x01,
    0x02,
    0x03,
    0x26,
    0x20,
    0x01,
    0x21,
    0x58,
    0x20,
    ...publicKey.slice(1, 33),
    0x22,
    0x58,
    0x20,
    ...publicKey.slice(33, 65),
  ])
}
