import * as v from "valibot"
import type { Result } from "#result"
import { cipherImportResultSchema } from "../../../shared/api/cipherImportResultSchema.js"
import { webApiAuthenticatedHeadersCreate } from "../../../shared/api/webApiAuthenticatedHeadersCreate.js"
import { webApiResponseEmptyParse } from "../../../shared/api/webApiResponseEmptyParse.js"
import { webApiResponseParse } from "../../../shared/api/webApiResponseParse.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { type AccountApiKey, accountApiKeySchema } from "./accountApiKeySchema.js"
import { type AccountDeleteRequest } from "./accountDeleteRequestSchema.js"
import { type AccountDeviceListResponse, accountDeviceListResponseSchema } from "./accountDeviceSchema.js"
import { type AccountEmailChangeCompleteRequest } from "./accountEmailChangeCompleteRequestSchema.js"
import { type AccountEmailChangeTokenRequest } from "./accountEmailChangeTokenRequestSchema.js"
import { type AccountKdfChangeRequest } from "./accountKdfChangeRequestSchema.js"
import { type AccountPasswordChangeRequest } from "./accountPasswordChangeRequestSchema.js"
import { type AccountProfile, accountProfileSchema } from "./accountProfileSchema.js"
import type { AccountProfileUpdateRequest } from "./accountProfileUpdateRequestSchema.js"
import { type AccountRotateKeysRequest } from "./accountRotateKeysRequestSchema.js"
import { type BitwardenEncryptedSync, bitwardenEncryptedSyncSchema } from "./bitwardenEncryptedSyncSchema.js"

type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

const cipherImportResponseSchema = v.union([cipherImportResultSchema, v.strictObject({ revisionDate: v.string() })])
type CipherImportResponse = v.InferOutput<typeof cipherImportResponseSchema>

