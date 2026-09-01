import * as v from "valibot"
import { type Result } from "#result"
import type { BitwardenEncryptedLoginCipherCreateRequest } from "../../shared/api/bitwardenEncryptedLoginCipherCreateRequestSchema.js"
import {
  type BitwardenEncryptedCipher,
  bitwardenEncryptedCipherSchema,
} from "../../shared/api/bitwardenEncryptedCipherSchema.js"
import type { BitwardenEncryptedLoginCipher } from "../../shared/api/bitwardenEncryptedLoginCipherSchema.js"
import type { BitwardenPasswordTokenResponse } from "../../shared/api/bitwardenPasswordTokenResponseSchema.js"
import type { BitwardenPreloginResponse } from "../../shared/api/bitwardenPreloginResponseSchema.js"
import type { BitwardenRefreshTokenResponse } from "../../shared/api/bitwardenRefreshTokenResponseSchema.js"
import type { BitwardenSyncEnvelope } from "../../shared/api/bitwardenSyncEnvelopeSchema.js"
import { base64Encode } from "../../shared/crypto/base64Encode.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import type { SessionHandoffOperation } from "../../shared/sessionHandoff/sessionHandoffOperationSchema.js"
import type { extensionBitwardenApiClientCreate } from "../api/extensionBitwardenApiClientCreate.js"
import { extensionMasterKeyDerive } from "../crypto/extensionMasterKeyDerive.js"
import { extensionMasterPasswordHashDerive } from "../crypto/extensionMasterPasswordHashDerive.js"
import { type ExtensionCipher, extensionCipherSchema } from "../crypto/extensionCipherSchema.js"
import type { ExtensionPersonalLoginCipher } from "../crypto/extensionPersonalLoginCipherSchema.js"
import { extensionProfileSchema } from "../crypto/extensionProfileSchema.js"
import { extensionEmailSchema } from "../extensionEmailSchema.js"
import { extensionPasswordSchema } from "../extensionPasswordSchema.js"
import { extensionSessionHandoffCreate } from "../handoff/extensionSessionHandoffCreate.js"
import { extensionPasskeyAssertionCreate } from "../passkey/extensionPasskeyAssertionCreate.js"
import type { ExtensionPasskeyAssertionRequest } from "../passkey/extensionPasskeyAssertionRequestSchema.js"
import { extensionPasskeyAssertionRequestSchema } from "../passkey/extensionPasskeyAssertionRequestSchema.js"
import type { ExtensionPasskeyConsentContext } from "../passkey/extensionPasskeyConsentContextSchema.js"
import type { ExtensionPasskeyConsent } from "../passkey/extensionPasskeyConsentSchema.js"
import { extensionPasskeyCredentialCreate } from "../passkey/extensionPasskeyCredentialCreate.js"
import type { ExtensionPasskeyCredentialCreateRequest } from "../passkey/extensionPasskeyCredentialCreateRequestSchema.js"
import { extensionPasskeyCredentialCreateRequestSchema } from "../passkey/extensionPasskeyCredentialCreateRequestSchema.js"
import { extensionPasskeyCredentialIdCreate } from "../passkey/extensionPasskeyCredentialIdCreate.js"
import { extensionPasskeyCredentialIdDecode } from "../passkey/extensionPasskeyCredentialIdDecode.js"
import { extensionPasskeyRpIdNormalize } from "../passkey/extensionPasskeyRpIdNormalize.js"
import { extensionVaultSessionCreate } from "../session/extensionVaultSessionCreate.js"
import type { ExtensionAuthSession } from "../storage/extensionAuthSessionStorageSchema.js"
import type { ExtensionLockPolicy } from "../storage/extensionLockPolicySchema.js"
import { extensionStorageCreate } from "../storage/extensionStorageCreate.js"
import type { ExtensionSyncStorage } from "../storage/extensionSyncStorageSchema.js"
import type { ExtensionAlarmsAdapter } from "./extensionAlarmsAdapter.js"
import { extensionSyncCacheSnapshotSchema } from "./extensionSyncCacheSnapshotSchema.js"
import { type ExtensionSyncSnapshot, extensionSyncSnapshotSchema } from "./extensionSyncSnapshotSchema.js"
import { extensionTimeoutAlarmName } from "./extensionTimeoutAlarmName.js"

type ExtensionApiClient = Pick<
  ReturnType<typeof extensionBitwardenApiClientCreate>,
  "prelogin" | "passwordToken" | "refreshToken" | "revisionDate" | "sync"
> &
  Partial<
    Pick<ReturnType<typeof extensionBitwardenApiClientCreate>, "cipherCreate" | "cipherUpdate" | "sessionHandoffCreate">
  >
type ExtensionStorage = ReturnType<typeof extensionStorageCreate>
type ExtensionVaultSession = ReturnType<typeof extensionVaultSessionCreate>

type ExtensionBackgroundServiceOptions = {
  apiClient: ExtensionApiClient
  storage: ExtensionStorage
  vaultSession: ExtensionVaultSession
  alarms: ExtensionAlarmsAdapter
  now?: () => number
}

type PasswordLoginRequest = {
  email: string
  password: string
  clientId: string
  scope: string
  deviceIdentifier: string
  deviceName: string
  deviceType: string
}

type AuthenticatedPassword = {
  prelogin: BitwardenPreloginResponse
  token: BitwardenPasswordTokenResponse
  authSession: ExtensionAuthSession
}

type AuthTokenResponse = BitwardenPasswordTokenResponse | BitwardenRefreshTokenResponse

type ExtensionSyncResult = {
  status: "synced" | "unchanged"
  changed: boolean
  revisionDate: number
  lastSyncedAt: number
  snapshot: ExtensionSyncSnapshot
}

