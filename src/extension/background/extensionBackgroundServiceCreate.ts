import * as v from "valibot"
import { type Result } from "#result"
import type { BitwardenEncryptedLoginCipherCreateRequest } from "../../shared/api/bitwardenEncryptedLoginCipherCreateRequestSchema.js"
import type { BitwardenEncryptedLoginCipher } from "../../shared/api/bitwardenEncryptedLoginCipherSchema.js"
import type { BitwardenEncryptedLoginCipherResponse } from "../../shared/api/bitwardenEncryptedLoginCipherResponseSchema.js"
import type { BitwardenPasswordTokenResponse } from "../../shared/api/bitwardenPasswordTokenResponseSchema.js"
import type { BitwardenPreloginResponse } from "../../shared/api/bitwardenPreloginResponseSchema.js"
import type { BitwardenRefreshTokenResponse } from "../../shared/api/bitwardenRefreshTokenResponseSchema.js"
import type { BitwardenSyncEnvelope } from "../../shared/api/bitwardenSyncEnvelopeSchema.js"
import { base64Encode } from "../../shared/crypto/base64Encode.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import type { extensionBitwardenApiClientCreate } from "../api/extensionBitwardenApiClientCreate.js"
import type { ExtensionCreateLoginRequest } from "../create/extensionCreateLoginRequestSchema.js"
import { extensionCreateLoginRequestSchema } from "../create/extensionCreateLoginRequestSchema.js"
import { extensionMasterKeyDerive } from "../crypto/extensionMasterKeyDerive.js"
import { extensionMasterPasswordHashDerive } from "../crypto/extensionMasterPasswordHashDerive.js"
import {
  type ExtensionPersonalLoginCipher,
  extensionPersonalLoginCipherSchema,
} from "../crypto/extensionPersonalLoginCipherSchema.js"
import { extensionEmailSchema } from "../extensionEmailSchema.js"
import { extensionPasswordSchema } from "../extensionPasswordSchema.js"
import { extensionVaultSessionCreate } from "../session/extensionVaultSessionCreate.js"
import type { ExtensionAuthSession } from "../storage/extensionAuthSessionStorageSchema.js"
import type { ExtensionLockPolicy } from "../storage/extensionLockPolicySchema.js"
import { extensionStorageCreate } from "../storage/extensionStorageCreate.js"
import type { ExtensionSyncStorage } from "../storage/extensionSyncStorageSchema.js"
import type { ExtensionAlarmsAdapter } from "./extensionAlarmsAdapter.js"
import { type ExtensionSyncSnapshot, extensionSyncSnapshotSchema } from "./extensionSyncSnapshotSchema.js"
import { extensionTimeoutAlarmName } from "./extensionTimeoutAlarmName.js"

type ExtensionApiClient = Pick<
  ReturnType<typeof extensionBitwardenApiClientCreate>,
  "prelogin" | "passwordToken" | "refreshToken" | "revisionDate" | "sync"
> &
  Partial<Pick<ReturnType<typeof extensionBitwardenApiClientCreate>, "cipherCreate">>
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

