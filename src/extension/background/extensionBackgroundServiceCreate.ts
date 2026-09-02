import * as v from "valibot"
import type { Result } from "#result"
import { bitwardenCollectionListResponseSchema } from "../../shared/api/bitwardenCollectionListResponseSchema.js"
import {
  type BitwardenCollectionMutationRequest,
  bitwardenCollectionMutationRequestSchema,
} from "../../shared/api/bitwardenCollectionMutationRequestSchema.js"
import {
  type BitwardenEncryptedCipher,
  bitwardenEncryptedCipherSchema,
} from "../../shared/api/bitwardenEncryptedCipherSchema.js"
import type { BitwardenEncryptedCollection } from "../../shared/api/bitwardenEncryptedCollectionSchema.js"
import { bitwardenEncryptedCollectionSchema } from "../../shared/api/bitwardenEncryptedCollectionSchema.js"
import { bitwardenEncryptedFolderSchema } from "../../shared/api/bitwardenEncryptedFolderSchema.js"
import type { BitwardenEncryptedLoginCipherCreateRequest } from "../../shared/api/bitwardenEncryptedLoginCipherCreateRequestSchema.js"
import type { BitwardenEncryptedLoginCipher } from "../../shared/api/bitwardenEncryptedLoginCipherSchema.js"
import { bitwardenFolderListResponseSchema } from "../../shared/api/bitwardenFolderListResponseSchema.js"
import type { BitwardenPasswordTokenResponse } from "../../shared/api/bitwardenPasswordTokenResponseSchema.js"
import type { BitwardenPreloginResponse } from "../../shared/api/bitwardenPreloginResponseSchema.js"
import {
  type BitwardenRefreshTokenResponse,
  bitwardenRefreshTokenResponseSchema,
} from "../../shared/api/bitwardenRefreshTokenResponseSchema.js"
import type { BitwardenSyncEnvelope } from "../../shared/api/bitwardenSyncEnvelopeSchema.js"
import { base64Decode } from "../../shared/crypto/base64Decode.js"
import { base64Encode } from "../../shared/crypto/base64Encode.js"
import { bitwardenAttachmentBinaryDecrypt } from "../../shared/crypto/bitwardenAttachmentBinaryDecrypt.js"
import { bitwardenAttachmentBinaryEncrypt } from "../../shared/crypto/bitwardenAttachmentBinaryEncrypt.js"
import { secureRandomBytes } from "../../shared/crypto/secureRandomBytes.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import type { SessionHandoffOperation } from "../../shared/sessionHandoff/sessionHandoffOperationSchema.js"
import { totpSecretParse } from "../../shared/totp/totpSecretParse.js"
import { type TwoFactorChallenge, twoFactorChallengeSchema } from "../../web/auth/model/twoFactorChallengeSchema.js"
import { twoFactorWebAuthnChallengeResponseSchema } from "../../web/auth/model/twoFactorWebAuthnChallengeResponseSchema.js"
import type { extensionBitwardenApiClientCreate } from "../api/extensionBitwardenApiClientCreate.js"
import { extensionAccountKeyMaterialCreate } from "../auth/extensionAccountKeyMaterialCreate.js"
import { extensionAccountPasswordSetupRequestSchema } from "../auth/extensionAccountPasswordSetupRequestSchema.js"
import { extensionAccountRegisterRequestSchema } from "../auth/extensionAccountRegisterRequestSchema.js"
import { extensionAccountVerificationEmailSendRequestSchema } from "../auth/extensionAccountVerificationEmailSendRequestSchema.js"
import { extensionAccountVerifyRequestSchema } from "../auth/extensionAccountVerifyRequestSchema.js"
import { extensionLoginChallengeIdRequestSchema } from "../auth/extensionLoginChallengeIdRequestSchema.js"
import type { ExtensionLoginChallenge } from "../auth/extensionLoginChallengeSchema.js"
import { extensionLoginChallengeSubmitRequestSchema } from "../auth/extensionLoginChallengeSubmitRequestSchema.js"
import { extensionLoginRequestSchema } from "../auth/extensionLoginRequestSchema.js"
import type { ExtensionLoginResult } from "../auth/extensionLoginResultSchema.js"
import { extensionLoginTwoFactorProvider } from "../auth/extensionLoginTwoFactorProvider.js"
import { extensionUnlockRequestSchema } from "../auth/extensionUnlockRequestSchema.js"
import { extensionCredentialCapturePlanCreate } from "../autofill/extensionCredentialCapturePlanCreate.js"
import type { ExtensionCredentialCapturePrompt } from "../autofill/extensionCredentialCapturePromptSchema.js"
import { extensionCredentialCaptureRequestSchema } from "../autofill/extensionCredentialCaptureRequestSchema.js"
import type { extensionBiometricAdapterCreate } from "../biometric/extensionBiometricAdapterCreate.js"
import type { ExtensionBiometricCapability } from "../biometric/extensionBiometricCapabilitySchema.js"
import type { ExtensionBiometricStatus } from "../biometric/extensionBiometricStatusSchema.js"
import { type ExtensionCipher, extensionCipherSchema } from "../crypto/extensionCipherSchema.js"
import type { ExtensionCollection } from "../crypto/extensionCollectionSchema.js"
import { extensionCollectionSchema } from "../crypto/extensionCollectionSchema.js"
import { type ExtensionFolder, extensionFolderSchema } from "../crypto/extensionFolderSchema.js"
import { extensionMasterKeyDerive } from "../crypto/extensionMasterKeyDerive.js"
import { extensionMasterPasswordHashDerive } from "../crypto/extensionMasterPasswordHashDerive.js"
import type { ExtensionPersonalLoginCipher } from "../crypto/extensionPersonalLoginCipherSchema.js"
import { extensionProfileSchema } from "../crypto/extensionProfileSchema.js"
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
import type { extensionVaultSessionCreate } from "../session/extensionVaultSessionCreate.js"
import type { ExtensionAuthSession } from "../storage/extensionAuthSessionStorageSchema.js"
import type { ExtensionLockPolicy } from "../storage/extensionLockPolicySchema.js"
import type { extensionStorageCreate } from "../storage/extensionStorageCreate.js"
import type { ExtensionSyncStorage } from "../storage/extensionSyncStorageSchema.js"
import type { ExtensionAlarmsAdapter } from "./extensionAlarmsAdapter.js"
import { extensionAttachmentDeleteRequestSchema } from "./extensionAttachmentDeleteRequestSchema.js"
import { extensionAttachmentDownloadRequestSchema } from "./extensionAttachmentDownloadRequestSchema.js"
import type { ExtensionAttachmentDownloadResult } from "./extensionAttachmentDownloadResultSchema.js"
import { extensionAttachmentUploadRequestSchema } from "./extensionAttachmentUploadRequestSchema.js"
import { extensionBackgroundCollectionDtoCreate } from "./extensionBackgroundCollectionDtoCreate.js"
import type { ExtensionBackgroundCollectionDto } from "./extensionBackgroundCollectionDtoSchema.js"
import { extensionBackgroundCollectionDtoSchema } from "./extensionBackgroundCollectionDtoSchema.js"
import type { ExtensionBackgroundCollectionListResult } from "./extensionBackgroundCollectionListResultSchema.js"
import { extensionBackgroundCollectionListResultSchema } from "./extensionBackgroundCollectionListResultSchema.js"
import { extensionBackgroundFolderDtoCreate } from "./extensionBackgroundFolderDtoCreate.js"
import type { ExtensionBackgroundFolderDto } from "./extensionBackgroundFolderDtoSchema.js"
import { extensionBackgroundFolderDtoSchema } from "./extensionBackgroundFolderDtoSchema.js"
import {
  type ExtensionBackgroundFolderListResult,
  extensionBackgroundFolderListResultSchema,
} from "./extensionBackgroundFolderListResultSchema.js"
import { extensionCipherArchiveRequestSchema } from "./extensionCipherArchiveRequestSchema.js"
import { extensionCipherCollectionsUpdateRequestSchema } from "./extensionCipherCollectionsUpdateRequestSchema.js"
import { extensionCipherCreateRequestSchema } from "./extensionCipherCreateRequestSchema.js"
import { extensionCipherDeleteRequestSchema } from "./extensionCipherDeleteRequestSchema.js"
import { extensionCipherDetailReadRequestSchema } from "./extensionCipherDetailReadRequestSchema.js"
import { extensionCipherDetailReadResultSchema } from "./extensionCipherDetailReadResultSchema.js"
import { extensionCipherMoveRequestSchema } from "./extensionCipherMoveRequestSchema.js"
import { extensionCipherMutationRequestCreate } from "./extensionCipherMutationRequestCreate.js"
import { extensionCipherPartialRequestSchema } from "./extensionCipherPartialRequestSchema.js"
import { extensionCipherRestoreRequestSchema } from "./extensionCipherRestoreRequestSchema.js"
import { extensionCipherUpdateRequestSchema } from "./extensionCipherUpdateRequestSchema.js"
import { extensionCollectionCreateRequestSchema } from "./extensionCollectionCreateRequestSchema.js"
import { extensionCollectionDeleteRequestSchema } from "./extensionCollectionDeleteRequestSchema.js"
import { extensionCollectionListRequestSchema } from "./extensionCollectionListRequestSchema.js"
import { extensionCollectionReadRequestSchema } from "./extensionCollectionReadRequestSchema.js"
import { extensionCollectionUpdateRequestSchema } from "./extensionCollectionUpdateRequestSchema.js"
import { extensionFolderCreateRequestSchema } from "./extensionFolderCreateRequestSchema.js"
import { extensionFolderDeleteRequestSchema } from "./extensionFolderDeleteRequestSchema.js"
import { extensionFolderListRequestSchema } from "./extensionFolderListRequestSchema.js"
import { extensionFolderReadRequestSchema } from "./extensionFolderReadRequestSchema.js"
import { extensionFolderUpdateRequestSchema } from "./extensionFolderUpdateRequestSchema.js"
import { extensionSyncCacheSnapshotSchema } from "./extensionSyncCacheSnapshotSchema.js"
import { type ExtensionSyncSnapshot, extensionSyncSnapshotSchema } from "./extensionSyncSnapshotSchema.js"
import { extensionTimeoutAlarmName } from "./extensionTimeoutAlarmName.js"
import { extensionVaultSearch } from "./extensionVaultSearch.js"
import {
  type ExtensionVaultSearchRequest,
  extensionVaultSearchRequestSchema,
} from "./extensionVaultSearchRequestSchema.js"
import type { ExtensionVaultSearchResult } from "./extensionVaultSearchResultSchema.js"

type ExtensionApiClient = Pick<
  ReturnType<typeof extensionBitwardenApiClientCreate>,
  "prelogin" | "passwordToken" | "refreshToken" | "revisionDate" | "sync"
> &
  Partial<
    Pick<
      ReturnType<typeof extensionBitwardenApiClientCreate>,
      | "cipherRead"
      | "cipherCreate"
      | "cipherUpdate"
      | "cipherPartial"
      | "cipherDelete"
      | "cipherRestore"
      | "cipherArchive"
      | "cipherMove"
      | "cipherCollectionsUpdate"
      | "attachmentUpload"
      | "attachmentDownload"
      | "attachmentDelete"
      | "folderList"
      | "folderRead"
      | "folderCreate"
      | "folderUpdate"
      | "folderDelete"
      | "collectionList"
      | "collectionRead"
      | "collectionCreate"
      | "collectionUpdate"
      | "collectionDelete"
      | "accountRegister"
      | "accountVerificationEmailSend"
      | "accountVerify"
      | "accountPasswordSetup"
      | "sessionHandoffCreate"
      | "twoFactorEmailLoginSend"
    >
  >
