import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { base64UrlEncode } from "../../../shared/crypto/base64UrlEncode.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { twoFactorProviderType } from "./twoFactorProviderType.js"
import { twoFactorRecordDelete } from "./twoFactorRecordDelete.js"
import { twoFactorRecordFindByUserAndType } from "./twoFactorRecordFindByUserAndType.js"
import { twoFactorRecordSave } from "./twoFactorRecordSave.js"
import type { TwoFactorWebAuthnState } from "./twoFactorAdapters.js"
import { twoFactorWebAuthnOriginResolve } from "./twoFactorWebAuthnOriginResolve.js"
import { twoFactorWebAuthnRegistrationsRead } from "./twoFactorWebAuthnRegistrationsRead.js"

export async function twoFactorWebAuthnChallengeCreate(
  database: DatabaseConnection,
  user: IdentityUser,
  clock: Clock,
  identifier: Identifier,
  kind: TwoFactorWebAuthnState["kind"],
  publicOrigin: string,
  rpName: string,
): Promise<Result<Record<string, unknown>>> {
  const op = "twoFactorWebAuthnChallengeCreate"
  const originResult = twoFactorWebAuthnOriginResolve(publicOrigin)
  if (!originResult.success) return resultErrorCreate(op, originResult.errorMessage)
  const origin = new URL(originResult.data)
  const randomResult = secureRandomBytes(32)
  if (!randomResult.success) return randomResult
  const challenge = base64UrlEncode(randomResult.data)
  const existingResult = twoFactorRecordFindByUserAndType(database, user.uuid, twoFactorProviderType.webauthn)
  if (!existingResult.success) return existingResult
  const registrationsResult =
    existingResult.data === null ? resultCreate([]) : twoFactorWebAuthnRegistrationsRead(existingResult.data.data)
  if (!registrationsResult.success) return registrationsResult
  const registrations = registrationsResult.data
  if (kind === "login" && registrations.length === 0) return resultErrorCreate(op, "No Webauthn devices registered")
  const credentialIds = registrations.map((registration) => registration.credentialId)
  const state: TwoFactorWebAuthnState = {
    challenge,
    credentialIds,
    expiresAt: Math.floor(clock.now().getTime() / 1_000) + 60,
    kind,
    origin: originResult.data,
    rpId: origin.hostname,
    userUuid: user.uuid,
  }
  if (kind === "login") {
    state.credentials = registrations.map(
      (registration) => registration.credential ?? { id: registration.credentialId },
    )
    state.appId = `${originResult.data}/app-id.json`
  }
  const recordType =
    kind === "registration"
      ? twoFactorProviderType.webauthnRegisterChallenge
      : twoFactorProviderType.webauthnLoginChallenge
  const oppositeRecordType =
    kind === "registration"
      ? twoFactorProviderType.webauthnLoginChallenge
      : twoFactorProviderType.webauthnRegisterChallenge
  const record = {
    uuid: identifier.uuid(),
    userUuid: user.uuid,
    type: recordType,
    enabled: true,
    data: JSON.stringify(state),
    lastUsed: 0,
  }
  const saveResult = databaseTransaction(database, () => {
    for (const type of [recordType, oppositeRecordType]) {
      const existingChallengeResult = twoFactorRecordFindByUserAndType(database, user.uuid, type)
      if (!existingChallengeResult.success) return existingChallengeResult
      if (existingChallengeResult.data !== null) {
        const deleteResult = twoFactorRecordDelete(database, existingChallengeResult.data.uuid)
        if (!deleteResult.success) return deleteResult
      }
    }
    return twoFactorRecordSave(database, record)
  })
  if (!saveResult.success) return saveResult
  if (kind === "registration") {
    return resultCreate({
      challenge,
      timeout: 60_000,
      rp: { id: origin.hostname, name: rpName },
      user: { id: twoFactorWebAuthnUserIdEncode(user.uuid), name: user.email, displayName: user.name },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },
        { alg: -257, type: "public-key" },
      ],
      excludeCredentials: credentialIds.map((id) => ({ id, type: "public-key" })),
      authenticatorSelection: {
        requireResidentKey: false,
        residentKey: "discouraged",
        userVerification: "discouraged",
      },
      attestation: "none",
      status: "ok",
      errorMessage: "",
    })
  }
  return resultCreate({
    challenge,
    rpId: origin.hostname,
    allowCredentials: credentialIds.map((id) => ({ id, type: "public-key" })),
    extensions: { appid: state.appId },
    userVerification: "discouraged",
  })
}

function twoFactorWebAuthnUserIdEncode(uuid: string): string {
  const hexadecimal = uuid.replaceAll("-", "")
  if (/^[0-9a-f]{32}$/iu.test(hexadecimal)) {
    const bytes = Uint8Array.from(
      {
        length: 16,
      },
      (_, index) => Number.parseInt(hexadecimal.slice(index * 2, index * 2 + 2), 16),
    )
    return base64UrlEncode(bytes)
  }
  return base64UrlEncode(new TextEncoder().encode(uuid))
}