type ExtensionCreateLoginResult = {
  cipher: BitwardenEncryptedLoginCipherResponse
  sync: ExtensionSyncResult
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
    return resultCreate(JSON.parse(text) as unknown)
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

function syncCipherWireCreate(
  cipher: BitwardenSyncEnvelope["ciphers"][number],
  revisionDate: number,
): BitwardenEncryptedLoginCipher | null {
  const rawCipher = cipher as unknown as Record<string, unknown>
  if (cipher.type !== 1 || cipher.login === undefined || cipher.login === null) return null
  if (rawCipher.organizationId !== undefined && rawCipher.organizationId !== null) return null
  const revision =
    typeof rawCipher.revisionDate === "string" && rawCipher.revisionDate.length > 0
      ? rawCipher.revisionDate
      : String(revisionDate)
  const folderId =
    rawCipher.folderId === null || typeof rawCipher.folderId === "string" ? (rawCipher.folderId ?? null) : null
  return {
    object: "cipherDetails",
    id: cipher.id,
    type: 1,
    revisionDate: revision,
    deletedDate: null,
    organizationId: null,
    folderId,
    name: cipher.name,
    notes: cipher.notes,
    login: cipher.login,
    fields: cipher.fields ?? [],
  }
}

function createLoginFieldTypeRead(type: ExtensionCreateLoginRequest["fields"][number]["type"]): 0 | 1 | 2 {
  if (typeof type === "number") return type
  if (type === "text") return 0
  if (type === "hidden") return 1
  return 2
}

function createLoginFieldValueRead(
  op: string,
  field: ExtensionCreateLoginRequest["fields"][number],
  type: 0 | 1 | 2,
): Result<string> {
  if (type === 2) {
    if (typeof field.value === "boolean") return resultCreate(String(field.value))
    if (field.value === "true" || field.value === "false") return resultCreate(field.value)
    return invalidRequest(op, "Boolean custom field values must be true or false.")
  }
  if (typeof field.value !== "string") return invalidRequest(op, "Text and hidden custom field values must be strings.")
  return resultCreate(field.value)
}

function createLoginCipherCreate(
  op: string,
  request: ExtensionCreateLoginRequest,
  draftId: string,
  revisionDate: string,
): Result<ExtensionPersonalLoginCipher> {
  const fields: ExtensionPersonalLoginCipher["fields"] = []
  for (const field of request.fields) {
    const type = createLoginFieldTypeRead(field.type)
    const valueResult = createLoginFieldValueRead(op, field, type)
    if (!valueResult.success) return valueResult
    fields.push({ name: field.name, value: valueResult.data, type, linkedId: null })
  }

  const uris = request.uris.map((uri) =>
    typeof uri === "string" ? { uri, match: null } : { uri: uri.uri, match: uri.match ?? null },
  )
  const firstUri = uris[0]
  if (firstUri === undefined) return invalidRequest(op, "At least one URI is required.")

  return resultCreate({
    object: "cipherDetails",
    id: draftId,
    type: 1,
    revisionDate,
    deletedDate: null,
    organizationId: null,
    folderId: request.folderId,
    name: request.name,
    notes: request.notes,
    favorite: request.favorite,
    login: {
      username: request.username,
      password: request.password,
      uris,
      uri: firstUri.uri,
      totp: null,
    },
    fields,
  })
}

function createLoginRequestCreate(cipher: BitwardenEncryptedLoginCipher): BitwardenEncryptedLoginCipherCreateRequest {
  return {
    type: cipher.type,
    name: cipher.name,
    notes: cipher.notes,
    fields: cipher.fields,
    login: cipher.login,
    favorite: cipher.favorite,
    ...(cipher.folderId === undefined || cipher.folderId === null ? {} : { folderId: cipher.folderId }),
  }
}

function createLoginDraftIdCreate(op: string, requestedId: string | undefined): Result<string> {
  if (requestedId !== undefined) return resultCreate(requestedId)
  try {
    return resultCreate(globalThis.crypto.randomUUID())
  } catch {
    return internal(op, "Create draft id could not be generated.")
  }
}

function createLoginDateCreate(op: string, timestamp: number): Result<string> {
  if (!timestampValid(timestamp)) return internal(op, "Create timestamp is invalid.")
  try {
    return resultCreate(new Date(timestamp).toISOString())
  } catch {
    return internal(op, "Create timestamp is invalid.")
  }
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
    if (
      snapshotValueResult.data === null ||
      typeof snapshotValueResult.data !== "object" ||
      Array.isArray(snapshotValueResult.data)
    )
      return internal(op, "Stored sync snapshot is invalid.")
    const snapshotParsed = v.safeParse(extensionSyncSnapshotSchema, {
      ...(snapshotValueResult.data as Record<string, unknown>),
      ciphers: [],
    })
    if (!snapshotParsed.success) return internal(op, "Stored sync snapshot is invalid.")

    const ciphers: ExtensionPersonalLoginCipher[] = []
    for (const encryptedCipher of cache.ciphers) {
      const cipherBytesResult = await options.vaultSession.encryptedPayloadDecrypt(encryptedCipher.payload)
      if (!cipherBytesResult.success) return cipherBytesResult
      const cipherValueResult = textDecode(op, cipherBytesResult.data)
      if (!cipherValueResult.success) return cipherValueResult
      const cipherParsed = v.safeParse(extensionPersonalLoginCipherSchema, cipherValueResult.data)
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
    const ciphers: ExtensionPersonalLoginCipher[] = []
    for (const cipher of envelope.ciphers) {
      const wireCipher = syncCipherWireCreate(cipher, revisionDate)
      if (wireCipher === null) continue
      const decryptedResult = await options.vaultSession.personalLoginCipherDecrypt(wireCipher)
      if (!decryptedResult.success) return decryptedResult
      ciphers.push(decryptedResult.data)
    }
    const snapshot = { ...envelope, ciphers }
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
      encryptedCiphers.push({ id: cipher.id, revisionDate: cipher.revisionDate, payload: payloadResult.data })
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

  const createLogin = (request: unknown): Promise<Result<ExtensionCreateLoginResult>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.createLogin"
      const parsed = v.safeParse(extensionCreateLoginRequestSchema, request)
      if (!parsed.success) return invalidRequest(op, "Create login request is invalid.", v.summarize(parsed.issues))
      if (!options.vaultSession.isUnlocked()) {
        return resultErrorCreate(op, "Vault is locked.", { code: "platform.unauthorized", statusCode: 401 })
      }

      const draftIdResult = createLoginDraftIdCreate(op, parsed.output.draftId)
      if (!draftIdResult.success) return draftIdResult
      const updatedAt = now()
      const revisionDateResult = createLoginDateCreate(op, updatedAt)
      if (!revisionDateResult.success) return revisionDateResult
      const plainCipherResult = createLoginCipherCreate(op, parsed.output, draftIdResult.data, revisionDateResult.data)
      if (!plainCipherResult.success) return plainCipherResult

      const draftTextResult = jsonEncode(op, parsed.output, "Create draft could not be encoded.")
      if (!draftTextResult.success) return draftTextResult
      const draftPayloadResult = await options.vaultSession.encryptedPayloadEncrypt(draftTextResult.data)
      if (!draftPayloadResult.success) return draftPayloadResult
      const draftSaveResult = await options.storage.createDraftSave({
        id: draftIdResult.data,
        updatedAt,
        payload: draftPayloadResult.data,
      })
      if (!draftSaveResult.success) return draftSaveResult

      const encryptedCipherResult = await options.vaultSession.personalLoginCipherEncrypt(plainCipherResult.data)
      if (!encryptedCipherResult.success) return encryptedCipherResult
      const cipherCreate = options.apiClient.cipherCreate
      if (cipherCreate === undefined) return internal(op, "Cipher create API is unavailable.")
      const createResult = await protectedRequest((accessToken) =>
        cipherCreate(createLoginRequestCreate(encryptedCipherResult.data), { accessToken }),
      )
      if (!createResult.success) return createResult

      const syncResult = await syncRun(true)
      if (!syncResult.success) return syncResult
      const draftDeleteResult = await options.storage.createDraftDelete(draftIdResult.data)
      if (!draftDeleteResult.success) return draftDeleteResult
      return resultCreate({ cipher: createResult.data, sync: syncResult.data })
    })

  const createLoginDraftSave = (request: unknown): Promise<Result<{ id: string; updatedAt: number }>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.createLoginDraftSave"
      const parsed = v.safeParse(extensionCreateLoginRequestSchema, request)
      if (!parsed.success)
        return invalidRequest(op, "Create login draft request is invalid.", v.summarize(parsed.issues))
      if (!options.vaultSession.isUnlocked()) {
        return resultErrorCreate(op, "Vault is locked.", { code: "platform.unauthorized", statusCode: 401 })
      }

      const draftIdResult = createLoginDraftIdCreate(op, parsed.output.draftId)
      if (!draftIdResult.success) return draftIdResult
      const updatedAt = now()
      if (!timestampValid(updatedAt)) return internal(op, "Create draft timestamp is invalid.")
      const draftTextResult = jsonEncode(
        op,
        { ...parsed.output, draftId: draftIdResult.data },
        "Create draft could not be encoded.",
      )
      if (!draftTextResult.success) return draftTextResult
      const draftPayloadResult = await options.vaultSession.encryptedPayloadEncrypt(draftTextResult.data)
      if (!draftPayloadResult.success) return draftPayloadResult
      const draftSaveResult = await options.storage.createDraftSave({
        id: draftIdResult.data,
        updatedAt,
        payload: draftPayloadResult.data,
      })
      if (!draftSaveResult.success) return draftSaveResult
      return resultCreate({ id: draftIdResult.data, updatedAt })
    })

  const createLoginDraftDiscard = (id: unknown): Promise<Result<void>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.createLoginDraftDiscard"
      const parsed = v.safeParse(v.pipe(v.string(), v.minLength(1)), id)
      if (!parsed.success) return invalidRequest(op, "Create draft id is invalid.")
      return options.storage.createDraftDelete(parsed.output)
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
      if (options.vaultSession.isUnlocked()) return activityRun()
      return timeoutReconcile()
    })

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
    createLogin,
    syncSnapshotLoad,
    createLoginDraftSave,
    createLoginDraftDiscard,
    unlock,
    lock,
    logout,
    lockPolicySave,
    activity,
    start,
    timeoutAlarmHandle,
  }
}