type ExtensionStorage = ReturnType<typeof extensionStorageCreate>
type ExtensionVaultSession = ReturnType<typeof extensionVaultSessionCreate>

type ExtensionBiometricAdapter = Pick<
  ReturnType<typeof extensionBiometricAdapterCreate>,
  "capabilityRead" | "enroll" | "unwrap" | "revoke"
>

type ExtensionBackgroundServiceOptions = {
  apiClient: ExtensionApiClient
  storage: ExtensionStorage
  vaultSession: ExtensionVaultSession
  biometric?: ExtensionBiometricAdapter
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

type PasswordAuthenticationContext = {
  request: PasswordLoginRequest
  prelogin: BitwardenPreloginResponse
  passwordHash: string
}

type PendingLoginChallenge = {
  id: string
  expiresAt: number
  purpose: "login" | "unlock"
  context: PasswordAuthenticationContext
  password: string | null
  challenge: TwoFactorChallenge
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

function unavailable<T>(op: string, message: string): Result<T> {
  return resultErrorCreate(op, message, { code: "platform.unavailable", statusCode: 503 })
}

function internal<T>(op: string, message: string): Result<T> {
  return resultErrorCreate(op, message, { code: "platform.internal", statusCode: 500 })
}

function timestampValid(timestamp: number): boolean {
  return Number.isSafeInteger(timestamp) && timestamp >= 0
}

function authSessionEncryptedPrivateKeyRead(
  token: AuthTokenResponse,
  previous: ExtensionAuthSession | null,
): string | null | undefined {
  if (!("UserDecryptionOptions" in token)) return previous?.encryptedPrivateKey
  const passwordToken = token as BitwardenPasswordTokenResponse
  const accountPrivateKey = passwordToken.AccountKeys?.publicKeyEncryptionKeyPair.wrappedPrivateKey
  if (typeof accountPrivateKey === "string" && accountPrivateKey.length > 0) return accountPrivateKey
  return typeof passwordToken.PrivateKey === "string" && passwordToken.PrivateKey.length > 0
    ? passwordToken.PrivateKey
    : undefined
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
  const encryptedPrivateKey = authSessionEncryptedPrivateKeyRead(token, previous)
  return resultCreate({
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt,
    tokenType: token.token_type,
    scope: token.scope,
    accountId: previous?.accountId ?? null,
    email,
    ...(encryptedPrivateKey === undefined ? {} : { encryptedPrivateKey }),
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
  return ciphers.filter(
    (cipher): cipher is ExtensionPersonalLoginCipher => cipher.type === 1 || cipher.type === undefined,
  )
}

function cipherReadPermissionAllowed(cipher: BitwardenEncryptedCipher): boolean {
  if (cipher.permissions === undefined || cipher.permissions === null) return true
  return cipher.permissions.read !== false
}

export function extensionBackgroundServiceCreate(options: ExtensionBackgroundServiceOptions) {
  const now = options.now ?? Date.now
  let operationChain: Promise<void> = Promise.resolve()
  let refreshInFlight: Promise<Result<ExtensionAuthSession>> | null = null
  let pendingLoginChallenge: PendingLoginChallenge | null = null
  const credentialCapturePending = new Map<
    string,
    { expiresAt: number; kind: "add" | "change"; cipher: ExtensionPersonalLoginCipher }
  >()
  const credentialCapturePendingDrop = (promptId: string): void => {
    credentialCapturePending.delete(promptId)
  }
  const credentialCapturePendingClear = (): void => {
    credentialCapturePending.clear()
  }
  const credentialCapturePendingExpiredDrop = (currentTime: number): void => {
    for (const [id, pending] of credentialCapturePending) {
      if (pending.expiresAt <= currentTime) credentialCapturePendingDrop(id)
    }
  }

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
    const responseValidation = v.safeParse(bitwardenRefreshTokenResponseSchema, refreshResult.data)
    if (!responseValidation.success) {
      return resultErrorCreate(op, "Token refresh response is invalid.", {
        code: "platform.internal",
        statusCode: 500,
        errorData: v.summarize(responseValidation.issues),
      })
    }
    const currentAuthResult = await options.storage.authSessionLoad()
    if (!currentAuthResult.success) return currentAuthResult
    if (currentAuthResult.data === null) return unauthorized(op)
    if (currentAuthResult.data.refreshToken !== authSession.refreshToken) return resultCreate(currentAuthResult.data)
    const nextAuthResult = authSessionCreate(responseValidation.output, authSession.email, authSession, now)
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

  const passwordAuthenticationContextCreate = async (
    request: PasswordLoginRequest,
  ): Promise<Result<PasswordAuthenticationContext>> => {
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

    return resultCreate({ request, prelogin: preloginResult.data, passwordHash: encodedPasswordHash })
  }

  const passwordAuthenticate = async (
    context: PasswordAuthenticationContext,
    twoFactor?: { provider: number; token: string; rememberDevice: boolean },
  ): Promise<Result<AuthenticatedPassword>> => {
    const request = context.request
    const tokenResult = await options.apiClient.passwordToken({
      grant_type: "password",
      client_id: request.clientId,
      password: context.passwordHash,
      scope: request.scope,
      username: request.email,
      device_identifier: request.deviceIdentifier,
      device_name: request.deviceName,
      device_type: request.deviceType,
      ...(twoFactor === undefined
        ? {}
        : {
            two_factor_provider: String(twoFactor.provider),
            two_factor_token: twoFactor.token,
            two_factor_remember: twoFactor.rememberDevice ? "1" : "0",
          }),
    })
    if (!tokenResult.success) return tokenResult
    const previousAuthResult = await options.storage.authSessionLoad()
    if (!previousAuthResult.success) return previousAuthResult
    const authSessionResult = authSessionCreate(tokenResult.data, request.email, previousAuthResult.data, now)
    if (!authSessionResult.success) return authSessionResult
    return resultCreate({ prelogin: context.prelogin, token: tokenResult.data, authSession: authSessionResult.data })
  }

  const loginChallengeRead = (result: Result<unknown>): Result<TwoFactorChallenge> => {
    const op = "extensionBackgroundService.loginChallengeRead"
    if (result.success || result.code !== "auth.two-factor-required" || result.errorData == null) {
      return invalidRequest(op, "Authentication challenge is unavailable.")
    }
    try {
      const parsed = v.safeParse(twoFactorChallengeSchema, JSON.parse(result.errorData))
      if (!parsed.success) return invalidRequest(op, "Authentication challenge is invalid.")
      return resultCreate(parsed.output)
    } catch {
      return invalidRequest(op, "Authentication challenge is invalid.")
    }
  }

  const loginChallengePublicCreate = (
    pending: PendingLoginChallenge,
    errorMessage: string | null = null,
  ): Result<ExtensionLoginChallenge> => {
    const providers: Array<0 | 1 | 7 | 8> = []
    for (const rawProvider of pending.challenge.TwoFactorProviders) {
      const provider = typeof rawProvider === "number" ? rawProvider : Number.parseInt(rawProvider, 10)
      if ((provider === 0 || provider === 1 || provider === 7) && !providers.includes(provider)) {
        providers.push(provider)
      }
    }
    if (!providers.includes(extensionLoginTwoFactorProvider.recoveryCode)) {
      providers.push(extensionLoginTwoFactorProvider.recoveryCode)
    }
    if (providers.length === 0)
      return unavailable("extensionBackgroundService.loginChallenge", "No supported verification method is available.")

    const emailData = v.safeParse(
      v.object({ Email: v.pipe(v.string(), v.minLength(1)) }),
      pending.challenge.TwoFactorProviders2?.[String(extensionLoginTwoFactorProvider.email)],
    )
    const webAuthnData = v.safeParse(
      v.object({ Challenge: twoFactorWebAuthnChallengeResponseSchema }),
      pending.challenge.TwoFactorProviders2?.[String(extensionLoginTwoFactorProvider.webauthn)],
    )
    const webAuthn =
      providers.includes(extensionLoginTwoFactorProvider.webauthn) && webAuthnData.success
        ? webAuthnData.output.Challenge
        : null
    const supportedProviders =
      webAuthn === null
        ? providers.filter((provider) => provider !== extensionLoginTwoFactorProvider.webauthn)
        : providers
    return resultCreate({
      challengeId: pending.id,
      providers: supportedProviders,
      emailHint: emailData.success ? emailData.output.Email : null,
      webAuthn,
      errorMessage,
    })
  }

  const pendingLoginChallengeCreate = (
    purpose: "login" | "unlock",
    context: PasswordAuthenticationContext,
    password: string | null,
    challenge: TwoFactorChallenge,
  ): Result<ExtensionLoginResult> => {
    const id = globalThis.crypto?.randomUUID?.() ?? `login-challenge-${now()}-${Math.random().toString(36).slice(2)}`
    pendingLoginChallenge = { id, expiresAt: now() + 5 * 60_000, purpose, context, password, challenge }
    const publicResult = loginChallengePublicCreate(pendingLoginChallenge)
    if (!publicResult.success) {
      pendingLoginChallenge = null
      return publicResult
    }
    return resultCreate({ status: "challenge", challenge: publicResult.data })
  }

  const accountRegister = async (input: unknown): Promise<Result<void>> => {
    const op = "extensionBackgroundService.accountRegister"
    const parsed = v.safeParse(extensionAccountRegisterRequestSchema, input)
    if (!parsed.success)
      return invalidRequest(op, "Account registration request is invalid.", v.summarize(parsed.issues))
    if (options.apiClient.accountRegister === undefined) return unavailable(op, "Account registration is unavailable.")
    const request = parsed.output
    const keyMaterialResult = await extensionAccountKeyMaterialCreate({
      email: request.email,
      masterPassword: request.masterPassword,
      kdf: 0,
      kdfIterations: 600_000,
      kdfMemory: null,
      kdfParallelism: null,
    })
    if (!keyMaterialResult.success) return keyMaterialResult
    const keyMaterial = keyMaterialResult.data
    const result = await options.apiClient.accountRegister({
      email: request.email,
      masterPasswordHash: keyMaterial.masterPasswordHash,
      userSymmetricKey: keyMaterial.userSymmetricKey,
      masterPasswordHint: request.masterPasswordHint,
      name: request.name,
      kdf: 0,
      kdfIterations: 600_000,
      kdfMemory: null,
      kdfParallelism: null,
      keys: keyMaterial.keys,
    })
    keyMaterial.userKey.fill(0)
    if (!result.success) return result
    return resultCreate(undefined)
  }

  const accountVerificationEmailSend = async (input: unknown) => {
    const op = "extensionBackgroundService.accountVerificationEmailSend"
    const parsed = v.safeParse(extensionAccountVerificationEmailSendRequestSchema, input)
    if (!parsed.success) return invalidRequest(op, "Verification email request is invalid.", v.summarize(parsed.issues))
    if (options.apiClient.accountVerificationEmailSend === undefined) {
      return unavailable<{ token?: string; userId?: string }>(op, "Email verification is unavailable.")
    }
    return options.apiClient.accountVerificationEmailSend(parsed.output)
  }

  const accountVerify = async (input: unknown): Promise<Result<void>> => {
    const op = "extensionBackgroundService.accountVerify"
    const parsed = v.safeParse(extensionAccountVerifyRequestSchema, input)
    if (!parsed.success) return invalidRequest(op, "Email verification request is invalid.", v.summarize(parsed.issues))
    if (options.apiClient.accountVerify === undefined) return unavailable(op, "Email verification is unavailable.")
    return options.apiClient.accountVerify(parsed.output)
  }

  const accountPasswordSetup = async (input: unknown): Promise<Result<void>> => {
    const op = "extensionBackgroundService.accountPasswordSetup"
    const parsed = v.safeParse(extensionAccountPasswordSetupRequestSchema, input)
    if (!parsed.success) return invalidRequest(op, "Password setup request is invalid.", v.summarize(parsed.issues))
    if (options.apiClient.accountPasswordSetup === undefined) return unavailable(op, "Password setup is unavailable.")
    const request = parsed.output
    const keyMaterialResult = await extensionAccountKeyMaterialCreate(request)
    if (!keyMaterialResult.success) return keyMaterialResult
    const keyMaterial = keyMaterialResult.data
    const result = await options.apiClient.accountPasswordSetup({
      accessToken: request.accessToken,
      masterPasswordHash: keyMaterial.masterPasswordHash,
      userSymmetricKey: keyMaterial.userSymmetricKey,
      masterPasswordHint: request.masterPasswordHint,
      kdf: request.kdf,
      kdfIterations: request.kdfIterations,
      kdfMemory: request.kdfMemory,
      kdfParallelism: request.kdfParallelism,
      keys: keyMaterial.keys,
    })
    keyMaterial.userKey.fill(0)
    if (!result.success) return result
    return resultCreate(undefined)
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

  const syncCacheSnapshotDataRead = async (
    op: string,
  ): Promise<Result<v.InferOutput<typeof extensionSyncCacheSnapshotSchema> | null>> => {
    const cacheResult = await options.storage.syncCacheLoad()
    if (!cacheResult.success) return cacheResult
    if (cacheResult.data === null || cacheResult.data.snapshot === null) return resultCreate(null)
    const snapshotBytesResult = await options.vaultSession.encryptedPayloadDecrypt(cacheResult.data.snapshot)
    if (!snapshotBytesResult.success) return snapshotBytesResult
    const snapshotValueResult = textDecode(op, snapshotBytesResult.data)
    if (!snapshotValueResult.success) return snapshotValueResult
    const snapshotParsed = v.safeParse(extensionSyncCacheSnapshotSchema, snapshotValueResult.data)
    if (!snapshotParsed.success) return internal(op, "Stored sync profile is invalid.")
    return resultCreate(snapshotParsed.output)
  }

  const syncProfileRead = async (op: string): Promise<Result<ExtensionSyncSnapshot["profile"] | null>> => {
    const snapshotResult = await syncCacheSnapshotDataRead(op)
    if (!snapshotResult.success) return snapshotResult
    return resultCreate(snapshotResult.data?.profile ?? null)
  }

  const syncCollectionsRead = async (op: string): Promise<Result<ExtensionSyncSnapshot["collections"] | null>> => {
    const snapshotResult = await syncCacheSnapshotDataRead(op)
    if (!snapshotResult.success) return snapshotResult
    return resultCreate(snapshotResult.data?.collections ?? null)
  }

  const collectionOrganizationReadAuthorize = async (
    op: string,
    organizationId: string,
  ): Promise<Result<ExtensionSyncSnapshot["profile"]["organizations"][number]>> => {
    const profileResult = await syncProfileRead(op)
    if (!profileResult.success) return profileResult
    const organization = profileResult.data?.organizations.find(
      (entry) => entry.id === organizationId && entry.status === 2,
    )
    if (organization === undefined) {
      return resultErrorCreate(op, "Organization access is unavailable.", {
        code: "platform.forbidden",
        statusCode: 403,
      })
    }
    return resultCreate(organization)
  }

  const collectionOrganizationFullAccess = (
    organization: ExtensionSyncSnapshot["profile"]["organizations"][number],
  ): boolean => organization.accessAll === true || organization.type === 0 || organization.type === 1

  const collectionOrganizationPermissionAllowed = (
    organization: ExtensionSyncSnapshot["profile"]["organizations"][number],
    permission: "createNewCollections" | "editAnyCollection" | "deleteAnyCollection",
  ): boolean => collectionOrganizationFullAccess(organization) || organization.permissions?.[permission] === true

  const collectionReadPermissionAuthorize = (
    op: string,
    collection: ExtensionCollection,
    organization: ExtensionSyncSnapshot["profile"]["organizations"][number],
  ): Result<void> => {
    if (collection.assigned !== false || collectionOrganizationFullAccess(organization)) return resultCreate(undefined)
    return resultErrorCreate(op, "Collection read permission was denied.", {
      code: "platform.forbidden",
      statusCode: 403,
    })
  }

  const collectionManagePermissionAuthorize = (
    op: string,
    collection: ExtensionCollection,
    organization: ExtensionSyncSnapshot["profile"]["organizations"][number],
    permission: "editAnyCollection" | "deleteAnyCollection",
  ): Result<void> => {
    if (
      collection.readOnly === true ||
      collection.unmanaged === true ||
      (collection.hidePasswords === true && collection.manage !== true)
    ) {
      return resultErrorCreate(op, "Collection manage permission was denied.", {
        code: "platform.forbidden",
        statusCode: 403,
      })
    }
    if (collectionOrganizationPermissionAllowed(organization, permission)) return resultCreate(undefined)
    if (collection.assigned === false || collection.manage !== true) {
      return resultErrorCreate(op, "Collection manage permission was denied.", {
        code: "platform.forbidden",
        statusCode: 403,
      })
    }
    return resultCreate(undefined)
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
    const foldersResult =
      envelope.folders.length === 0 ? resultCreate([]) : await options.vaultSession.foldersDecrypt(envelope.folders)
    if (!foldersResult.success) return foldersResult
    const collectionsResult =
      envelope.collections.length === 0
        ? resultCreate([])
        : await options.vaultSession.collectionsDecrypt(envelope.collections)
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

  const organizationCipherReadAuthorize = async (
    cipher: BitwardenEncryptedCipher,
    op: string,
  ): Promise<Result<void>> => {
    if (cipher.organizationId === undefined || cipher.organizationId === null) return resultCreate(undefined)

    const cacheResult = await options.storage.syncCacheLoad()
    if (!cacheResult.success) return cacheResult
    if (cacheResult.data === null || cacheResult.data.snapshot === null) {
      return resultErrorCreate(op, "Organization access is unavailable.", {
        code: "platform.forbidden",
        statusCode: 403,
      })
    }
    const snapshotBytesResult = await options.vaultSession.encryptedPayloadDecrypt(cacheResult.data.snapshot)
    if (!snapshotBytesResult.success) return snapshotBytesResult
    const snapshotValueResult = textDecode(op, snapshotBytesResult.data)
    if (!snapshotValueResult.success) return snapshotValueResult
    const snapshotParsed = v.safeParse(extensionSyncCacheSnapshotSchema, snapshotValueResult.data)
    if (!snapshotParsed.success) return internal(op, "Stored sync profile is invalid.")
    const organization = snapshotParsed.output.profile.organizations.find(
      (entry) => entry.id === cipher.organizationId && entry.status === 2,
    )
    if (organization === undefined) {
      return resultErrorCreate(op, "Cipher is not accessible to this account.", {
        code: "platform.forbidden",
        statusCode: 403,
      })
    }
    return resultCreate(undefined)
  }

  const mutationAuthRequire = async (op: string): Promise<Result<void>> => {
    if (!options.vaultSession.isUnlocked()) return unauthorized(op)
    const authResult = await options.storage.authSessionLoad()
    if (!authResult.success) return authResult
    if (authResult.data === null) return unauthorized(op)
    return resultCreate(undefined)
  }

  const organizationCipherMutationAuthorize = async (
    op: string,
    organizationId: string | null | undefined,
  ): Promise<Result<void>> => {
    if (organizationId === undefined || organizationId === null) return resultCreate(undefined)
    const profileResult = await syncProfileRead(op)
    if (!profileResult.success) return profileResult
    if (
      profileResult.data?.organizations.some(
        (organization) => organization.id === organizationId && organization.status === 2,
      )
    )
      return resultCreate(undefined)
    return resultErrorCreate(op, "Organization access is unavailable.", {
      code: "platform.forbidden",
      statusCode: 403,
    })
  }

  const cipherCollectionAssignmentAuthorize = async (
    op: string,
    organizationId: string | null | undefined,
    collectionIds: readonly string[],
  ): Promise<Result<void>> => {
    const organizationResult = await organizationCipherMutationAuthorize(op, organizationId)
    if (!organizationResult.success) return organizationResult
    if (collectionIds.length === 0) return resultCreate(undefined)
    const collectionsResult = await syncCollectionsRead(op)
    if (!collectionsResult.success) return collectionsResult
    if (collectionsResult.data === null) {
      return resultErrorCreate(op, "Organization collections are unavailable.", {
        code: "platform.forbidden",
        statusCode: 403,
      })
    }
    for (const collectionId of collectionIds) {
      const collection = collectionsResult.data.find(
        (entry) => entry.id === collectionId && entry.organizationId === organizationId,
      )
      if (collection === undefined || collection.readOnly === true || collection.unmanaged === true) {
        return resultErrorCreate(op, "Collection write permission was denied.", {
          code: "platform.forbidden",
          statusCode: 403,
        })
      }
    }
    return resultCreate(undefined)
  }

  const cipherMutationPermissionAuthorize = (
    op: string,
    cipher: ExtensionCipher,
    permission: "edit" | "delete" | "restore",
  ): Result<void> => {
    if (cipher.edit === false) {
      return resultErrorCreate(op, "Cipher is read-only.", { code: "platform.forbidden", statusCode: 403 })
    }
    if (permission === "delete" && cipher.permissions?.delete === false) {
      return resultErrorCreate(op, "Cipher delete permission was denied.", {
        code: "platform.forbidden",
        statusCode: 403,
      })
    }
    if (permission === "restore" && cipher.permissions?.restore === false) {
      return resultErrorCreate(op, "Cipher restore permission was denied.", {
        code: "platform.forbidden",
        statusCode: 403,
      })
    }
    return resultCreate(undefined)
  }

  const cipherMutationTargetRead = async (
    op: string,
    cipherId: string,
  ): Promise<Result<{ encrypted: BitwardenEncryptedCipher; plain: ExtensionCipher }>> => {
    const authResult = await mutationAuthRequire(op)
    if (!authResult.success) return authResult
    const cipherRead = options.apiClient.cipherRead
    if (cipherRead === undefined) return internal(op, "Cipher read API is unavailable.")
    const responseResult = await protectedRequest((accessToken) => cipherRead(cipherId, { accessToken }))
    if (!responseResult.success) return responseResult
    const encryptedResult = v.safeParse(bitwardenEncryptedCipherSchema, responseResult.data)
    if (!encryptedResult.success) return internal(op, "Cipher response is invalid.")
    if (encryptedResult.output.id !== cipherId)
      return internal(op, "Cipher response does not match the requested cipher.")
    if (!cipherReadPermissionAllowed(encryptedResult.output)) {
      return resultErrorCreate(op, "Cipher read permission was denied.", {
        code: "platform.forbidden",
        statusCode: 403,
      })
    }
    const organizationResult = await organizationCipherReadAuthorize(encryptedResult.output, op)
    if (!organizationResult.success) return organizationResult
    const decryptedResult = await options.vaultSession.cipherDecrypt(encryptedResult.output)
    if (!decryptedResult.success) return decryptedResult
    const plainResult = v.safeParse(extensionCipherSchema, decryptedResult.data)
    if (!plainResult.success) return internal(op, "Decrypted cipher response is invalid.")
    return resultCreate({ encrypted: encryptedResult.output, plain: plainResult.output })
  }

  const cipherMutationEncryptedResponseRead = (
    op: string,
    response: unknown,
    cipherId?: string,
    cipherType?: ExtensionCipher["type"],
  ): Result<BitwardenEncryptedCipher> => {
    const encryptedResult = v.safeParse(bitwardenEncryptedCipherSchema, response)
    if (!encryptedResult.success) return internal(op, "Cipher mutation response is invalid.")
    if (cipherId !== undefined && encryptedResult.output.id !== cipherId)
      return internal(op, "Cipher mutation response does not match the requested cipher.")
    if (cipherType !== undefined && encryptedResult.output.type !== cipherType)
      return internal(op, "Cipher mutation response type does not match the request.")
    return resultCreate(encryptedResult.output)
  }

  const cipherMutationResponseRead = async (
    op: string,
    response: unknown,
    cipherId?: string,
    cipherType?: ExtensionCipher["type"],
  ): Promise<Result<ExtensionCipher>> => {
    const encryptedResult = cipherMutationEncryptedResponseRead(op, response, cipherId, cipherType)
    if (!encryptedResult.success) return encryptedResult
    const decryptedResult = await options.vaultSession.cipherDecrypt(encryptedResult.data)
    if (!decryptedResult.success) return decryptedResult
    const plainResult = v.safeParse(extensionCipherSchema, decryptedResult.data)
    if (!plainResult.success) return internal(op, "Decrypted cipher mutation response is invalid.")
    return resultCreate(plainResult.output)
  }

  const mutationSyncRun = async (): Promise<Result<void>> => {
    const syncResult = await syncRun(true)
    if (!syncResult.success) return syncResult
    return resultCreate(undefined)
  }

  const folderMutationResponseRead = async (
    op: string,
    response: unknown,
    folderId?: string,
  ): Promise<Result<ExtensionFolder>> => {
    const encryptedResult = v.safeParse(bitwardenEncryptedFolderSchema, response)
    if (!encryptedResult.success) return internal(op, "Folder mutation response is invalid.")
    if (folderId !== undefined && encryptedResult.output.id !== folderId)
      return internal(op, "Folder mutation response does not match the requested folder.")
    const decryptedResult = await options.vaultSession.folderDecrypt(encryptedResult.output)
    if (!decryptedResult.success) return decryptedResult
    const plainResult = v.safeParse(extensionFolderSchema, decryptedResult.data)
    if (!plainResult.success) return internal(op, "Decrypted folder mutation response is invalid.")
    return resultCreate(plainResult.output)
  }

  const folderTargetRead = async (op: string, folderId: string): Promise<Result<ExtensionFolder>> => {
    const authResult = await mutationAuthRequire(op)
    if (!authResult.success) return authResult
    const apiRead = options.apiClient.folderRead
    if (apiRead === undefined) return internal(op, "Folder read API is unavailable.")
    const responseResult = await protectedRequest((accessToken) => apiRead(folderId, { accessToken }))
    if (!responseResult.success) return responseResult
    return folderMutationResponseRead(op, responseResult.data, folderId)
  }

  const folderDtoRead = (op: string, folder: ExtensionFolder): Result<ExtensionBackgroundFolderDto> => {
    const parsed = v.safeParse(extensionBackgroundFolderDtoSchema, extensionBackgroundFolderDtoCreate(folder))
    if (!parsed.success) return internal(op, "Folder response is invalid.")
    return resultCreate(parsed.output)
  }

  const folderList = (request: unknown): Promise<Result<ExtensionBackgroundFolderListResult>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.folderList"
      const parsedRequest = v.safeParse(extensionFolderListRequestSchema, request)
      if (!parsedRequest.success)
        return invalidRequest(op, "Folder list request is invalid.", v.summarize(parsedRequest.issues))
      const authResult = await mutationAuthRequire(op)
      if (!authResult.success) return authResult
      const apiList = options.apiClient.folderList
      if (apiList === undefined) return internal(op, "Folder list API is unavailable.")
      const responseResult = await protectedRequest((accessToken) => apiList({ accessToken }))
      if (!responseResult.success) return responseResult
      const responseParsed = v.safeParse(bitwardenFolderListResponseSchema, responseResult.data)
      if (!responseParsed.success) return internal(op, "Folder list response is invalid.")
      const folders: ExtensionBackgroundFolderListResult = []
      for (const encryptedFolder of responseParsed.output.data) {
        const folderResult = await folderMutationResponseRead(op, encryptedFolder)
        if (!folderResult.success) return folderResult
        const dtoResult = folderDtoRead(op, folderResult.data)
        if (!dtoResult.success) return dtoResult
        folders.push(dtoResult.data)
      }
      const resultParsed = v.safeParse(extensionBackgroundFolderListResultSchema, folders)
      if (!resultParsed.success) return internal(op, "Folder list response is invalid.")
      return resultCreate(resultParsed.output)
    })

  const folderRead = (request: unknown): Promise<Result<ExtensionBackgroundFolderDto>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.folderRead"
      const parsedRequest = v.safeParse(extensionFolderReadRequestSchema, request)
      if (!parsedRequest.success)
        return invalidRequest(op, "Folder read request is invalid.", v.summarize(parsedRequest.issues))
      const folderResult = await folderTargetRead(op, parsedRequest.output.folderId)
      if (!folderResult.success) return folderResult
      return folderDtoRead(op, folderResult.data)
    })

  const folderCreate = (request: unknown): Promise<Result<ExtensionBackgroundFolderDto>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.folderCreate"
      const parsedRequest = v.safeParse(extensionFolderCreateRequestSchema, request)
      if (!parsedRequest.success)
        return invalidRequest(op, "Folder create request is invalid.", v.summarize(parsedRequest.issues))
      const authResult = await mutationAuthRequire(op)
      if (!authResult.success) return authResult
      const encryptedResult = await options.vaultSession.folderEncrypt(parsedRequest.output.folder)
      if (!encryptedResult.success) return encryptedResult
      const apiCreate = options.apiClient.folderCreate
      if (apiCreate === undefined) return internal(op, "Folder create API is unavailable.")
      const createResult = await protectedRequest((accessToken) =>
        apiCreate({ id: encryptedResult.data.id, name: encryptedResult.data.name }, { accessToken }),
      )
      if (!createResult.success) return createResult
      const folderResult = await folderMutationResponseRead(op, createResult.data)
      if (!folderResult.success) return folderResult
      const syncResult = await mutationSyncRun()
      if (!syncResult.success) return syncResult
      return folderDtoRead(op, folderResult.data)
    })

  const folderUpdate = (request: unknown): Promise<Result<ExtensionBackgroundFolderDto>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.folderUpdate"
      const parsedRequest = v.safeParse(extensionFolderUpdateRequestSchema, request)
      if (!parsedRequest.success)
        return invalidRequest(op, "Folder update request is invalid.", v.summarize(parsedRequest.issues))
      const targetResult = await folderTargetRead(op, parsedRequest.output.folderId)
      if (!targetResult.success) return targetResult
      if (parsedRequest.output.folder.id !== parsedRequest.output.folderId)
        return invalidRequest(op, "Folder update request ID does not match the target folder.")
      const encryptedResult = await options.vaultSession.folderEncrypt(parsedRequest.output.folder)
      if (!encryptedResult.success) return encryptedResult
      const apiUpdate = options.apiClient.folderUpdate
      if (apiUpdate === undefined) return internal(op, "Folder update API is unavailable.")
      const updateResult = await protectedRequest((accessToken) =>
        apiUpdate(
          parsedRequest.output.folderId,
          { id: encryptedResult.data.id, name: encryptedResult.data.name },
          { accessToken },
        ),
      )
      if (!updateResult.success) return updateResult
      const folderResult = await folderMutationResponseRead(op, updateResult.data, parsedRequest.output.folderId)
      if (!folderResult.success) return folderResult
      const syncResult = await mutationSyncRun()
      if (!syncResult.success) return syncResult
      return folderDtoRead(op, folderResult.data)
    })

  const folderDelete = (request: unknown): Promise<Result<void>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.folderDelete"
      const parsedRequest = v.safeParse(extensionFolderDeleteRequestSchema, request)
      if (!parsedRequest.success)
        return invalidRequest(op, "Folder delete request is invalid.", v.summarize(parsedRequest.issues))
      const targetResult = await folderTargetRead(op, parsedRequest.output.folderId)
      if (!targetResult.success) return targetResult
      const apiDelete = options.apiClient.folderDelete
      if (apiDelete === undefined) return internal(op, "Folder delete API is unavailable.")
      const deleteResult = await protectedRequest((accessToken) =>
        apiDelete(parsedRequest.output.folderId, { accessToken }),
      )
      if (!deleteResult.success) return deleteResult
      return mutationSyncRun()
    })

  const collectionDtoRead = (op: string, collection: ExtensionCollection): Result<ExtensionBackgroundCollectionDto> => {
    const parsed = v.safeParse(
      extensionBackgroundCollectionDtoSchema,
      extensionBackgroundCollectionDtoCreate(collection),
    )
    if (!parsed.success) return internal(op, "Collection response is invalid.")
    return resultCreate(parsed.output)
  }

  const collectionMutationResponseRead = async (
    op: string,
    response: unknown,
    organizationId: string,
    collectionId?: string,
  ): Promise<Result<ExtensionCollection>> => {
    const encryptedResult = v.safeParse(bitwardenEncryptedCollectionSchema, response)
    if (!encryptedResult.success) return internal(op, "Collection mutation response is invalid.")
    if (encryptedResult.output.organizationId !== organizationId)
      return resultErrorCreate(op, "Collection response organization does not match the request.", {
        code: "platform.forbidden",
        statusCode: 403,
      })
    if (collectionId !== undefined && encryptedResult.output.id !== collectionId)
      return internal(op, "Collection mutation response does not match the requested collection.")
    const decryptedResult = await options.vaultSession.collectionDecrypt(encryptedResult.output)
    if (!decryptedResult.success) return decryptedResult
    const parsed = v.safeParse(extensionCollectionSchema, decryptedResult.data)
    if (!parsed.success) return internal(op, "Decrypted collection mutation response is invalid.")
    if (parsed.output.organizationId !== organizationId)
      return resultErrorCreate(op, "Collection response organization does not match the request.", {
        code: "platform.forbidden",
        statusCode: 403,
      })
    if (collectionId !== undefined && parsed.output.id !== collectionId)
      return internal(op, "Decrypted collection response does not match the requested collection.")
    return resultCreate(parsed.output)
  }

  const collectionMutationRequestCreate = (
    op: string,
    collection: BitwardenEncryptedCollection,
    groups: BitwardenCollectionMutationRequest["groups"],
    users: BitwardenCollectionMutationRequest["users"],
  ): Result<BitwardenCollectionMutationRequest> => {
    const parsed = v.safeParse(bitwardenCollectionMutationRequestSchema, {
      id: collection.id,
      name: collection.name,
      ...(collection.externalId === undefined ? {} : { externalId: collection.externalId }),
      groups,
      users,
    })
    if (!parsed.success)
      return invalidRequest(op, "Collection mutation request is invalid.", v.summarize(parsed.issues))
    return resultCreate(parsed.output)
  }

  const collectionTargetRead = async (
    op: string,
    organizationId: string,
    collectionId: string,
  ): Promise<
    Result<{ collection: ExtensionCollection; organization: ExtensionSyncSnapshot["profile"]["organizations"][number] }>
  > => {
    const authResult = await mutationAuthRequire(op)
    if (!authResult.success) return authResult
    const organizationResult = await collectionOrganizationReadAuthorize(op, organizationId)
    if (!organizationResult.success) return organizationResult
    const apiRead = options.apiClient.collectionRead
    if (apiRead === undefined) return internal(op, "Collection read API is unavailable.")
    const responseResult = await protectedRequest((accessToken) =>
      apiRead(organizationId, collectionId, { accessToken }),
    )
    if (!responseResult.success) return responseResult
    const collectionResult = await collectionMutationResponseRead(op, responseResult.data, organizationId, collectionId)
    if (!collectionResult.success) return collectionResult
    const permissionResult = collectionReadPermissionAuthorize(op, collectionResult.data, organizationResult.data)
    if (!permissionResult.success) return permissionResult
    return resultCreate({ collection: collectionResult.data, organization: organizationResult.data })
  }

  const collectionList = (request: unknown): Promise<Result<ExtensionBackgroundCollectionListResult>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.collectionList"
      const parsedRequest = v.safeParse(extensionCollectionListRequestSchema, request)
      if (!parsedRequest.success)
        return invalidRequest(op, "Collection list request is invalid.", v.summarize(parsedRequest.issues))
      const authResult = await mutationAuthRequire(op)
      if (!authResult.success) return authResult
      const organizationResult = await collectionOrganizationReadAuthorize(op, parsedRequest.output.organizationId)
      if (!organizationResult.success) return organizationResult
      const apiList = options.apiClient.collectionList
      if (apiList === undefined) return internal(op, "Collection list API is unavailable.")
      const responseResult = await protectedRequest((accessToken) => apiList({ accessToken }))
      if (!responseResult.success) return responseResult
      const responseParsed = v.safeParse(bitwardenCollectionListResponseSchema, responseResult.data)
      if (!responseParsed.success) return internal(op, "Collection list response is invalid.")
      const collections: ExtensionBackgroundCollectionListResult = []
      for (const encryptedCollection of responseParsed.output.data) {
        if (encryptedCollection.organizationId !== parsedRequest.output.organizationId) continue
        const collectionResult = await collectionMutationResponseRead(
          op,
          encryptedCollection,
          parsedRequest.output.organizationId,
        )
        if (!collectionResult.success) return collectionResult
        const permissionResult = collectionReadPermissionAuthorize(op, collectionResult.data, organizationResult.data)
        if (!permissionResult.success) continue
        const dtoResult = collectionDtoRead(op, collectionResult.data)
        if (!dtoResult.success) return dtoResult
        collections.push(dtoResult.data)
      }
      const resultParsed = v.safeParse(extensionBackgroundCollectionListResultSchema, collections)
      if (!resultParsed.success) return internal(op, "Collection list response is invalid.")
      return resultCreate(resultParsed.output)
    })

  const collectionRead = (request: unknown): Promise<Result<ExtensionBackgroundCollectionDto>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.collectionRead"
      const parsedRequest = v.safeParse(extensionCollectionReadRequestSchema, request)
      if (!parsedRequest.success)
        return invalidRequest(op, "Collection read request is invalid.", v.summarize(parsedRequest.issues))
      const targetResult = await collectionTargetRead(
        op,
        parsedRequest.output.organizationId,
        parsedRequest.output.collectionId,
      )
      if (!targetResult.success) return targetResult
      return collectionDtoRead(op, targetResult.data.collection)
    })

  const collectionCreate = (request: unknown): Promise<Result<ExtensionBackgroundCollectionDto>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.collectionCreate"
      const parsedRequest = v.safeParse(extensionCollectionCreateRequestSchema, request)
      if (!parsedRequest.success)
        return invalidRequest(op, "Collection create request is invalid.", v.summarize(parsedRequest.issues))
      const authResult = await mutationAuthRequire(op)
      if (!authResult.success) return authResult
      const organizationResult = await collectionOrganizationReadAuthorize(op, parsedRequest.output.organizationId)
      if (!organizationResult.success) return organizationResult
      if (!collectionOrganizationPermissionAllowed(organizationResult.data, "createNewCollections")) {
        return resultErrorCreate(op, "Collection create permission was denied.", {
          code: "platform.forbidden",
          statusCode: 403,
        })
      }
      if (parsedRequest.output.collection.organizationId !== parsedRequest.output.organizationId)
        return invalidRequest(op, "Collection organization does not match the request.")
      const encryptedResult = await options.vaultSession.collectionEncrypt(parsedRequest.output.collection)
      if (!encryptedResult.success) return encryptedResult
      const requestResult = collectionMutationRequestCreate(
        op,
        encryptedResult.data,
        parsedRequest.output.groups,
        parsedRequest.output.users,
      )
      if (!requestResult.success) return requestResult
      const apiCreate = options.apiClient.collectionCreate
      if (apiCreate === undefined) return internal(op, "Collection create API is unavailable.")
      const createResult = await protectedRequest((accessToken) =>
        apiCreate(parsedRequest.output.organizationId, requestResult.data, { accessToken }),
      )
      if (!createResult.success) return createResult
      const collectionResult = await collectionMutationResponseRead(
        op,
        createResult.data,
        parsedRequest.output.organizationId,
      )
      if (!collectionResult.success) return collectionResult
      const syncResult = await mutationSyncRun()
      if (!syncResult.success) return syncResult
      return collectionDtoRead(op, collectionResult.data)
    })

  const collectionUpdate = (request: unknown): Promise<Result<ExtensionBackgroundCollectionDto>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.collectionUpdate"
      const parsedRequest = v.safeParse(extensionCollectionUpdateRequestSchema, request)
      if (!parsedRequest.success)
        return invalidRequest(op, "Collection update request is invalid.", v.summarize(parsedRequest.issues))
      const targetResult = await collectionTargetRead(
        op,
        parsedRequest.output.organizationId,
        parsedRequest.output.collectionId,
      )
      if (!targetResult.success) return targetResult
      const permissionResult = collectionManagePermissionAuthorize(
        op,
        targetResult.data.collection,
        targetResult.data.organization,
        "editAnyCollection",
      )
      if (!permissionResult.success) return permissionResult
      if (parsedRequest.output.collection.id !== parsedRequest.output.collectionId)
        return invalidRequest(op, "Collection update request ID does not match the target collection.")
      if (parsedRequest.output.collection.organizationId !== parsedRequest.output.organizationId)
        return invalidRequest(op, "Collection organization does not match the request.")
      const encryptedResult = await options.vaultSession.collectionEncrypt(parsedRequest.output.collection)
      if (!encryptedResult.success) return encryptedResult
      const requestResult = collectionMutationRequestCreate(
        op,
        encryptedResult.data,
        parsedRequest.output.groups,
        parsedRequest.output.users,
      )
      if (!requestResult.success) return requestResult
      const apiUpdate = options.apiClient.collectionUpdate
      if (apiUpdate === undefined) return internal(op, "Collection update API is unavailable.")
      const updateResult = await protectedRequest((accessToken) =>
        apiUpdate(parsedRequest.output.organizationId, parsedRequest.output.collectionId, requestResult.data, {
          accessToken,
        }),
      )
      if (!updateResult.success) return updateResult
      const collectionResult = await collectionMutationResponseRead(
        op,
        updateResult.data,
        parsedRequest.output.organizationId,
        parsedRequest.output.collectionId,
      )
      if (!collectionResult.success) return collectionResult
      const syncResult = await mutationSyncRun()
      if (!syncResult.success) return syncResult
      return collectionDtoRead(op, collectionResult.data)
    })

  const collectionDelete = (request: unknown): Promise<Result<void>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.collectionDelete"
      const parsedRequest = v.safeParse(extensionCollectionDeleteRequestSchema, request)
      if (!parsedRequest.success)
        return invalidRequest(op, "Collection delete request is invalid.", v.summarize(parsedRequest.issues))
      const targetResult = await collectionTargetRead(
        op,
        parsedRequest.output.organizationId,
        parsedRequest.output.collectionId,
      )
      if (!targetResult.success) return targetResult
      const permissionResult = collectionManagePermissionAuthorize(
        op,
        targetResult.data.collection,
        targetResult.data.organization,
        "deleteAnyCollection",
      )
      if (!permissionResult.success) return permissionResult
      const apiDelete = options.apiClient.collectionDelete
      if (apiDelete === undefined) return internal(op, "Collection delete API is unavailable.")
      const deleteResult = await protectedRequest((accessToken) =>
        apiDelete(parsedRequest.output.organizationId, parsedRequest.output.collectionId, { accessToken }),
      )
      if (!deleteResult.success) return deleteResult
      return mutationSyncRun()
    })

  const cipherDetailRead = (request: unknown): Promise<Result<ExtensionCipher>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.cipherDetailRead"
      const parsedRequest = v.safeParse(extensionCipherDetailReadRequestSchema, request)
      if (!parsedRequest.success)
        return invalidRequest(op, "Cipher detail read request is invalid.", v.summarize(parsedRequest.issues))
      const targetResult = await cipherMutationTargetRead(op, parsedRequest.output.cipherId)
      if (!targetResult.success) return targetResult
      const resultParsed = v.safeParse(extensionCipherDetailReadResultSchema, targetResult.data.plain)
      if (!resultParsed.success) return internal(op, "Decrypted cipher detail is invalid.")
      return resultCreate(resultParsed.output)
    })

  const attachmentUpload = (request: unknown): Promise<Result<ExtensionCipher>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.attachmentUpload"
      const parsed = v.safeParse(extensionAttachmentUploadRequestSchema, request)
      if (!parsed.success)
        return invalidRequest(op, "Attachment upload request is invalid.", v.summarize(parsed.issues))
      const targetResult = await cipherMutationTargetRead(op, parsed.output.cipherId)
      if (!targetResult.success) return targetResult
      const permissionResult = cipherMutationPermissionAuthorize(op, targetResult.data.plain, "edit")
      if (!permissionResult.success) return permissionResult
      const dataResult = base64Decode(parsed.output.dataBase64)
      if (!dataResult.success) return invalidRequest(op, "Attachment data is invalid.")
      const attachmentKeyResult = secureRandomBytes(64)
      if (!attachmentKeyResult.success) {
        dataResult.data.fill(0)
        return attachmentKeyResult
      }
      const attachmentKey = attachmentKeyResult.data
      let encryptedData: Uint8Array | undefined
      try {
        const encryptedDataResult = await bitwardenAttachmentBinaryEncrypt(dataResult.data, attachmentKey)
        if (!encryptedDataResult.success) return encryptedDataResult
        encryptedData = encryptedDataResult.data
        const temporaryId = `upload-${now()}`
        const attachmentCipherResult = await options.vaultSession.cipherEncrypt({
          ...targetResult.data.plain,
          attachments: [
            ...(targetResult.data.plain.attachments ?? []),
            { id: temporaryId, fileName: parsed.output.fileName, key: base64Encode(attachmentKey) },
          ],
        })
        if (!attachmentCipherResult.success) return attachmentCipherResult
        const encryptedAttachment = attachmentCipherResult.data.attachments?.find((entry) => entry.id === temporaryId)
        if (encryptedAttachment?.key === undefined || encryptedAttachment.key === null) {
          return internal(op, "Attachment key could not be encrypted.")
        }
        const apiUpload = options.apiClient.attachmentUpload
        if (apiUpload === undefined) return internal(op, "Attachment upload API is unavailable.")
        const uploadResult = await protectedRequest((accessToken) =>
          apiUpload(
            parsed.output.cipherId,
            encryptedData as Uint8Array,
            encryptedAttachment.fileName,
            encryptedAttachment.key as string,
            { accessToken },
          ),
        )
        if (!uploadResult.success) return uploadResult
        const responseResult = await cipherMutationResponseRead(
          op,
          uploadResult.data,
          parsed.output.cipherId,
          targetResult.data.plain.type,
        )
        if (!responseResult.success) return responseResult
        const syncResult = await mutationSyncRun()
        if (!syncResult.success) return syncResult
        return responseResult
      } finally {
        dataResult.data.fill(0)
        attachmentKey.fill(0)
        encryptedData?.fill(0)
      }
    })

  const attachmentDownload = (request: unknown): Promise<Result<ExtensionAttachmentDownloadResult>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.attachmentDownload"
      const parsed = v.safeParse(extensionAttachmentDownloadRequestSchema, request)
      if (!parsed.success)
        return invalidRequest(op, "Attachment download request is invalid.", v.summarize(parsed.issues))
      const targetResult = await cipherMutationTargetRead(op, parsed.output.cipherId)
      if (!targetResult.success) return targetResult
      const attachment = targetResult.data.plain.attachments?.find((entry) => entry.id === parsed.output.attachmentId)
      if (attachment === undefined || attachment.key === undefined || attachment.key === null) {
        return invalidRequest(op, "Attachment could not be found.")
      }
      const keyResult = base64Decode(attachment.key)
      if (!keyResult.success) return internal(op, "Attachment key is invalid.")
      const apiDownload = options.apiClient.attachmentDownload
      if (apiDownload === undefined) {
        keyResult.data.fill(0)
        return internal(op, "Attachment download API is unavailable.")
      }
      let encryptedData: Uint8Array | undefined
      let plainData: Uint8Array | undefined
      try {
        const downloadResult = await protectedRequest((accessToken) =>
          apiDownload(parsed.output.cipherId, parsed.output.attachmentId, { accessToken }),
        )
        if (!downloadResult.success) return downloadResult
        encryptedData = downloadResult.data
        const decryptResult = await bitwardenAttachmentBinaryDecrypt(encryptedData, keyResult.data)
        if (!decryptResult.success) return decryptResult
        plainData = decryptResult.data
        return resultCreate({ fileName: attachment.fileName, dataBase64: base64Encode(plainData) })
      } finally {
        keyResult.data.fill(0)
        encryptedData?.fill(0)
        plainData?.fill(0)
      }
    })

  const attachmentDelete = (request: unknown): Promise<Result<ExtensionCipher>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.attachmentDelete"
      const parsed = v.safeParse(extensionAttachmentDeleteRequestSchema, request)
      if (!parsed.success)
        return invalidRequest(op, "Attachment delete request is invalid.", v.summarize(parsed.issues))
      const targetResult = await cipherMutationTargetRead(op, parsed.output.cipherId)
      if (!targetResult.success) return targetResult
      const permissionResult = cipherMutationPermissionAuthorize(op, targetResult.data.plain, "edit")
      if (!permissionResult.success) return permissionResult
      if (!targetResult.data.plain.attachments?.some((entry) => entry.id === parsed.output.attachmentId)) {
        return invalidRequest(op, "Attachment could not be found.")
      }
      const apiDelete = options.apiClient.attachmentDelete
      if (apiDelete === undefined) return internal(op, "Attachment delete API is unavailable.")
      const deleteResult = await protectedRequest((accessToken) =>
        apiDelete(parsed.output.cipherId, parsed.output.attachmentId, { accessToken }),
      )
      if (!deleteResult.success) return deleteResult
      const responseResult = await cipherMutationResponseRead(
        op,
        deleteResult.data.cipher,
        parsed.output.cipherId,
        targetResult.data.plain.type,
      )
      if (!responseResult.success) return responseResult
      const syncResult = await mutationSyncRun()
      if (!syncResult.success) return syncResult
      return responseResult
    })

  const vaultSearch = (request: unknown): Promise<Result<ExtensionVaultSearchResult>> => {
    const op = "extensionBackgroundService.vaultSearch"
    const parsed = v.safeParse(extensionVaultSearchRequestSchema, request)
    if (!parsed.success)
      return Promise.resolve(invalidRequest(op, "Vault search request is invalid.", v.summarize(parsed.issues)))
    const searchRequest: ExtensionVaultSearchRequest = parsed.output
    return syncSnapshotLoad().then((snapshotResult) => {
      if (!snapshotResult.success) return snapshotResult
      if (snapshotResult.data === null) return unavailable(op, "Vault data is unavailable.")
      return resultCreate(extensionVaultSearch(snapshotResult.data, searchRequest))
    })
  }

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

  const biometricCapabilityReadRun = async (): Promise<Result<ExtensionBiometricCapability>> => {
    if (options.biometric === undefined) return resultCreate({ status: "unsupported" })
    return options.biometric.capabilityRead()
  }

  const biometricCapabilityRead = (): Promise<Result<ExtensionBiometricCapability>> =>
    operationRun(biometricCapabilityReadRun)

  const biometricUserContextRead = async (
    op: string,
  ): Promise<Result<{ userId: string; encryptedPrivateKey: string | undefined }>> => {
    const authResult = await options.storage.authSessionLoad()
    if (!authResult.success) return authResult
    const email = authResult.data?.email
    const parsedEmail = v.safeParse(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128)), email)
    if (!parsedEmail.success) return unauthorized(op)
    return resultCreate({
      userId: parsedEmail.output.toLowerCase(),
      encryptedPrivateKey: authResult.data?.encryptedPrivateKey ?? undefined,
    })
  }

  const biometricStatusRead = (): Promise<Result<ExtensionBiometricStatus>> =>
    operationRun(async () => {
      const capabilityResult = await biometricCapabilityReadRun()
      if (!capabilityResult.success) return capabilityResult
      const authResult = await options.storage.authSessionLoad()
      if (!authResult.success) return authResult
      const email = authResult.data?.email
      const parsedEmail = v.safeParse(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128)), email)
      if (!parsedEmail.success) return resultCreate({ capability: capabilityResult.data, enrolled: false })
      const enrollmentResult = await options.storage.biometricEnrollmentLoad(parsedEmail.output.toLowerCase())
      if (!enrollmentResult.success) return enrollmentResult
      return resultCreate({ capability: capabilityResult.data, enrolled: enrollmentResult.data !== null })
    })

  const biometricEnroll = (): Promise<Result<{ enrolled: true }>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.biometricEnroll"
      const biometric = options.biometric
      if (biometric === undefined) return unavailable(op, "Biometric unlock is unavailable.")
      if (!options.vaultSession.isUnlocked()) {
        return resultErrorCreate(op, "Vault is locked.", { code: "platform.unauthorized", statusCode: 401 })
      }
      const contextResult = await biometricUserContextRead(op)
      if (!contextResult.success) return contextResult
      const enrollResult = await options.vaultSession.userKeyUse((key) =>
        biometric.enroll(contextResult.data.userId, key),
      )
      if (!enrollResult.success) return enrollResult
      return resultCreate({ enrolled: true })
    })

  const biometricRevoke = (): Promise<Result<{ enrolled: false }>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.biometricRevoke"
      if (options.biometric === undefined) return unavailable(op, "Biometric unlock is unavailable.")
      const contextResult = await biometricUserContextRead(op)
      if (!contextResult.success) return contextResult
      const revokeResult = await options.biometric.revoke(contextResult.data.userId)
      if (!revokeResult.success) return revokeResult
      return resultCreate({ enrolled: false })
    })

  const biometricUnlock = (): Promise<Result<ExtensionLoginResult>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.biometricUnlock"
      const biometric = options.biometric
      if (biometric === undefined) return unavailable(op, "Biometric unlock is unavailable.")
      if (refreshInFlight !== null) await refreshInFlight
      const contextResult = await biometricUserContextRead(op)
      if (!contextResult.success) return contextResult
      if (options.vaultSession.isUnlocked()) return resultCreate({ status: "authenticated" })
      const userKeyResult = await biometric.unwrap(contextResult.data.userId)
      if (!userKeyResult.success) return userKeyResult
      try {
        const unlockResult = await options.vaultSession.unlockWithUserKey(
          userKeyResult.data,
          contextResult.data.encryptedPrivateKey,
        )
        if (!unlockResult.success) return unlockResult
      } finally {
        if (userKeyResult.data instanceof Uint8Array) userKeyResult.data.fill(0)
      }
      pendingLoginChallenge = null
      const timeoutResult = await timeoutReconcile()
      if (!timeoutResult.success) return timeoutResult
      return resultCreate({ status: "authenticated" })
    })

  const passwordLogin = (request: unknown): Promise<Result<ExtensionLoginResult>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.passwordLogin"
      const parsed = v.safeParse(extensionLoginRequestSchema, request)
      if (!parsed.success) return invalidRequest(op, "Password login request is invalid.", v.summarize(parsed.issues))
      pendingLoginChallenge = null
      if (refreshInFlight !== null) await refreshInFlight
      const lockResult = await options.vaultSession.lock()
      if (!lockResult.success) return lockResult
      const clearAlarmResult = await alarmClear()
      if (!clearAlarmResult.success) return clearAlarmResult
      const contextResult = await passwordAuthenticationContextCreate(parsed.output)
      if (!contextResult.success) return contextResult
      const authResult = await passwordAuthenticate(contextResult.data)
      if (!authResult.success) {
        const challengeResult = loginChallengeRead(authResult)
        if (!challengeResult.success) return authResult
        return pendingLoginChallengeCreate("login", contextResult.data, null, challengeResult.data)
      }
      const saveResult = await options.storage.authSessionSave(authResult.data.authSession)
      if (!saveResult.success) return saveResult
      return resultCreate({ status: "authenticated" })
    })

  const refreshToken = (): Promise<Result<ExtensionAuthSession>> => refreshTokenCoordinated(true)

  const unlock = (request: unknown): Promise<Result<ExtensionLoginResult>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.unlock"
      const parsed = v.safeParse(extensionUnlockRequestSchema, request)
      if (!parsed.success) return invalidRequest(op, "Vault unlock request is invalid.", v.summarize(parsed.issues))
      if (refreshInFlight !== null) await refreshInFlight
      const previousAuthResult = await options.storage.authSessionLoad()
      if (!previousAuthResult.success) return previousAuthResult
      let email = parsed.output.email
      if (email === undefined) {
        email = previousAuthResult.data?.email ?? undefined
      }
      if (email === undefined) return invalidRequest(op, "Account email is required.")
      pendingLoginChallenge = null
      const contextResult = await passwordAuthenticationContextCreate({
        email,
        password: parsed.output.password,
        clientId: "browser",
        scope: "api offline_access",
        deviceIdentifier: "onewarden-extension",
        deviceName: "OneWarden",
        deviceType: "14",
      })
      if (!contextResult.success) return contextResult
      const authResult = await passwordAuthenticate(contextResult.data)
      if (!authResult.success) {
        const challengeResult = loginChallengeRead(authResult)
        if (!challengeResult.success) return authResult
        return pendingLoginChallengeCreate("unlock", contextResult.data, parsed.output.password, challengeResult.data)
      }
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
      const timeoutResult = await timeoutReconcile()
      if (!timeoutResult.success) return timeoutResult
      return resultCreate({ status: "authenticated" })
    })

  const loginChallengeSubmit = (input: unknown): Promise<Result<ExtensionLoginResult>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.loginChallengeSubmit"
      const parsed = v.safeParse(extensionLoginChallengeSubmitRequestSchema, input)
      if (!parsed.success) return invalidRequest(op, "Login challenge response is invalid.", v.summarize(parsed.issues))
      const pending = pendingLoginChallenge
      if (pending === null || pending.id !== parsed.output.challengeId) {
        return invalidRequest(op, "Login challenge is no longer available.")
      }
      if (pending.expiresAt <= now()) {
        pendingLoginChallenge = null
        return resultErrorCreate(op, "Login challenge expired. Start again.", {
          code: "auth.challenge-expired",
          statusCode: 401,
        })
      }
      const advertisedProviders = pending.challenge.TwoFactorProviders.map(Number)
      if (
        parsed.output.provider !== extensionLoginTwoFactorProvider.recoveryCode &&
        !advertisedProviders.includes(parsed.output.provider)
      ) {
        return invalidRequest(op, "The selected verification method is unavailable.")
      }
      const previousAuthResult = await options.storage.authSessionLoad()
      if (!previousAuthResult.success) return previousAuthResult
      const authResult = await passwordAuthenticate(pending.context, parsed.output)
      if (!authResult.success) {
        const nextChallengeResult = loginChallengeRead(authResult)
        if (!nextChallengeResult.success) return authResult
        pending.challenge = nextChallengeResult.data
        const publicResult = loginChallengePublicCreate(pending, authResult.errorMessage)
        if (!publicResult.success) return publicResult
        return resultCreate({ status: "challenge", challenge: publicResult.data })
      }
      const saveResult = await options.storage.authSessionSave(authResult.data.authSession)
      if (!saveResult.success) return saveResult
      if (pending.purpose === "unlock") {
        if (pending.password === null) return internal(op, "Unlock credentials are unavailable.")
        const unlockResult = await options.vaultSession.unlock({
          email: pending.context.request.email,
          password: pending.password,
          prelogin: pending.context.prelogin,
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
        const timeoutResult = await timeoutReconcile()
        if (!timeoutResult.success) return timeoutResult
      }
      pendingLoginChallenge = null
      return resultCreate({ status: "authenticated" })
    })

  const loginChallengeEmailSend = (input: unknown): Promise<Result<void>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.loginChallengeEmailSend"
      const parsed = v.safeParse(extensionLoginChallengeIdRequestSchema, input)
      if (!parsed.success) return invalidRequest(op, "Email challenge request is invalid.", v.summarize(parsed.issues))
      const pending = pendingLoginChallenge
      if (pending === null || pending.id !== parsed.output.challengeId || pending.expiresAt <= now()) {
        pendingLoginChallenge = null
        return resultErrorCreate(op, "Login challenge expired. Start again.", {
          code: "auth.challenge-expired",
          statusCode: 401,
        })
      }
      if (!pending.challenge.TwoFactorProviders.map(Number).includes(extensionLoginTwoFactorProvider.email)) {
        return invalidRequest(op, "Email verification is unavailable.")
      }
      if (options.apiClient.twoFactorEmailLoginSend === undefined) {
        return unavailable(op, "Email verification is unavailable.")
      }
      return options.apiClient.twoFactorEmailLoginSend({
        email: pending.context.request.email,
        deviceIdentifier: pending.context.request.deviceIdentifier,
        masterPasswordHash: pending.context.passwordHash,
      })
    })

  const loginChallengeCancel = (input: unknown): Promise<Result<void>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.loginChallengeCancel"
      const parsed = v.safeParse(extensionLoginChallengeIdRequestSchema, input)
      if (!parsed.success)
        return invalidRequest(op, "Login challenge cancellation is invalid.", v.summarize(parsed.issues))
      if (pendingLoginChallenge?.id === parsed.output.challengeId) pendingLoginChallenge = null
      return resultCreate(undefined)
    })

  const lock = (): Promise<Result<void>> =>
    operationRun(async () => {
      const lockResult = await options.vaultSession.lock()
      if (!lockResult.success) return lockResult
      pendingLoginChallenge = null
      credentialCapturePendingClear()
      return alarmClear()
    })

  const logout = (): Promise<Result<void>> =>
    operationRun(async () => {
      if (refreshInFlight !== null) await refreshInFlight
      const biometricContextResult =
        options.biometric === undefined ? null : await biometricUserContextRead("extensionBackgroundService.logout")
      const logoutResult = await options.vaultSession.logout()
      if (!logoutResult.success) return logoutResult
      if (options.biometric !== undefined && biometricContextResult?.success === true) {
        const revokeResult = await options.biometric.revoke(biometricContextResult.data.userId)
        if (!revokeResult.success) return revokeResult
      }
      pendingLoginChallenge = null
      credentialCapturePendingClear()
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

  const credentialCaptureAssess = async (
    request: unknown,
  ): Promise<Result<ExtensionCredentialCapturePrompt | null>> => {
    const op = "extensionBackgroundService.credentialCaptureAssess"
    const parsed = v.safeParse(extensionCredentialCaptureRequestSchema, request)
    if (!parsed.success) return invalidRequest(op, "Credential capture request is invalid.", v.summarize(parsed.issues))
    const snapshotResult = await syncSnapshotLoad()
    if (!snapshotResult.success) return snapshotResult
    if (snapshotResult.data === null) return unavailable(op, "Vault data is unavailable.")
    const currentTime = now()
    credentialCapturePendingExpiredDrop(currentTime)
    while (credentialCapturePending.size >= 50) {
      const first = credentialCapturePending.keys().next().value
      if (typeof first !== "string") break
      credentialCapturePendingDrop(first)
    }
    const id = extensionCredentialCaptureIdCreate()
    const plan = extensionCredentialCapturePlanCreate(
      parsed.output,
      extensionLoginCiphersRead(snapshotResult.data.ciphers),
      currentTime,
      extensionCredentialCaptureIdCreate,
    )
    if (plan === null) return resultCreate(null)
    const site = extensionCredentialCaptureSiteRead(parsed.output.url)
    if (site === null) return invalidRequest(op, "Credential capture URL is invalid.")
    if (plan.kind === "atRisk") return resultCreate({ id, kind: plan.kind, site, risk: plan.risk })
    credentialCapturePendingDrop(id)
    credentialCapturePending.set(id, {
      expiresAt: currentTime + 60_000,
      kind: plan.kind,
      cipher: plan.cipher,
    })
    return resultCreate({ id, kind: plan.kind, site, risk: null })
  }

  const credentialCaptureDiscard = (promptId: string): Result<void> => {
    credentialCapturePendingDrop(promptId)
    return resultCreate(undefined)
  }

  const credentialCaptureCommit = async (
    promptId: string,
    totp: string | null = null,
  ): Promise<Result<"saved" | "updated">> => {
    const op = "extensionBackgroundService.credentialCaptureCommit"
    const parsed = v.safeParse(v.pipe(v.string(), v.minLength(1), v.maxLength(192)), promptId)
    if (!parsed.success) return invalidRequest(op, "Credential capture prompt is invalid.")
    const pending = credentialCapturePending.get(parsed.output)
    credentialCapturePendingDrop(parsed.output)
    if (pending === undefined || pending.expiresAt <= now()) {
      return resultErrorCreate(op, "Credential capture prompt has expired.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    if (totp !== null) {
      const totpResult = totpSecretParse(totp)
      if (!totpResult.success) return invalidRequest(op, "Authenticator key is invalid.")
      pending.cipher = { ...pending.cipher, login: { ...pending.cipher.login, totp } }
    }
    const mutationResult =
      pending.kind === "add"
        ? await cipherCreate({ cipher: pending.cipher })
        : await cipherUpdate({ cipherId: pending.cipher.id, cipher: pending.cipher })
    if (!mutationResult.success) return mutationResult
    return resultCreate(pending.kind === "add" ? "saved" : "updated")
  }

  const cipherCreate = (request: unknown): Promise<Result<ExtensionCipher>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.cipherCreate"
      const parsed = v.safeParse(extensionCipherCreateRequestSchema, request)
      if (!parsed.success) return invalidRequest(op, "Cipher create request is invalid.", v.summarize(parsed.issues))
      const authResult = await mutationAuthRequire(op)
      if (!authResult.success) return authResult
      const cipher = parsed.output.cipher
      const organizationId = cipher.organizationId ?? null
      const collectionIds = cipher.collectionIds === undefined ? undefined : [...new Set(cipher.collectionIds)]
      if (organizationId === null && collectionIds !== undefined && collectionIds.length > 0) {
        return resultErrorCreate(op, "Personal ciphers cannot be assigned to collections.", {
          code: "platform.forbidden",
          statusCode: 403,
        })
      }
      const collectionAuthorizationResult = await cipherCollectionAssignmentAuthorize(
        op,
        organizationId,
        collectionIds ?? [],
      )
      if (!collectionAuthorizationResult.success) return collectionAuthorizationResult
      const encryptedResult = await options.vaultSession.cipherEncrypt(cipher)
      if (!encryptedResult.success) return encryptedResult
      const requestResult = extensionCipherMutationRequestCreate(encryptedResult.data, {
        ...(collectionIds === undefined ? {} : { collectionIds }),
      })
      if (!requestResult.success) return requestResult
      const apiCreate = options.apiClient.cipherCreate
      if (apiCreate === undefined) return internal(op, "Cipher create API is unavailable.")
      const createResult = await protectedRequest((accessToken) => apiCreate(requestResult.data, { accessToken }))
      if (!createResult.success) return createResult
      const responseResult = cipherMutationEncryptedResponseRead(op, createResult.data, undefined, cipher.type)
      if (!responseResult.success) return responseResult
      const syncResult = await mutationSyncRun()
      if (!syncResult.success) return syncResult
      return cipherMutationResponseRead(op, responseResult.data, undefined, cipher.type)
    })

  const cipherUpdate = (request: unknown): Promise<Result<ExtensionCipher>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.cipherUpdate"
      const parsed = v.safeParse(extensionCipherUpdateRequestSchema, request)
      if (!parsed.success) return invalidRequest(op, "Cipher update request is invalid.", v.summarize(parsed.issues))
      const targetResult = await cipherMutationTargetRead(op, parsed.output.cipherId)
      if (!targetResult.success) return targetResult
      const permissionResult = cipherMutationPermissionAuthorize(op, targetResult.data.plain, "edit")
      if (!permissionResult.success) return permissionResult
      const sourceCipher = parsed.output.cipher
      if (sourceCipher.id !== parsed.output.cipherId)
        return invalidRequest(op, "Cipher update request ID does not match the target cipher.")
      const targetOrganizationId = targetResult.data.plain.organizationId ?? null
      const sourceOrganizationId =
        sourceCipher.organizationId === undefined ? targetOrganizationId : sourceCipher.organizationId
      if (sourceOrganizationId !== targetOrganizationId) {
        return resultErrorCreate(op, "Cipher organization cannot be changed by an update.", {
          code: "platform.forbidden",
          statusCode: 403,
        })
      }
      const sourceCollectionIds =
        sourceCipher.collectionIds === undefined ? targetResult.data.plain.collectionIds : sourceCipher.collectionIds
      const sourceKey = sourceCipher.key === undefined ? targetResult.data.plain.key : sourceCipher.key
      const cipherResult = v.safeParse(extensionCipherSchema, {
        ...sourceCipher,
        organizationId: targetOrganizationId,
        ...(sourceCollectionIds === undefined ? {} : { collectionIds: sourceCollectionIds }),
        ...(sourceKey === undefined ? {} : { key: sourceKey }),
      })
      if (!cipherResult.success)
        return invalidRequest(op, "Cipher update request is invalid.", v.summarize(cipherResult.issues))
      const encryptedResult = await options.vaultSession.cipherEncrypt(cipherResult.output)
      if (!encryptedResult.success) return encryptedResult
      const requestResult = extensionCipherMutationRequestCreate(encryptedResult.data, {
        ...(sourceCollectionIds === undefined ? {} : { collectionIds: sourceCollectionIds }),
        lastKnownRevisionDate: sourceCipher.revisionDate,
      })
      if (!requestResult.success) return requestResult
      const apiUpdate = options.apiClient.cipherUpdate
      if (apiUpdate === undefined) return internal(op, "Cipher update API is unavailable.")
      const updateResult = await protectedRequest((accessToken) =>
        apiUpdate(parsed.output.cipherId, requestResult.data, { accessToken }),
      )
      if (!updateResult.success) return updateResult
      const syncResult = await mutationSyncRun()
      if (!syncResult.success) return syncResult
      return cipherMutationResponseRead(op, updateResult.data, parsed.output.cipherId, targetResult.data.plain.type)
    })

  const cipherPartial = (request: unknown): Promise<Result<ExtensionCipher>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.cipherPartial"
      const parsed = v.safeParse(extensionCipherPartialRequestSchema, request)
      if (!parsed.success)
        return invalidRequest(op, "Cipher partial update request is invalid.", v.summarize(parsed.issues))
      const targetResult = await cipherMutationTargetRead(op, parsed.output.cipherId)
      if (!targetResult.success) return targetResult
      const permissionResult = cipherMutationPermissionAuthorize(op, targetResult.data.plain, "edit")
      if (!permissionResult.success) return permissionResult
      const partial = {
        ...(parsed.output.favorite === undefined ? {} : { favorite: parsed.output.favorite }),
        ...(parsed.output.folderId === undefined ? {} : { folderId: parsed.output.folderId }),
      }
      const apiPartial = options.apiClient.cipherPartial
      if (apiPartial === undefined) return internal(op, "Cipher partial update API is unavailable.")
      const partialResult = await protectedRequest((accessToken) =>
        apiPartial(parsed.output.cipherId, partial, { accessToken }),
      )
      if (!partialResult.success) return partialResult
      const syncResult = await mutationSyncRun()
      if (!syncResult.success) return syncResult
      return cipherMutationResponseRead(op, partialResult.data, parsed.output.cipherId, targetResult.data.plain.type)
    })

  const cipherDelete = (request: unknown): Promise<Result<void>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.cipherDelete"
      const parsed = v.safeParse(extensionCipherDeleteRequestSchema, request)
      if (!parsed.success) return invalidRequest(op, "Cipher delete request is invalid.", v.summarize(parsed.issues))
      const targetResult = await cipherMutationTargetRead(op, parsed.output.cipherId)
      if (!targetResult.success) return targetResult
      const permissionResult = cipherMutationPermissionAuthorize(op, targetResult.data.plain, "delete")
      if (!permissionResult.success) return permissionResult
      const apiDelete = options.apiClient.cipherDelete
      if (apiDelete === undefined) return internal(op, "Cipher delete API is unavailable.")
      const deleteResult = await protectedRequest((accessToken) =>
        apiDelete(parsed.output.cipherId, parsed.output.hard, { accessToken }),
      )
      if (!deleteResult.success) return deleteResult
      return mutationSyncRun()
    })

  const cipherRestore = (request: unknown): Promise<Result<ExtensionCipher>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.cipherRestore"
      const parsed = v.safeParse(extensionCipherRestoreRequestSchema, request)
      if (!parsed.success) return invalidRequest(op, "Cipher restore request is invalid.", v.summarize(parsed.issues))
      const targetResult = await cipherMutationTargetRead(op, parsed.output.cipherId)
      if (!targetResult.success) return targetResult
      const permissionResult = cipherMutationPermissionAuthorize(op, targetResult.data.plain, "restore")
      if (!permissionResult.success) return permissionResult
      const apiRestore = options.apiClient.cipherRestore
      if (apiRestore === undefined) return internal(op, "Cipher restore API is unavailable.")
      const restoreResult = await protectedRequest((accessToken) => apiRestore(parsed.output.cipherId, { accessToken }))
      if (!restoreResult.success) return restoreResult
      const syncResult = await mutationSyncRun()
      if (!syncResult.success) return syncResult
      return cipherMutationResponseRead(op, restoreResult.data, parsed.output.cipherId, targetResult.data.plain.type)
    })

  const cipherArchive = (request: unknown): Promise<Result<ExtensionCipher>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.cipherArchive"
      const parsed = v.safeParse(extensionCipherArchiveRequestSchema, request)
      if (!parsed.success) return invalidRequest(op, "Cipher archive request is invalid.", v.summarize(parsed.issues))
      const targetResult = await cipherMutationTargetRead(op, parsed.output.cipherId)
      if (!targetResult.success) return targetResult
      const permissionResult = cipherMutationPermissionAuthorize(op, targetResult.data.plain, "edit")
      if (!permissionResult.success) return permissionResult
      const apiArchive = options.apiClient.cipherArchive
      if (apiArchive === undefined) return internal(op, "Cipher archive API is unavailable.")
      const archiveResult = await protectedRequest((accessToken) =>
        apiArchive(parsed.output.cipherId, parsed.output.archived, { accessToken }),
      )
      if (!archiveResult.success) return archiveResult
      const syncResult = await mutationSyncRun()
      if (!syncResult.success) return syncResult
      return cipherMutationResponseRead(op, archiveResult.data, parsed.output.cipherId, targetResult.data.plain.type)
    })

  const cipherMove = (request: unknown): Promise<Result<void>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.cipherMove"
      const parsed = v.safeParse(extensionCipherMoveRequestSchema, request)
      if (!parsed.success) return invalidRequest(op, "Cipher move request is invalid.", v.summarize(parsed.issues))
      for (const cipherId of parsed.output.ids) {
        const targetResult = await cipherMutationTargetRead(op, cipherId)
        if (!targetResult.success) return targetResult
        const permissionResult = cipherMutationPermissionAuthorize(op, targetResult.data.plain, "edit")
        if (!permissionResult.success) return permissionResult
      }
      const apiMove = options.apiClient.cipherMove
      if (apiMove === undefined) return internal(op, "Cipher move API is unavailable.")
      const moveResult = await protectedRequest((accessToken) =>
        apiMove(parsed.output.ids, parsed.output.folderId, { accessToken }),
      )
      if (!moveResult.success) return moveResult
      return mutationSyncRun()
    })

  const cipherCollectionsUpdate = (request: unknown): Promise<Result<ExtensionCipher>> =>
    operationRun(async () => {
      const op = "extensionBackgroundService.cipherCollectionsUpdate"
      const parsed = v.safeParse(extensionCipherCollectionsUpdateRequestSchema, request)
      if (!parsed.success)
        return invalidRequest(op, "Cipher collection assignment request is invalid.", v.summarize(parsed.issues))
      const targetResult = await cipherMutationTargetRead(op, parsed.output.cipherId)
      if (!targetResult.success) return targetResult
      const permissionResult = cipherMutationPermissionAuthorize(op, targetResult.data.plain, "edit")
      if (!permissionResult.success) return permissionResult
      const organizationId = targetResult.data.plain.organizationId ?? null
      if (organizationId === null) {
        return resultErrorCreate(op, "Personal ciphers cannot be assigned to collections.", {
          code: "platform.forbidden",
          statusCode: 403,
        })
      }
      const collectionAuthorizationResult = await cipherCollectionAssignmentAuthorize(
        op,
        organizationId,
        parsed.output.collectionIds,
      )
      if (!collectionAuthorizationResult.success) return collectionAuthorizationResult
      const apiCollectionsUpdate = options.apiClient.cipherCollectionsUpdate
      if (apiCollectionsUpdate === undefined) return internal(op, "Cipher collection assignment API is unavailable.")
      const collectionResult = await protectedRequest((accessToken) =>
        apiCollectionsUpdate(parsed.output.cipherId, parsed.output.collectionIds, { accessToken }),
      )
      if (!collectionResult.success) return collectionResult
      const syncResult = await mutationSyncRun()
      if (!syncResult.success) return syncResult
      return cipherMutationResponseRead(op, collectionResult.data, parsed.output.cipherId, targetResult.data.plain.type)
    })

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
    accountRegister,
    accountVerificationEmailSend,
    accountVerify,
    accountPasswordSetup,
    passwordLogin,
    loginChallengeSubmit,
    loginChallengeEmailSend,
    loginChallengeCancel,
    refreshToken,
    sync,
    conditionalSync,
    fullSync,
    manualSync,
    credentialCaptureAssess,
    credentialCaptureCommit,
    credentialCaptureDiscard,
    cipherCreate,
    cipherUpdate,
    cipherPartial,
    cipherDelete,
    cipherRestore,
    cipherArchive,
    cipherMove,
    cipherCollectionsUpdate,
    attachmentUpload,
    attachmentDownload,
    attachmentDelete,
    folderList,
    folderRead,
    folderCreate,
    folderUpdate,
    folderDelete,
    collectionList,
    collectionRead,
    collectionCreate,
    collectionUpdate,
    collectionDelete,
    sessionHandoffCreate,
    syncSnapshotLoad,
    cipherDetailRead,
    vaultSearch,
    biometricCapabilityRead,
    biometricStatusRead,
    biometricEnroll,
    biometricRevoke,
    biometricUnlock,
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

function extensionCredentialCaptureIdCreate(): string {
  return globalThis.crypto?.randomUUID?.() ?? `capture-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function extensionCredentialCaptureSiteRead(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    return url.hostname
      .toLowerCase()
      .replace(/^www\./u, "")
      .replace(/\.$/u, "")
  } catch {
    return null
  }
}