export function webSettingsApiClientCreate(options: { baseUrl?: string; fetch?: FetchImplementation } = {}) {
  const baseUrl = options.baseUrl ?? ""
  const fetchImpl = options.fetch ?? fetch

  const profileGet = async (accessToken: string): Promise<Result<AccountProfile>> => {
    const op = "webSettingsApiClient.profileGet"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/accounts/profile`, {
        method: "GET",
        headers: webApiAuthenticatedHeadersCreate(accessToken),
      })
    } catch {
      return resultErrorCreate(op, "Network error during profile fetch.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseParse(op, response, accountProfileSchema)
  }

  const profileUpdate = async (
    accessToken: string,
    payload: AccountProfileUpdateRequest,
  ): Promise<Result<AccountProfile>> => {
    const op = "webSettingsApiClient.profileUpdate"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/accounts/profile`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken, "application/json"),
        body: JSON.stringify(payload),
      })
    } catch {
      return resultErrorCreate(op, "Network error during profile update.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseParse(op, response, accountProfileSchema)
  }

  const avatarUpdate = async (accessToken: string, avatarColor: string | null): Promise<Result<AccountProfile>> => {
    const op = "webSettingsApiClient.avatarUpdate"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/accounts/avatar`, {
        method: "PUT",
        headers: webApiAuthenticatedHeadersCreate(accessToken, "application/json"),
        body: JSON.stringify({ avatarColor }),
      })
    } catch {
      return resultErrorCreate(op, "Network error during avatar update.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseParse(op, response, accountProfileSchema)
  }

  const apiKeyGet = async (accessToken: string, masterPasswordHash: string): Promise<Result<AccountApiKey>> => {
    const op = "webSettingsApiClient.apiKeyGet"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/accounts/api-key`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken, "application/json"),
        body: JSON.stringify({ masterPasswordHash }),
      })
    } catch {
      return resultErrorCreate(op, "Network error fetching API key.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseParse(op, response, accountApiKeySchema)
  }

  const apiKeyRotate = async (accessToken: string, masterPasswordHash: string): Promise<Result<AccountApiKey>> => {
    const op = "webSettingsApiClient.apiKeyRotate"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/accounts/rotate-api-key`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken, "application/json"),
        body: JSON.stringify({ masterPasswordHash }),
      })
    } catch {
      return resultErrorCreate(op, "Network error rotating API key.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseParse(op, response, accountApiKeySchema)
  }

  const passwordChange = async (accessToken: string, payload: AccountPasswordChangeRequest): Promise<Result<void>> => {
    const op = "webSettingsApiClient.passwordChange"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/accounts/password`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken, "application/json"),
        body: JSON.stringify(payload),
      })
    } catch {
      return resultErrorCreate(op, "Network error changing password.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const kdfChange = async (accessToken: string, payload: AccountKdfChangeRequest): Promise<Result<void>> => {
    const op = "webSettingsApiClient.kdfChange"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/accounts/kdf`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken, "application/json"),
        body: JSON.stringify(payload),
      })
    } catch {
      return resultErrorCreate(op, "Network error changing KDF.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const keysRotate = async (accessToken: string, payload: AccountRotateKeysRequest): Promise<Result<void>> => {
    const op = "webSettingsApiClient.keysRotate"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/accounts/key-management/rotate-user-account-keys`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken, "application/json"),
        body: JSON.stringify(payload),
      })
    } catch {
      return resultErrorCreate(op, "Network error during key rotation.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const emailTokenRequest = async (
    accessToken: string,
    payload: AccountEmailChangeTokenRequest,
  ): Promise<Result<void>> => {
    const op = "webSettingsApiClient.emailTokenRequest"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/accounts/email-token`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken, "application/json"),
        body: JSON.stringify(payload),
      })
    } catch {
      return resultErrorCreate(op, "Network error requesting email change token.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const emailChangeComplete = async (
    accessToken: string,
    payload: AccountEmailChangeCompleteRequest,
  ): Promise<Result<void>> => {
    const op = "webSettingsApiClient.emailChangeComplete"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/accounts/email`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken, "application/json"),
        body: JSON.stringify(payload),
      })
    } catch {
      return resultErrorCreate(op, "Network error completing email change.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const emailVerificationSend = async (accessToken: string): Promise<Result<void>> => {
    const op = "webSettingsApiClient.emailVerificationSend"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/accounts/verify-email`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken),
      })
    } catch {
      return resultErrorCreate(op, "Network error sending email verification.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const devicesGet = async (accessToken: string): Promise<Result<AccountDeviceListResponse>> => {
    const op = "webSettingsApiClient.devicesGet"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/devices`, {
        method: "GET",
        headers: webApiAuthenticatedHeadersCreate(accessToken),
      })
    } catch {
      return resultErrorCreate(op, "Network error fetching devices.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseParse(op, response, accountDeviceListResponseSchema)
  }

  const securityStampRotate = async (
    accessToken: string,
    masterPasswordHash: string,
    otp?: string | null,
  ): Promise<Result<void>> => {
    const op = "webSettingsApiClient.securityStampRotate"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/accounts/security-stamp`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken, "application/json"),
        body: JSON.stringify({ masterPasswordHash, otp: otp ?? null }),
      })
    } catch {
      return resultErrorCreate(op, "Network error rotating security stamp.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const accountDelete = async (accessToken: string, payload: AccountDeleteRequest): Promise<Result<void>> => {
    const op = "webSettingsApiClient.accountDelete"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/accounts/delete`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken, "application/json"),
        body: JSON.stringify(payload),
      })
    } catch {
      return resultErrorCreate(op, "Network error deleting account.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const accountDeleteRecover = async (email: string): Promise<Result<void>> => {
    const op = "webSettingsApiClient.accountDeleteRecover"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/accounts/delete-recover`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email }),
      })
    } catch {
      return resultErrorCreate(op, "Network error requesting account deletion recovery.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseEmptyParse(op, response)
  }

  const syncGet = async (accessToken: string): Promise<Result<BitwardenEncryptedSync>> => {
    const op = "webSettingsApiClient.syncGet"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/sync`, {
        method: "GET",
        headers: webApiAuthenticatedHeadersCreate(accessToken),
      })
    } catch {
      return resultErrorCreate(op, "Network error during sync.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseParse(op, response, bitwardenEncryptedSyncSchema)
  }

  const ciphersImport = async (
    accessToken: string,
    data: {
      ciphers: unknown[]
      folders: unknown[]
      folderRelationships: Array<{ key: number; value: number }>
    },
  ): Promise<Result<CipherImportResponse>> => {
    const op = "webSettingsApiClient.ciphersImport"
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/api/ciphers/import`, {
        method: "POST",
        headers: webApiAuthenticatedHeadersCreate(accessToken, "application/json"),
        body: JSON.stringify(data),
      })
    } catch {
      return resultErrorCreate(op, "Network error importing ciphers.", {
        code: "platform.network-error",
        statusCode: 503,
      })
    }
    return webApiResponseParse(op, response, cipherImportResponseSchema)
  }

  return {
    profileGet,
    profileUpdate,
    avatarUpdate,
    apiKeyGet,
    apiKeyRotate,
    passwordChange,
    kdfChange,
    keysRotate,
    emailTokenRequest,
    emailChangeComplete,
    emailVerificationSend,
    devicesGet,
    securityStampRotate,
    accountDelete,
    accountDeleteRecover,
    syncGet,
    ciphersImport,
  }
}