const passwordLoginRequestSchema = v.object({
  email: extensionEmailSchema,
  password: extensionPasswordSchema,
  clientId: v.optional(v.pipe(v.string(), v.minLength(1)), "browser"),
  scope: v.optional(v.pipe(v.string(), v.minLength(1)), "api offline_access"),
  deviceIdentifier: v.optional(v.pipe(v.string(), v.minLength(1)), "onewarden-extension"),
  deviceName: v.optional(v.pipe(v.string(), v.minLength(1)), "OneWarden"),
  deviceType: v.optional(v.pipe(v.string(), v.minLength(1)), "14"),
})

const unlockRequestSchema = v.object({
  email: v.optional(extensionEmailSchema),
  password: extensionPasswordSchema,
})

const syncRequestSchema = v.object({
  force: v.optional(v.boolean(), false),
})

function invalidRequest<T>(op: string, message: string, errorData?: string): Result<T> {
  return resultErrorCreate(op, message, {
    code: "platform.invalid-request",
    statusCode: 400,
    errorData,
  })
}

function unauthorized<T>(op: string): Result<T> {
  return resultErrorCreate(op, "Authentication is required.", {
    code: "platform.unauthorized",
    statusCode: 401,
  })
}

function internal<T>(op: string, message: string): Result<T> {
  return resultErrorCreate(op, message, { code: "platform.internal", statusCode: 500 })
}

function timestampValid(timestamp: number): boolean {
  return Number.isSafeInteger(timestamp) && timestamp >= 0
}

function authSessionCreate(
  token: AuthTokenResponse,
  email: string | null,
  previous: ExtensionAuthSession | null,
  now: () => number,
): Result<ExtensionAuthSession> {
  const op = "extensionBackgroundService.authSessionCreate"
  if (!Number.isFinite(token.expires_in) || !Number.isSafeInteger(token.expires_in) || token.expires_in < 0) {
    return invalidRequest(op, "Token expiration is invalid.")
  }
  const expiresAt = now() + token.expires_in * 1_000
  if (!timestampValid(expiresAt)) return invalidRequest(op, "Token expiration is invalid.")
  return resultCreate({
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt,
    tokenType: token.token_type,
    scope: token.scope,
    accountId: previous?.accountId ?? null,
    email,
  })
}

function jsonEncode<T>(op: string, value: T, errorMessage = "Sync data could not be encoded."): Result<string> {
  try {
    return resultCreate(JSON.stringify(value))
  } catch {
    return internal(op, errorMessage)
  }
}

function jsonDecode(op: string, text: string): Result<unknown> {
  try {
    return resultCreate(JSON.parse(text))
  } catch {
    return internal(op, "Stored sync data is not valid JSON.")
  }
}

function textDecode(op: string, bytes: Uint8Array): Result<unknown> {
  try {
    return jsonDecode(op, new TextDecoder("utf-8", { fatal: true }).decode(bytes))
  } catch {
    return internal(op, "Stored sync data is not valid UTF-8.")
  }
}

function passkeyCredentialIdMatches(left: string, right: string): boolean {
  const leftResult = extensionPasskeyCredentialIdDecode(left)
  const rightResult = extensionPasskeyCredentialIdDecode(right)
  if (!leftResult.success || !rightResult.success || leftResult.data.byteLength !== rightResult.data.byteLength)
    return false
  return leftResult.data.every((byte, index) => byte === rightResult.data[index])
}

function passkeyRpIdMatches(left: string, right: string): boolean {
  const leftResult = extensionPasskeyRpIdNormalize(left)
  const rightResult = extensionPasskeyRpIdNormalize(right)
  return leftResult.success && rightResult.success && leftResult.data === rightResult.data
}

function passkeyCipherRequestCreate(cipher: BitwardenEncryptedLoginCipher): BitwardenEncryptedLoginCipherCreateRequest {
  return {
    id: cipher.id,
    ...(cipher.folderId === undefined ? {} : { folderId: cipher.folderId }),
    ...(cipher.organizationId === undefined ? {} : { organizationId: cipher.organizationId }),
    ...(cipher.key === undefined ? {} : { key: cipher.key }),
    type: cipher.type,
    name: cipher.name,
    notes: cipher.notes,
    fields: cipher.fields,
    login: cipher.login,
    ...(cipher.favorite === undefined ? {} : { favorite: cipher.favorite }),
    lastKnownRevisionDate: cipher.revisionDate,
  }
}

function passkeyCipherWriteAllowed(cipher: ExtensionPersonalLoginCipher): Result<void> {
  if (cipher.edit === false)
    return resultErrorCreate("extensionBackgroundService.passkey", "The selected login is read-only.", {
      code: "platform.forbidden",
      statusCode: 403,
    })
  return resultCreate(undefined)
}

function syncCipherWireCreate(
  cipher: BitwardenSyncEnvelope["ciphers"][number],
  revisionDate: number,
): BitwardenEncryptedCipher | null {
  const revision =
    typeof cipher.revisionDate === "string" && cipher.revisionDate.length > 0
      ? cipher.revisionDate
      : String(revisionDate)
  const parsed = v.safeParse(bitwardenEncryptedCipherSchema, {
    ...cipher,
    object: "cipherDetails",
    id: cipher.id,
    revisionDate: revision,
    deletedDate: cipher.deletedDate ?? null,
    organizationId: cipher.organizationId ?? null,
    folderId: cipher.folderId ?? null,
    name: cipher.name,
    notes: cipher.notes ?? null,
    ...(cipher.key === undefined ? {} : { key: cipher.key }),
    ...(cipher.collectionIds === undefined ? {} : { collectionIds: cipher.collectionIds }),
    ...(cipher.fields === undefined || cipher.fields === null ? { fields: [] } : { fields: cipher.fields }),
    ...(cipher.type === 1 && (cipher.login === undefined || cipher.login === null) ? { login: null } : {}),
  })
  return parsed.success ? parsed.output : null
}

