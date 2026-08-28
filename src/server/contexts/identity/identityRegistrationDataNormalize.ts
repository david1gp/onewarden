import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { IdentityKdf } from "./identityKdfSchema.js"
import type { IdentityRegistrationData } from "./identityRegistrationDataSchema.js"
import type { IdentityRegistrationNormalizedData } from "./identityRegistrationNormalizedData.js"

function identityKdfNormalize(
  data: IdentityKdf | IdentityRegistrationData,
): IdentityRegistrationNormalizedData["currentUnlockKdf"] {
  const kdf = "kdf" in data ? data.kdf : undefined
  const kdfType = "kdfType" in data ? data.kdfType : undefined
  const iterations = "kdfIterations" in data ? data.kdfIterations : undefined
  const legacyIterations = "iterations" in data ? data.iterations : undefined
  const memory = "kdfMemory" in data ? data.kdfMemory : undefined
  const legacyMemory = "memory" in data ? data.memory : undefined
  const parallelism = "kdfParallelism" in data ? data.kdfParallelism : undefined
  const legacyParallelism = "parallelism" in data ? data.parallelism : undefined

  if (kdf === undefined && kdfType === undefined) return null
  if (iterations === undefined && legacyIterations === undefined) return null
  return {
    kdf: kdf ?? kdfType ?? 0,
    kdfIterations: iterations ?? legacyIterations ?? 0,
    kdfMemory: memory === undefined ? (legacyMemory ?? null) : memory,
    kdfParallelism: parallelism === undefined ? (legacyParallelism ?? null) : parallelism,
  }
}

function identityCurrentKdfNormalize(data: IdentityKdf): IdentityRegistrationNormalizedData["currentUnlockKdf"] {
  return identityKdfNormalize(data)
}

export function identityRegistrationDataNormalize(
  data: IdentityRegistrationData,
): Result<IdentityRegistrationNormalizedData> {
  const op = "identityRegistrationDataNormalize"
  const currentAuthentication = data.masterPasswordAuthentication
  const currentUnlock = data.masterPasswordUnlock
  const legacyKdf = identityKdfNormalize(data)
  const legacyKey = data.key ?? data.userSymmetricKey ?? null
  const legacyHash = data.masterPasswordHash ?? data.master_password_hash ?? null
  if (legacyKdf !== null && legacyKey !== null && legacyHash !== null) {
    return resultCreate({
      email: data.email,
      passwordHash: legacyHash,
      key: legacyKey,
      kdf: legacyKdf.kdf,
      kdfIterations: legacyKdf.kdfIterations,
      kdfMemory: legacyKdf.kdfMemory,
      kdfParallelism: legacyKdf.kdfParallelism,
      passwordHint: data.masterPasswordHint ?? null,
      name: data.name ?? null,
      organizationUserId: data.organizationUserId ?? null,
      emailVerificationToken: data.emailVerificationToken ?? null,
      acceptEmergencyAccessId: data.acceptEmergencyAccessId ?? null,
      acceptEmergencyAccessInviteToken: data.acceptEmergencyAccessInviteToken ?? null,
      orgInviteToken: data.orgInviteToken ?? data.token ?? null,
      keys: data.keys ?? data.userAsymmetricKeys ?? null,
      currentFormat: false,
      currentAuthenticationSalt: null,
      currentUnlockSalt: null,
      currentUnlockKdf: null,
    })
  }
  const currentFormat = currentAuthentication !== undefined && currentAuthentication !== null
  if (currentFormat) {
    if (currentUnlock === undefined || currentUnlock === null)
      return resultErrorCreate(op, "Unexpected RegisterData format", {
        code: "identity.unprocessable",
        statusCode: 422,
      })
    const authenticationKdf = identityCurrentKdfNormalize(currentAuthentication.kdf)
    const unlockKdf = identityCurrentKdfNormalize(currentUnlock.kdf)
    const authenticationHash =
      currentAuthentication.hash ?? currentAuthentication.masterPasswordAuthenticationHash ?? null
    const unlockKey = currentUnlock.key ?? currentUnlock.masterKeyWrappedUserKey ?? null
    if (
      authenticationKdf === null ||
      unlockKdf === null ||
      authenticationHash === null ||
      unlockKey === null ||
      currentAuthentication.salt === undefined ||
      currentUnlock.salt === undefined
    ) {
      return resultErrorCreate(op, "Unexpected RegisterData format", {
        code: "identity.unprocessable",
        statusCode: 422,
      })
    }
    return resultCreate({
      email: data.email,
      passwordHash: authenticationHash,
      key: unlockKey,
      kdf: authenticationKdf.kdf,
      kdfIterations: authenticationKdf.kdfIterations,
      kdfMemory: authenticationKdf.kdfMemory,
      kdfParallelism: authenticationKdf.kdfParallelism,
      passwordHint: data.masterPasswordHint ?? null,
      name: data.name ?? null,
      organizationUserId: data.organizationUserId ?? null,
      emailVerificationToken: data.emailVerificationToken ?? null,
      acceptEmergencyAccessId: data.acceptEmergencyAccessId ?? null,
      acceptEmergencyAccessInviteToken: data.acceptEmergencyAccessInviteToken ?? null,
      orgInviteToken: data.orgInviteToken ?? data.token ?? null,
      keys: data.keys ?? data.userAsymmetricKeys ?? null,
      currentFormat: true,
      currentAuthenticationSalt: currentAuthentication.salt,
      currentUnlockSalt: currentUnlock.salt,
      currentUnlockKdf: unlockKdf,
    })
  }

  return resultErrorCreate(op, "Unexpected RegisterData format", { code: "identity.unprocessable", statusCode: 422 })
}