function syncCipherPlainRead(cipher: BitwardenEncryptedCipher): ExtensionCipher | null {
  if (!/^2\.[^|]+\|[^|]+\|[^|]+$/u.test(cipher.name)) {
    const parsed = v.safeParse(extensionCipherSchema, cipher)
    if (parsed.success) return parsed.output
  }
  return null
}

function extensionLoginCiphersRead(ciphers: readonly ExtensionCipher[]): ExtensionPersonalLoginCipher[] {
  return ciphers.filter((cipher): cipher is ExtensionPersonalLoginCipher => cipher.type === 1)
}

export function extensionBackgroundServiceCreate(options: ExtensionBackgroundServiceOptions) {
  const now = options.now ?? Date.now
  let operationChain: Promise<void> = Promise.resolve()
  let refreshInFlight: Promise<Result<ExtensionAuthSession>> | null = null

  const operationRun = <T>(operation: () => Promise<Result<T>>): Promise<Result<T>> => {
    const result = operationChain.then(operation, operation)
    operationChain = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  const alarmCreate = async (delayInMinutes: number): Promise<Result<void>> => {
    try {
      await options.alarms.create(extensionTimeoutAlarmName, { delayInMinutes })
    } catch {
      return resultErrorCreate("extensionBackgroundService.alarmCreate", "Timeout alarm could not be scheduled.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
    return resultCreate(undefined)
  }

  const alarmClear = async (): Promise<Result<void>> => {
    try {
      await options.alarms.clear(extensionTimeoutAlarmName)
    } catch {
      return resultErrorCreate("extensionBackgroundService.alarmClear", "Timeout alarm could not be cleared.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
    return resultCreate(undefined)
  }

  const authSessionInvalidate = async (refreshToken: string): Promise<Result<void>> => {
    const authResult = await options.storage.authSessionLoad()
    if (!authResult.success) return authResult
    if (authResult.data === null || authResult.data.refreshToken !== refreshToken) return resultCreate(undefined)
    const logoutResult = await options.vaultSession.logout()
    if (!logoutResult.success) return logoutResult
    return alarmClear()
  }

  const refreshTokenPersist = async (force: boolean): Promise<Result<ExtensionAuthSession>> => {
    const op = "extensionBackgroundService.refreshToken"
    const authResult = await options.storage.authSessionLoad()
    if (!authResult.success) return authResult
    const authSession = authResult.data
    if (authSession === null) return unauthorized(op)
    if (!force && authSession.expiresAt > now()) return resultCreate(authSession)

    const refreshResult = await options.apiClient.refreshToken({
      grant_type: "refresh_token",
      refresh_token: authSession.refreshToken,
    })
    if (!refreshResult.success) {
      if (refreshResult.statusCode === 401) {
        const invalidateResult = await authSessionInvalidate(authSession.refreshToken)
        if (!invalidateResult.success) return invalidateResult
      }
      return refreshResult
    }
    const currentAuthResult = await options.storage.authSessionLoad()
    if (!currentAuthResult.success) return currentAuthResult
    if (currentAuthResult.data === null) return unauthorized(op)
    if (currentAuthResult.data.refreshToken !== authSession.refreshToken) return resultCreate(currentAuthResult.data)
    const nextAuthResult = authSessionCreate(refreshResult.data, authSession.email, authSession, now)
    if (!nextAuthResult.success) return nextAuthResult
    const saveResult = await options.storage.authSessionSave(nextAuthResult.data)
    if (!saveResult.success) return saveResult
    return nextAuthResult
  }

  const refreshTokenCoordinated = (force: boolean): Promise<Result<ExtensionAuthSession>> => {
    if (refreshInFlight !== null) return refreshInFlight
    const refreshPromise = refreshTokenPersist(force)
    refreshInFlight = refreshPromise
    void refreshPromise.then(
      () => {
        if (refreshInFlight === refreshPromise) refreshInFlight = null
      },
      () => {
        if (refreshInFlight === refreshPromise) refreshInFlight = null
      },
    )
    return refreshPromise
  }

  const protectedRequest = async <T>(request: (accessToken: string) => Promise<Result<T>>): Promise<Result<T>> => {
    const authResult = await options.storage.authSessionLoad()
    if (!authResult.success) return authResult
    if (authResult.data === null) return unauthorized("extensionBackgroundService.protectedRequest")

    let currentAuth = authResult.data
    if (currentAuth.expiresAt <= now()) {
      const refreshResult = await refreshTokenCoordinated(false)
      if (!refreshResult.success) return refreshResult
      currentAuth = refreshResult.data
    }

    const requestResult = await request(currentAuth.accessToken)
    if (requestResult.success || requestResult.statusCode !== 401) return requestResult
    const refreshResult = await refreshTokenCoordinated(true)
    if (!refreshResult.success) return refreshResult
    return request(refreshResult.data.accessToken)
  }

  const passwordAuthenticate = async (request: PasswordLoginRequest): Promise<Result<AuthenticatedPassword>> => {
    const preloginResult = await options.apiClient.prelogin({ email: request.email })
    if (!preloginResult.success) return preloginResult

    const masterKeyResult = await extensionMasterKeyDerive(
      request.password,
      request.email,
      preloginResult.data.kdfSettings,
    )
    if (!masterKeyResult.success) return masterKeyResult
    const passwordHashResult = await extensionMasterPasswordHashDerive(request.password, masterKeyResult.data)
    masterKeyResult.data.fill(0)
    if (!passwordHashResult.success) return passwordHashResult
    const encodedPasswordHash = base64Encode(passwordHashResult.data)
    passwordHashResult.data.fill(0)

    const tokenResult = await options.apiClient.passwordToken({
      grant_type: "password",
      client_id: request.clientId,
      password: encodedPasswordHash,
      scope: request.scope,
      username: request.email,
      device_identifier: request.deviceIdentifier,
      device_name: request.deviceName,
      device_type: request.deviceType,
    })
    if (!tokenResult.success) return tokenResult
    const previousAuthResult = await options.storage.authSessionLoad()
    if (!previousAuthResult.success) return previousAuthResult
    const authSessionResult = authSessionCreate(tokenResult.data, request.email, previousAuthResult.data, now)
    if (!authSessionResult.success) return authSessionResult
    return resultCreate({ prelogin: preloginResult.data, token: tokenResult.data, authSession: authSessionResult.data })
  }

  const timeoutAction = async (policy: ExtensionLockPolicy): Promise<Result<void>> => {
    const actionResult =
      policy.action === "logout" ? await options.vaultSession.logout() : await options.vaultSession.lock()
    if (!actionResult.success) return actionResult
    return alarmClear()
  }

  const timeoutReconcile = async (): Promise<Result<void>> => {
    const policyResult = await options.storage.lockPolicyLoad()
    if (!policyResult.success) return policyResult
    const stateResult = await options.storage.sessionStateLoad()
    if (!stateResult.success) return stateResult
    const state = stateResult.data
    const policy = policyResult.data
    if (state === null || policy === null || policy.timeoutMinutes === null) {
      if (state !== null && !options.vaultSession.isUnlocked()) {
        const clearStateResult = await options.storage.sessionStateClear()
        if (!clearStateResult.success) return clearStateResult
      }
      return alarmClear()
    }

    const currentTime = now()
    if (!timestampValid(currentTime))
      return internal("extensionBackgroundService.timeoutReconcile", "Current time is invalid.")
    const deadline = state.unlockedAt + policy.timeoutMinutes * 60_000
    if (!timestampValid(deadline))
      return internal("extensionBackgroundService.timeoutReconcile", "Timeout deadline is invalid.")
    if (currentTime >= deadline) return timeoutAction(policy)
    if (!options.vaultSession.isUnlocked() && policy.action === "lock") {
      const clearStateResult = await options.storage.sessionStateClear()
      if (!clearStateResult.success) return clearStateResult
      return alarmClear()
    }
    return alarmCreate(Math.max((deadline - currentTime) / 60_000, 0.01))
  }

  const browserRestartReconcile = async (): Promise<Result<void>> => {
    const policyResult = await options.storage.lockPolicyLoad()
    if (!policyResult.success) return policyResult
    const stateResult = await options.storage.sessionStateLoad()
    if (!stateResult.success) return stateResult
    if (stateResult.data === null || options.vaultSession.isUnlocked()) return timeoutReconcile()

    const policy = policyResult.data
    if (policy === null) {
      const clearStateResult = await options.storage.sessionStateClear()
      if (!clearStateResult.success) return clearStateResult
      return alarmClear()
    }

    return timeoutAction(policy)
  }

  const syncCacheRead = async (cache: ExtensionSyncStorage): Promise<Result<ExtensionSyncSnapshot>> => {
    const op = "extensionBackgroundService.syncCacheRead"
    if (cache.snapshot === null) return internal(op, "Stored sync cache has no snapshot.")
    const snapshotBytesResult = await options.vaultSession.encryptedPayloadDecrypt(cache.snapshot)
    if (!snapshotBytesResult.success) return snapshotBytesResult
    const snapshotValueResult = textDecode(op, snapshotBytesResult.data)
    if (!snapshotValueResult.success) return snapshotValueResult
    const snapshotParsed = v.safeParse(extensionSyncCacheSnapshotSchema, snapshotValueResult.data)
    if (!snapshotParsed.success) return internal(op, "Stored sync snapshot is invalid.")

    const ciphers: ExtensionCipher[] = []
    for (const encryptedCipher of cache.ciphers) {
      const cipherBytesResult = await options.vaultSession.encryptedPayloadDecrypt(encryptedCipher.payload)
      if (!cipherBytesResult.success) return cipherBytesResult
      const cipherValueResult = textDecode(op, cipherBytesResult.data)
      if (!cipherValueResult.success) return cipherValueResult
      const cipherParsed = v.safeParse(extensionCipherSchema, cipherValueResult.data)
      if (!cipherParsed.success || cipherParsed.output.id !== encryptedCipher.id) {
        return internal(op, "Stored sync cipher is invalid.")
      }
      ciphers.push(cipherParsed.output)
    }
    return resultCreate({ ...snapshotParsed.output, ciphers })
  }

  const syncSnapshotCreate = async (
    envelope: BitwardenSyncEnvelope,
    revisionDate: number,
  ): Promise<Result<ExtensionSyncSnapshot>> => {
    const ciphers: ExtensionCipher[] = []
    const profileParsed = v.safeParse(extensionProfileSchema, envelope.profile)
    if (!profileParsed.success)
      return internal("extensionBackgroundService.syncSnapshotCreate", "Sync profile is invalid.")
    const organizationKeysResult = await options.vaultSession.organizationKeysReplace(profileParsed.output)
    if (!organizationKeysResult.success) return organizationKeysResult
    const foldersResult = await options.vaultSession.foldersDecrypt(envelope.folders)
    if (!foldersResult.success) return foldersResult
    const collectionsResult = await options.vaultSession.collectionsDecrypt(envelope.collections)
    if (!collectionsResult.success) return collectionsResult
    const authorizedOrganizationIds = new Set(
      profileParsed.output.organizations
        .filter((organization) => organization.status === 2)
        .map((organization) => organization.id),
    )
    for (const cipher of envelope.ciphers) {
      const wireCipher = syncCipherWireCreate(cipher, revisionDate)
      if (wireCipher === null) continue
      const organizationId = wireCipher.organizationId ?? null
      if (organizationId !== null && !authorizedOrganizationIds.has(organizationId)) continue
      const plainCipher = syncCipherPlainRead(wireCipher)
      if (plainCipher !== null) {
        ciphers.push(plainCipher)
        continue
      }
      const decryptedResult = await options.vaultSession.cipherDecrypt(wireCipher)
      if (!decryptedResult.success) return decryptedResult
      ciphers.push(decryptedResult.data)
    }
    const snapshot = { ...envelope, folders: foldersResult.data, collections: collectionsResult.data, ciphers }
    const parsed = v.safeParse(extensionSyncSnapshotSchema, snapshot)
    if (!parsed.success) return internal("extensionBackgroundService.syncSnapshotCreate", "Sync snapshot is invalid.")
    return resultCreate(parsed.output)
  }

  const syncCachePersist = async (
    snapshot: ExtensionSyncSnapshot,
    revisionDate: number,
  ): Promise<Result<ExtensionSyncStorage>> => {
    const { ciphers, ...snapshotData } = snapshot
    const snapshotTextResult = jsonEncode("extensionBackgroundService.syncCachePersist", snapshotData)
    if (!snapshotTextResult.success) return snapshotTextResult
    const snapshotPayloadResult = await options.vaultSession.encryptedPayloadEncrypt(snapshotTextResult.data)
    if (!snapshotPayloadResult.success) return snapshotPayloadResult
    const encryptedCiphers: ExtensionSyncStorage["ciphers"] = []
    for (const cipher of ciphers) {
      const cipherTextResult = jsonEncode("extensionBackgroundService.syncCachePersist", cipher)
      if (!cipherTextResult.success) return cipherTextResult
      const payloadResult = await options.vaultSession.encryptedPayloadEncrypt(cipherTextResult.data)
      if (!payloadResult.success) return payloadResult
      encryptedCiphers.push({
        id: cipher.id,
        revisionDate: cipher.revisionDate,
        type: cipher.type,
        payload: payloadResult.data,
      })
    }
    const lastSyncedAt = now()
    if (!timestampValid(lastSyncedAt))
      return internal("extensionBackgroundService.syncCachePersist", "Sync timestamp is invalid.")
    return resultCreate({
      snapshot: snapshotPayloadResult.data,
      ciphers: encryptedCiphers,
      lastRevisionDate: revisionDate,
      lastSyncedAt,
    })
  }

  const syncRun = async (force: boolean): Promise<Result<ExtensionSyncResult>> => {
    const op = "extensionBackgroundService.sync"
    if (!options.vaultSession.isUnlocked()) {
      return resultErrorCreate(op, "Vault is locked.", { code: "platform.unauthorized", statusCode: 401 })
    }
    const cacheResult = await options.storage.syncCacheLoad()
    if (!cacheResult.success) return cacheResult
    const revisionResult = await protectedRequest((accessToken) => options.apiClient.revisionDate({ accessToken }))
    if (!revisionResult.success) return revisionResult
    if (!timestampValid(revisionResult.data)) return internal(op, "Server revision date is invalid.")

    if (!force && cacheResult.data?.lastRevisionDate === revisionResult.data && cacheResult.data.snapshot !== null) {
      const snapshotResult = await syncCacheRead(cacheResult.data)
      if (!snapshotResult.success) return snapshotResult
      return resultCreate({
        status: "unchanged",
        changed: false,
        revisionDate: revisionResult.data,
        lastSyncedAt: cacheResult.data.lastSyncedAt ?? now(),
        snapshot: snapshotResult.data,
      })
    }

    const envelopeResult = await protectedRequest((accessToken) => options.apiClient.sync({ accessToken }))
    if (!envelopeResult.success) return envelopeResult
    const snapshotResult = await syncSnapshotCreate(envelopeResult.data, revisionResult.data)
    if (!snapshotResult.success) return snapshotResult
    const cacheToSaveResult = await syncCachePersist(snapshotResult.data, revisionResult.data)
    if (!cacheToSaveResult.success) return cacheToSaveResult
    const saveResult = await options.storage.syncCacheSave(cacheToSaveResult.data)
    if (!saveResult.success) return saveResult
    return resultCreate({
      status: "synced",
      changed: true,
      revisionDate: revisionResult.data,
      lastSyncedAt: cacheToSaveResult.data.lastSyncedAt ?? now(),
      snapshot: snapshotResult.data,
    })
  }

  const syncSnapshotLoad = (): Promise<Result<ExtensionSyncSnapshot | null>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.syncSnapshotLoad"
      if (!options.vaultSession.isUnlocked()) {
        return resultErrorCreate(op, "Vault is locked.", { code: "platform.unauthorized", statusCode: 401 })
      }
      const cacheResult = await options.storage.syncCacheLoad()
      if (!cacheResult.success) return cacheResult
      if (cacheResult.data === null) return resultCreate(null)
      return syncCacheRead(cacheResult.data)
    })

  const activityRun = async (): Promise<Result<void>> => {
    const op = "extensionBackgroundService.activity"
    if (!options.vaultSession.isUnlocked()) {
      return resultErrorCreate(op, "Vault is locked.", { code: "platform.unauthorized", statusCode: 401 })
    }
    const stateResult = await options.storage.sessionStateLoad()
    if (!stateResult.success) return stateResult
    if (stateResult.data === null) return internal(op, "Unlocked vault state is missing.")
    const saveResult = await options.storage.sessionStateSave({ status: "unlocked", unlockedAt: now() })
    if (!saveResult.success) return saveResult
    return timeoutReconcile()
  }

  const passwordLogin = (request: unknown): Promise<Result<ExtensionAuthSession>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.passwordLogin"
      const parsed = v.safeParse(passwordLoginRequestSchema, request)
      if (!parsed.success) return invalidRequest(op, "Password login request is invalid.", v.summarize(parsed.issues))
      if (refreshInFlight !== null) await refreshInFlight
      const lockResult = await options.vaultSession.lock()
      if (!lockResult.success) return lockResult
      const clearAlarmResult = await alarmClear()
      if (!clearAlarmResult.success) return clearAlarmResult
      const authResult = await passwordAuthenticate(parsed.output)
      if (!authResult.success) return authResult
      const saveResult = await options.storage.authSessionSave(authResult.data.authSession)
      if (!saveResult.success) return saveResult
      return resultCreate(authResult.data.authSession)
    })

  const refreshToken = (): Promise<Result<ExtensionAuthSession>> => refreshTokenCoordinated(true)

  const unlock = (request: unknown): Promise<Result<void>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.unlock"
      const parsed = v.safeParse(unlockRequestSchema, request)
      if (!parsed.success) return invalidRequest(op, "Vault unlock request is invalid.", v.summarize(parsed.issues))
      if (refreshInFlight !== null) await refreshInFlight
      const previousAuthResult = await options.storage.authSessionLoad()
      if (!previousAuthResult.success) return previousAuthResult
      let email = parsed.output.email
      if (email === undefined) {
        email = previousAuthResult.data?.email ?? undefined
      }
      if (email === undefined) return invalidRequest(op, "Account email is required.")
      const authResult = await passwordAuthenticate({
        email,
        password: parsed.output.password,
        clientId: "browser",
        scope: "api offline_access",
        deviceIdentifier: "onewarden-extension",
        deviceName: "OneWarden",
        deviceType: "14",
      })
      if (!authResult.success) return authResult
      const saveResult = await options.storage.authSessionSave(authResult.data.authSession)
      if (!saveResult.success) return saveResult
      const unlockResult = await options.vaultSession.unlock({
        email,
        password: parsed.output.password,
        prelogin: authResult.data.prelogin,
        token: authResult.data.token,
      })
      if (!unlockResult.success) {
        const rollbackResult =
          previousAuthResult.data === null
            ? await options.storage.authSessionClear()
            : await options.storage.authSessionSave(previousAuthResult.data)
        if (!rollbackResult.success) return rollbackResult
        return unlockResult
      }
      return timeoutReconcile()
    })

  const lock = (): Promise<Result<void>> =>
    operationRun(async () => {
      const lockResult = await options.vaultSession.lock()
      if (!lockResult.success) return lockResult
      return alarmClear()
    })

  const logout = (): Promise<Result<void>> =>
    operationRun(async () => {
      if (refreshInFlight !== null) await refreshInFlight
      const logoutResult = await options.vaultSession.logout()
      if (!logoutResult.success) return logoutResult
      return alarmClear()
    })

  const lockPolicySave = (policy: ExtensionLockPolicy): Promise<Result<void>> =>
    operationRun(async () => {
      const saveResult = await options.storage.lockPolicySave(policy)
      if (!saveResult.success) return saveResult
      return timeoutReconcile()
    })

  const lockPolicyLoad = (): Promise<Result<ExtensionLockPolicy | null>> =>
    operationRun(() => options.storage.lockPolicyLoad())

  const activity = (): Promise<Result<void>> => operationRun(activityRun)

  const sync = (request: unknown = {}): Promise<Result<ExtensionSyncResult>> => {
    const parsed = v.safeParse(syncRequestSchema, request)
    if (!parsed.success)
      return Promise.resolve(invalidRequest("extensionBackgroundService.sync", "Sync request is invalid."))
    return operationRun(() => syncRun(parsed.output.force))
  }

  const conditionalSync = (): Promise<Result<ExtensionSyncResult>> => operationRun(() => syncRun(false))
  const fullSync = (): Promise<Result<ExtensionSyncResult>> => operationRun(() => syncRun(true))
  const manualSync = (): Promise<Result<ExtensionSyncResult>> => fullSync()

  const passkeyConsentContexts = new Map<string, ExtensionPasskeyConsentContext>()

  const passkeyConsentContextCreate = (request: unknown): Result<ExtensionPasskeyConsentContext> => {
    const currentTime = now()
    for (const [requestId, context] of passkeyConsentContexts) {
      if (context.expiresAt <= currentTime) passkeyConsentContexts.delete(requestId)
    }
    const createParsed = v.safeParse(extensionPasskeyCredentialCreateRequestSchema, request)
    const assertionParsed = v.safeParse(extensionPasskeyAssertionRequestSchema, request)
    const createRequest: ExtensionPasskeyCredentialCreateRequest | null = createParsed.success
      ? createParsed.output
      : null
    const assertionRequest: ExtensionPasskeyAssertionRequest | null = assertionParsed.success
      ? assertionParsed.output
      : null
    if (createRequest === null && assertionRequest === null)
      return invalidRequest("extensionBackgroundService.passkeyConsentContextCreate", "Passkey request is invalid.")
    const operation = createRequest === null ? "get" : "create"
    const rpIdResult = extensionPasskeyRpIdNormalize(createRequest?.rpId ?? assertionRequest?.rpId ?? "")
    if (!rpIdResult.success) return rpIdResult
    const requestIdResult = extensionPasskeyCredentialIdCreate()
    if (!requestIdResult.success) return requestIdResult
    const expiresAt = currentTime + 60_000
    if (!timestampValid(expiresAt))
      return internal(
        "extensionBackgroundService.passkeyConsentContextCreate",
        "Passkey consent expiration is invalid.",
      )
    const context: ExtensionPasskeyConsentContext = {
      requestId: requestIdResult.data.id,
      operation,
      rpId: rpIdResult.data,
      rpName: createRequest?.rpName ?? null,
      userName: createRequest?.userName ?? null,
      userId: createRequest?.userId ?? assertionRequest?.userHandle ?? null,
      credentialId: assertionRequest?.credentialId ?? null,
      cipherId: createRequest?.cipherId ?? null,
      allowCredentialIds: assertionRequest?.allowCredentialIds ?? [],
      userVerification: createRequest?.userVerification ?? assertionRequest?.userVerification ?? "discouraged",
      clientDataJSON: createRequest?.clientDataJSON ?? assertionRequest?.clientDataJSON ?? "",
      expiresAt,
    }
    passkeyConsentContexts.set(context.requestId, context)
    return resultCreate(context)
  }

  const passkeyConsentAuthorize = (
    operation: "create" | "get",
    rpId: string,
    cipherId: string | null,
    credentialId: string | null,
    userId: string | null,
    userVerification: "required" | "preferred" | "discouraged",
    clientDataJSON: string,
    consent: ExtensionPasskeyConsent | undefined,
  ): Result<ExtensionPasskeyConsent> => {
    const op = `extensionBackgroundService.passkey${operation === "create" ? "CredentialCreate" : "Assertion"}`
    if (consent === undefined)
      return resultErrorCreate(op, "Explicit passkey consent is required.", {
        code: "platform.forbidden",
        statusCode: 403,
      })
    const context = passkeyConsentContexts.get(consent.requestId)
    if (context === undefined || context.expiresAt <= now()) {
      passkeyConsentContexts.delete(consent.requestId)
      return resultErrorCreate(op, "Passkey consent is expired or unknown.", {
        code: "platform.forbidden",
        statusCode: 403,
      })
    }
    passkeyConsentContexts.delete(consent.requestId)
    if (
      context.operation !== operation ||
      context.rpId !== rpId ||
      context.cipherId !== cipherId ||
      context.userId !== userId ||
      context.userVerification !== userVerification ||
      context.clientDataJSON !== clientDataJSON ||
      (context.credentialId !== null &&
        (credentialId === null || !passkeyCredentialIdMatches(context.credentialId, credentialId)))
    )
      return resultErrorCreate(op, "Passkey consent does not match the request.", {
        code: "platform.forbidden",
        statusCode: 403,
      })
    if (!consent.approved)
      return resultErrorCreate(op, "Passkey operation was not approved.", {
        code: "platform.forbidden",
        statusCode: 403,
      })
    return resultCreate(consent)
  }

  const passkeyCredentialCreate = (request: unknown): Promise<Result<unknown>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.passkeyCredentialCreate"
      const parsed = v.safeParse(extensionPasskeyCredentialCreateRequestSchema, request)
      if (!parsed.success)
        return invalidRequest(op, "WebAuthn registration request is invalid.", v.summarize(parsed.issues))
      const value = parsed.output
      const rpIdResult = extensionPasskeyRpIdNormalize(value.rpId)
      if (!rpIdResult.success) return rpIdResult
      const consentResult = passkeyConsentAuthorize(
        "create",
        rpIdResult.data,
        value.cipherId,
        null,
        value.userId,
        value.userVerification,
        value.clientDataJSON,
        value.consent,
      )
      if (!consentResult.success) return consentResult
      if (!options.vaultSession.isUnlocked())
        return resultErrorCreate(op, "Vault is locked.", { code: "platform.unauthorized", statusCode: 401 })
      const syncResult = await syncRun(true)
      if (!syncResult.success) return syncResult
      const snapshot = syncResult.data.snapshot
      const loginCiphers = extensionLoginCiphersRead(snapshot.ciphers)
      for (const cipher of loginCiphers) {
        if (cipher.deletedDate !== null) continue
        for (const credential of cipher.login.fido2Credentials ?? []) {
          if (
            passkeyRpIdMatches(credential.rpId, rpIdResult.data) &&
            value.excludeCredentialIds.some((id) => passkeyCredentialIdMatches(id, credential.credentialId))
          )
            return resultErrorCreate(op, "A WebAuthn credential is already registered.", {
              code: "platform.forbidden",
              statusCode: 403,
            })
        }
      }
      const registrationResult = await extensionPasskeyCredentialCreate(value, consentResult.data.userVerified, now)
      if (!registrationResult.success) return registrationResult
      const targetCipher = value.cipherId === null ? null : loginCiphers.find((cipher) => cipher.id === value.cipherId)
      if (value.cipherId !== null && targetCipher === undefined)
        return invalidRequest(op, "The selected login could not be found.")
      if (targetCipher === undefined) return invalidRequest(op, "The selected login could not be found.")
      if (targetCipher !== null && targetCipher.deletedDate !== null)
        return invalidRequest(op, "The selected login could not be found.")
      let plainCipher: ExtensionPersonalLoginCipher
      if (targetCipher === null) {
        const createdAt = new Date(now()).toISOString()
        plainCipher = {
          object: "cipherDetails",
          id: registrationResult.data.credential.credentialId,
          type: 1,
          creationDate: createdAt,
          revisionDate: createdAt,
          deletedDate: null,
          organizationId: null,
          folderId: null,
          name: value.rpName ?? rpIdResult.data,
          notes: null,
          favorite: false,
          login: {
            username: value.userName,
            password: null,
            uris: [{ uri: `https://${rpIdResult.data}`, match: null }],
            uri: `https://${rpIdResult.data}`,
            totp: null,
            fido2Credentials: [registrationResult.data.credential],
          },
          fields: [],
        }
      } else {
        const writeResult = passkeyCipherWriteAllowed(targetCipher)
        if (!writeResult.success) return writeResult
        plainCipher = {
          ...targetCipher,
          login: {
            ...targetCipher.login,
            ...(targetCipher.login.username === null && value.userName !== null ? { username: value.userName } : {}),
            fido2Credentials: [...(targetCipher.login.fido2Credentials ?? []), registrationResult.data.credential],
          },
        }
      }
      const encryptedResult = await options.vaultSession.personalLoginCipherEncrypt(plainCipher)
      if (!encryptedResult.success) return encryptedResult
      const encryptedRequest = passkeyCipherRequestCreate(encryptedResult.data)
      if (targetCipher === null) {
        const cipherCreate = options.apiClient.cipherCreate
        if (cipherCreate === undefined) return internal(op, "Cipher create API is unavailable.")
        const createResult = await protectedRequest((accessToken) => cipherCreate(encryptedRequest, { accessToken }))
        if (!createResult.success) return createResult
      } else {
        const cipherUpdate = options.apiClient.cipherUpdate
        if (cipherUpdate === undefined) return internal(op, "Cipher update API is unavailable.")
        const updateResult = await protectedRequest((accessToken) =>
          cipherUpdate(targetCipher.id, encryptedRequest, { accessToken }),
        )
        if (!updateResult.success) return updateResult
      }
      const refreshedResult = await syncRun(true)
      if (!refreshedResult.success) return refreshedResult
      return resultCreate(registrationResult.data.response)
    })

  const passkeyAssertion = (request: unknown): Promise<Result<unknown>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.passkeyAssertion"
      const parsed = v.safeParse(extensionPasskeyAssertionRequestSchema, request)
      if (!parsed.success)
        return invalidRequest(op, "WebAuthn assertion request is invalid.", v.summarize(parsed.issues))
      const value = parsed.output
      const rpIdResult = extensionPasskeyRpIdNormalize(value.rpId)
      if (!rpIdResult.success) return rpIdResult
      const consentCredentialId = value.credentialId ?? value.consent?.credentialId ?? null
      const consentResult = passkeyConsentAuthorize(
        "get",
        rpIdResult.data,
        null,
        consentCredentialId,
        value.userHandle,
        value.userVerification,
        value.clientDataJSON,
        value.consent,
      )
      if (!consentResult.success) return consentResult
      if (!options.vaultSession.isUnlocked())
        return resultErrorCreate(op, "Vault is locked.", { code: "platform.unauthorized", statusCode: 401 })
      const syncResult = await syncRun(true)
      if (!syncResult.success) return syncResult
      const loginCiphers = extensionLoginCiphersRead(syncResult.data.snapshot.ciphers)
      const credentials = loginCiphers
        .filter((cipher) => cipher.deletedDate === null)
        .flatMap((cipher) => cipher.login.fido2Credentials ?? [])
      const assertionRequest: ExtensionPasskeyAssertionRequest = {
        ...value,
        credentialId: value.credentialId ?? consentResult.data.credentialId ?? null,
      }
      const assertionResult = await extensionPasskeyAssertionCreate(
        assertionRequest,
        credentials,
        consentResult.data.userVerified,
      )
      if (!assertionResult.success) return assertionResult
      const selectedCipher = loginCiphers.find((cipher) =>
        (cipher.login.fido2Credentials ?? []).some(
          (credential) =>
            passkeyRpIdMatches(credential.rpId, rpIdResult.data) &&
            passkeyCredentialIdMatches(credential.credentialId, assertionResult.data.credential.credentialId),
        ),
      )
      if (selectedCipher === undefined) return invalidRequest(op, "The selected login could not be found.")
      if (assertionResult.data.credential.counter > 0) {
        const writeResult = passkeyCipherWriteAllowed(selectedCipher)
        if (!writeResult.success) return writeResult
        const updatedCipher: ExtensionPersonalLoginCipher = {
          ...selectedCipher,
          login: {
            ...selectedCipher.login,
            fido2Credentials: (selectedCipher.login.fido2Credentials ?? []).map((credential) =>
              passkeyCredentialIdMatches(credential.credentialId, assertionResult.data.credential.credentialId)
                ? assertionResult.data.credential
                : credential,
            ),
          },
        }
        const encryptedResult = await options.vaultSession.personalLoginCipherEncrypt(updatedCipher)
        if (!encryptedResult.success) return encryptedResult
        const cipherUpdate = options.apiClient.cipherUpdate
        if (cipherUpdate === undefined) return internal(op, "Cipher update API is unavailable.")
        const updateResult = await protectedRequest((accessToken) =>
          cipherUpdate(selectedCipher.id, passkeyCipherRequestCreate(encryptedResult.data), { accessToken }),
        )
        if (!updateResult.success) return updateResult
        const refreshedResult = await syncRun(true)
        if (!refreshedResult.success) return refreshedResult
      }
      return resultCreate(assertionResult.data.response)
    })

  const sessionHandoffCreate = (
    operation: SessionHandoffOperation,
    cipherId: string | null,
    webVaultOrigin: string,
    prefillUrl: string | null,
  ): Promise<Result<string>> => {
    const apiCreate = options.apiClient.sessionHandoffCreate
    if (apiCreate === undefined) {
      return Promise.resolve(
        internal("extensionBackgroundService.sessionHandoffCreate", "Session handoff is unavailable."),
      )
    }
    return protectedRequest((accessToken) =>
      extensionSessionHandoffCreate({
        accessToken,
        apiClient: { sessionHandoffCreate: apiCreate },
        cipherId,
        operation,
        prefillUrl,
        vaultSession: options.vaultSession,
        webVaultOrigin,
      }),
    )
  }

  const timeoutAlarmHandle = (alarm: { name: string }): Promise<Result<void>> => {
    if (alarm.name !== extensionTimeoutAlarmName) return Promise.resolve(resultCreate(undefined))
    return operationRun(timeoutReconcile)
  }

  const start = (): Promise<Result<void>> =>
    operationRun(async () => {
      const authResult = await options.storage.authSessionLoad()
      if (!authResult.success) return authResult
      const cacheResult = await options.storage.syncCacheLoad()
      if (!cacheResult.success) return cacheResult
      return browserRestartReconcile()
    })

  options.alarms.onAlarm((alarm) => {
    void timeoutAlarmHandle(alarm)
  })

  return {
    passwordLogin,
    refreshToken,
    sync,
    conditionalSync,
    fullSync,
    manualSync,
    sessionHandoffCreate,
    syncSnapshotLoad,
    unlock,
    lock,
    logout,
    lockPolicyLoad,
    lockPolicySave,
    activity,
    passkeyConsentContextCreate,
    passkeyCredentialCreate,
    passkeyAssertion,
    start,
    timeoutAlarmHandle,
  }
}
