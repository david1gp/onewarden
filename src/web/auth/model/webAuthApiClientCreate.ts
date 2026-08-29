import * as v from "valibot"
import { type Result, resultTryParsingFetchErr } from "#result"
import {
  type BitwardenPasswordTokenResponse,
  bitwardenPasswordTokenResponseSchema,
} from "../../../shared/api/bitwardenPasswordTokenResponseSchema.js"
import {
  type BitwardenPreloginResponse,
  bitwardenPreloginResponseSchema,
} from "../../../shared/api/bitwardenPreloginResponseSchema.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import {
  type TwoFactorAuthenticatorResponse,
  twoFactorAuthenticatorResponseSchema,
} from "./twoFactorAuthenticatorResponseSchema.js"
import { twoFactorChallengeSchema } from "./twoFactorChallengeSchema.js"
import { type TwoFactorDeviceSettings, twoFactorDeviceSettingsSchema } from "./twoFactorDeviceSettingsSchema.js"
import { type TwoFactorDuoResponse, twoFactorDuoResponseSchema } from "./twoFactorDuoResponseSchema.js"
import { type TwoFactorEmailResponse, twoFactorEmailResponseSchema } from "./twoFactorEmailResponseSchema.js"
import { type TwoFactorProviderList, twoFactorProviderSchema } from "./twoFactorProviderSchema.js"
import { type TwoFactorRecoverResponse, twoFactorRecoverResponseSchema } from "./twoFactorRecoverResponseSchema.js"
import {
  type TwoFactorWebAuthnChallengeResponse,
  twoFactorWebAuthnChallengeResponseSchema,
} from "./twoFactorWebAuthnChallengeResponseSchema.js"
import { type TwoFactorWebAuthnResponse, twoFactorWebAuthnResponseSchema } from "./twoFactorWebAuthnResponseSchema.js"
import { type TwoFactorYubikeyResponse, twoFactorYubikeyResponseSchema } from "./twoFactorYubikeyResponseSchema.js"

export interface WebAuthLoginRequest {
  username: string
  passwordHashB64: string
  clientId?: string
  deviceName?: string
  deviceType?: string
  deviceIdentifier?: string
  twoFactorProvider?: string | number
  twoFactorToken?: string
  twoFactorRemember?: "1" | "0"
}

export interface WebAuthRegisterRequest {
  email: string
  masterPasswordHash: string
  userSymmetricKey: string
  masterPasswordHint?: string | null
  name?: string | null
  kdf?: number
  kdfIterations?: number
  kdfMemory?: number | null
  kdfParallelism?: number | null
  keys?: {
    encryptedPrivateKey: string
    publicKey: string
  }
}

export interface WebAuthVerifyEmailRequest {
  userId: string
  token: string
}

export interface WebAuthVerificationEmailSendRequest {
  email: string
  name?: string | null
}

const registerResponseSchema = v.object({
  object: v.literal("register"),
  captchaBypassToken: v.optional(v.string()),
})

const twoFactorDisableResponseSchema = v.object({
  enabled: v.literal(false),
  type: v.optional(v.number()),
  keys: v.optional(v.union([v.number(), v.string()])),
  object: v.literal("twoFactorProvider"),
})

type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

async function responseJsonParse<TSchema extends v.GenericSchema>(
  op: string,
  response: Response,
  schema: TSchema,
): Promise<Result<v.InferOutput<TSchema>>> {
  let text: string
  try {
    text = await response.text()
  } catch {
    return resultErrorCreate(op, "Failed to read server response.", {
      code: "platform.unavailable",
      statusCode: 503,
    })
  }
  if (!response.ok) {
    if (response.status === 400) {
      try {
        const parsedBody = JSON.parse(text)
        const challengeCheck = v.safeParse(twoFactorChallengeSchema, parsedBody)
        if (challengeCheck.success) {
          return resultErrorCreate(op, challengeCheck.output.error_description ?? "Two factor required.", {
            code: "auth.two-factor-required",
            statusCode: 400,
            errorData: JSON.stringify(challengeCheck.output),
          })
        }
      } catch {
        // Fall back to standard error parsing
      }
    }
    return resultTryParsingFetchErr(op, text, response.status, response.statusText)
  }
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return resultErrorCreate(op, "Server response was not valid JSON.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
  const parsed = v.safeParse(schema, body)
  if (!parsed.success) {
    return resultErrorCreate(op, "Server response did not match expected schema.", {
      code: "platform.internal",
      statusCode: 500,
      errorData: v.summarize(parsed.issues),
    })
  }
  return resultCreate(parsed.output)
}

export function webAuthApiClientCreate(options: { baseUrl?: string; fetch?: FetchImplementation } = {}) {
  const fetchFn = options.fetch ?? globalThis.fetch
  const baseUrl = options.baseUrl ?? ""

  const authHeaders = (accessToken: string, extraHeaders: Record<string, string> = {}) => ({
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
    accept: "application/json",
    ...extraHeaders,
  })

  const prelogin = async (email: string): Promise<Result<BitwardenPreloginResponse>> => {
    const op = "webAuthApiClient.prelogin"
    try {
      const response = await fetchFn(`${baseUrl}/identity/accounts/prelogin`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      return responseJsonParse(op, response, bitwardenPreloginResponseSchema)
    } catch {
      return resultErrorCreate(op, "Prelogin request failed.", { code: "platform.unavailable", statusCode: 503 })
    }
  }

  const login = async (request: WebAuthLoginRequest): Promise<Result<BitwardenPasswordTokenResponse>> => {
    const op = "webAuthApiClient.login"
    const formParams: Record<string, string> = {
      grant_type: "password",
      username: request.username.trim().toLowerCase(),
      password: request.passwordHashB64,
      client_id: request.clientId ?? "web",
      device_identifier: request.deviceIdentifier ?? "web-browser",
      device_name: request.deviceName ?? "Web Browser",
      device_type: request.deviceType ?? "6",
      scope: "api offline_access",
    }
    if (request.twoFactorProvider !== undefined) {
      formParams.two_factor_provider = String(request.twoFactorProvider)
    }
    if (request.twoFactorToken !== undefined) {
      formParams.two_factor_token = request.twoFactorToken
    }
    if (request.twoFactorRemember !== undefined) {
      formParams.two_factor_remember = request.twoFactorRemember
    }

    const form = new URLSearchParams(formParams)

    try {
      const response = await fetchFn(`${baseUrl}/identity/connect/token`, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          accept: "application/json",
        },
        body: form.toString(),
      })
      return responseJsonParse(op, response, bitwardenPasswordTokenResponseSchema)
    } catch {
      return resultErrorCreate(op, "Login request failed.", { code: "platform.unavailable", statusCode: 503 })
    }
  }

  const register = async (
    request: WebAuthRegisterRequest,
  ): Promise<Result<{ object: "register"; captchaBypassToken?: string }>> => {
    const op = "webAuthApiClient.register"
    const payload = {
      email: request.email.trim().toLowerCase(),
      masterPasswordHash: request.masterPasswordHash,
      key: request.userSymmetricKey,
      masterPasswordHint: request.masterPasswordHint ?? null,
      name: request.name ?? null,
      kdf: request.kdf ?? 0,
      kdfIterations: request.kdfIterations ?? 600_000,
      kdfMemory: request.kdfMemory ?? null,
      kdfParallelism: request.kdfParallelism ?? null,
      keys: request.keys ?? null,
    }

    try {
      const response = await fetchFn(`${baseUrl}/identity/accounts/register`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload),
      })
      return responseJsonParse(op, response, registerResponseSchema)
    } catch {
      return resultErrorCreate(op, "Registration request failed.", { code: "platform.unavailable", statusCode: 503 })
    }
  }

  const sendVerificationEmail = async (
    request: WebAuthVerificationEmailSendRequest,
  ): Promise<Result<{ token?: string; userId?: string }>> => {
    const op = "webAuthApiClient.sendVerificationEmail"
    try {
      const response = await fetchFn(`${baseUrl}/identity/accounts/register/send-verification-email`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ email: request.email.trim().toLowerCase(), name: request.name ?? null }),
      })
      if (response.status === 204) {
        return resultCreate({})
      }
      let text: string
      try {
        text = await response.text()
      } catch {
        return resultErrorCreate(op, "Failed to read verification response.", {
          code: "platform.unavailable",
          statusCode: 503,
        })
      }
      if (!response.ok) {
        return resultTryParsingFetchErr(op, text, response.status, response.statusText)
      }
      let body: unknown
      try {
        body = JSON.parse(text)
      } catch {
        body = text
      }
      if (typeof body === "string") return resultCreate({ token: body })
      const parsed = v.safeParse(v.object({ userId: v.optional(v.string()), token: v.optional(v.string()) }), body)
      if (!parsed.success) {
        return resultErrorCreate(op, "Server response did not match expected verification response.", {
          code: "platform.internal",
          statusCode: 500,
          errorData: v.summarize(parsed.issues),
        })
      }
      return resultCreate(parsed.output)
    } catch {
      return resultErrorCreate(op, "Failed to send verification email.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  const verifyEmailToken = async (request: WebAuthVerifyEmailRequest): Promise<Result<void>> => {
    const op = "webAuthApiClient.verifyEmailToken"
    try {
      const response = await fetchFn(`${baseUrl}/api/accounts/verify-email-token`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(request),
      })
      if (response.ok) {
        return resultCreate(undefined)
      }
      const text = await response.text()
      return resultTryParsingFetchErr(op, text, response.status, response.statusText)
    } catch {
      return resultErrorCreate(op, "Failed to verify email token.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  // --- Two-Factor Authentication Endpoints ---

  const twoFactorProvidersGet = async (accessToken: string): Promise<Result<TwoFactorProviderList>> => {
    const op = "webAuthApiClient.twoFactorProvidersGet"
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor`, {
        method: "GET",
        headers: authHeaders(accessToken),
      })
      return responseJsonParse(op, response, twoFactorProviderSchema)
    } catch {
      return resultErrorCreate(op, "Failed to fetch two-factor providers.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  const twoFactorRecoverGet = async (
    accessToken: string,
    masterPasswordHash?: string,
  ): Promise<Result<TwoFactorRecoverResponse>> => {
    const op = "webAuthApiClient.twoFactorRecoverGet"
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/get-recover`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ masterPasswordHash: masterPasswordHash ?? null }),
      })
      return responseJsonParse(op, response, twoFactorRecoverResponseSchema)
    } catch {
      return resultErrorCreate(op, "Failed to get recovery code.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  const twoFactorDisable = async (
    accessToken: string,
    payload: { type: number | string; masterPasswordHash?: string },
  ): Promise<Result<v.InferOutput<typeof twoFactorDisableResponseSchema>>> => {
    const op = "webAuthApiClient.twoFactorDisable"
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/disable`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          type: payload.type,
          masterPasswordHash: payload.masterPasswordHash ?? null,
        }),
      })
      return responseJsonParse(op, response, twoFactorDisableResponseSchema)
    } catch {
      return resultErrorCreate(op, "Failed to disable two-factor provider.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  const twoFactorDeviceVerificationSettingsGet = async (
    accessToken: string,
  ): Promise<Result<TwoFactorDeviceSettings>> => {
    const op = "webAuthApiClient.twoFactorDeviceVerificationSettingsGet"
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/get-device-verification-settings`, {
        method: "GET",
        headers: authHeaders(accessToken),
      })
      return responseJsonParse(op, response, twoFactorDeviceSettingsSchema)
    } catch {
      return resultErrorCreate(op, "Failed to get device verification settings.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  const twoFactorAuthenticatorGet = async (
    accessToken: string,
    masterPasswordHash?: string,
  ): Promise<Result<TwoFactorAuthenticatorResponse>> => {
    const op = "webAuthApiClient.twoFactorAuthenticatorGet"
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/get-authenticator`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ masterPasswordHash: masterPasswordHash ?? null }),
      })
      return responseJsonParse(op, response, twoFactorAuthenticatorResponseSchema)
    } catch {
      return resultErrorCreate(op, "Failed to get authenticator key.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  const twoFactorAuthenticatorActivate = async (
    accessToken: string,
    payload: { key: string; token: string | number; masterPasswordHash?: string },
  ): Promise<Result<TwoFactorAuthenticatorResponse>> => {
    const op = "webAuthApiClient.twoFactorAuthenticatorActivate"
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/authenticator`, {
        method: "PUT",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          key: payload.key,
          token: String(payload.token),
          masterPasswordHash: payload.masterPasswordHash ?? null,
        }),
      })
      return responseJsonParse(op, response, twoFactorAuthenticatorResponseSchema)
    } catch {
      return resultErrorCreate(op, "Failed to activate authenticator.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  const twoFactorAuthenticatorDisable = async (
    accessToken: string,
    payload: { key: string; masterPasswordHash: string; type: number | string },
  ): Promise<Result<v.InferOutput<typeof twoFactorDisableResponseSchema>>> => {
    const op = "webAuthApiClient.twoFactorAuthenticatorDisable"
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/authenticator`, {
        method: "DELETE",
        headers: authHeaders(accessToken),
        body: JSON.stringify(payload),
      })
      return responseJsonParse(op, response, twoFactorDisableResponseSchema)
    } catch {
      return resultErrorCreate(op, "Failed to disable authenticator.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  const twoFactorEmailLoginSend = async (payload: {
    email?: string
    deviceIdentifier?: string
    masterPasswordHash?: string
  }): Promise<Result<void>> => {
    const op = "webAuthApiClient.twoFactorEmailLoginSend"
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/send-email-login`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload),
      })
      if (response.ok) return resultCreate(undefined)
      const text = await response.text()
      return resultTryParsingFetchErr(op, text, response.status, response.statusText)
    } catch {
      return resultErrorCreate(op, "Failed to send email login code.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  const twoFactorEmailGet = async (
    accessToken: string,
    masterPasswordHash?: string,
  ): Promise<Result<TwoFactorEmailResponse>> => {
    const op = "webAuthApiClient.twoFactorEmailGet"
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/get-email`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ masterPasswordHash: masterPasswordHash ?? null }),
      })
      return responseJsonParse(op, response, twoFactorEmailResponseSchema)
    } catch {
      return resultErrorCreate(op, "Failed to get two-factor email details.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  const twoFactorEmailSend = async (
    accessToken: string,
    payload: { email: string; masterPasswordHash?: string },
  ): Promise<Result<void>> => {
    const op = "webAuthApiClient.twoFactorEmailSend"
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/send-email`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify(payload),
      })
      if (response.ok) return resultCreate(undefined)
      const text = await response.text()
      return resultTryParsingFetchErr(op, text, response.status, response.statusText)
    } catch {
      return resultErrorCreate(op, "Failed to send two-factor verification email.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  const twoFactorEmailActivate = async (
    accessToken: string,
    payload: { email: string; token: string; masterPasswordHash?: string },
  ): Promise<Result<TwoFactorEmailResponse>> => {
    const op = "webAuthApiClient.twoFactorEmailActivate"
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/email`, {
        method: "PUT",
        headers: authHeaders(accessToken),
        body: JSON.stringify(payload),
      })
      return responseJsonParse(op, response, twoFactorEmailResponseSchema)
    } catch {
      return resultErrorCreate(op, "Failed to activate email two-factor.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  const twoFactorDuoGet = async (
    accessToken: string,
    masterPasswordHash?: string,
  ): Promise<Result<TwoFactorDuoResponse>> => {
    const op = "webAuthApiClient.twoFactorDuoGet"
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/get-duo`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ masterPasswordHash: masterPasswordHash ?? null }),
      })
      return responseJsonParse(op, response, twoFactorDuoResponseSchema)
    } catch {
      return resultErrorCreate(op, "Failed to get Duo settings.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  const twoFactorDuoActivate = async (
    accessToken: string,
    payload: { host: string; clientId: string; clientSecret: string; masterPasswordHash?: string },
  ): Promise<Result<TwoFactorDuoResponse>> => {
    const op = "webAuthApiClient.twoFactorDuoActivate"
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/duo`, {
        method: "PUT",
        headers: authHeaders(accessToken),
        body: JSON.stringify(payload),
      })
      return responseJsonParse(op, response, twoFactorDuoResponseSchema)
    } catch {
      return resultErrorCreate(op, "Failed to activate Duo.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  const twoFactorYubikeyGet = async (
    accessToken: string,
    masterPasswordHash?: string,
  ): Promise<Result<TwoFactorYubikeyResponse>> => {
    const op = "webAuthApiClient.twoFactorYubikeyGet"
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/get-yubikey`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ masterPasswordHash: masterPasswordHash ?? null }),
      })
      return responseJsonParse(op, response, twoFactorYubikeyResponseSchema)
    } catch {
      return resultErrorCreate(op, "Failed to get YubiKey configuration.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  const twoFactorYubikeyActivate = async (
    accessToken: string,
    payload: {
      key1?: string | null
      key2?: string | null
      key3?: string | null
      key4?: string | null
      key5?: string | null
      nfc?: boolean
      masterPasswordHash?: string
    },
  ): Promise<Result<TwoFactorYubikeyResponse>> => {
    const op = "webAuthApiClient.twoFactorYubikeyActivate"
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/yubikey`, {
        method: "PUT",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          key1: payload.key1 ?? undefined,
          key2: payload.key2 ?? undefined,
          key3: payload.key3 ?? undefined,
          key4: payload.key4 ?? undefined,
          key5: payload.key5 ?? undefined,
          nfc: payload.nfc ?? false,
          masterPasswordHash: payload.masterPasswordHash ?? null,
        }),
      })
      return responseJsonParse(op, response, twoFactorYubikeyResponseSchema)
    } catch {
      return resultErrorCreate(op, "Failed to activate YubiKey.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  const twoFactorWebAuthnGet = async (
    accessToken: string,
    masterPasswordHash?: string,
  ): Promise<Result<TwoFactorWebAuthnResponse>> => {
    const op = "webAuthApiClient.twoFactorWebAuthnGet"
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/get-webauthn`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ masterPasswordHash: masterPasswordHash ?? null }),
      })
      return responseJsonParse(op, response, twoFactorWebAuthnResponseSchema)
    } catch {
      return resultErrorCreate(op, "Failed to get WebAuthn credentials.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  const twoFactorWebAuthnChallengeGet = async (
    accessToken: string,
    masterPasswordHash?: string,
  ): Promise<Result<TwoFactorWebAuthnChallengeResponse>> => {
    const op = "webAuthApiClient.twoFactorWebAuthnChallengeGet"
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/get-webauthn-challenge`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify({ masterPasswordHash: masterPasswordHash ?? null }),
      })
      return responseJsonParse(op, response, twoFactorWebAuthnChallengeResponseSchema)
    } catch {
      return resultErrorCreate(op, "Failed to get WebAuthn challenge.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  const twoFactorWebAuthnActivate = async (
    accessToken: string,
    payload: { id: number | string; name: string; deviceResponse: unknown; masterPasswordHash?: string },
  ): Promise<Result<TwoFactorWebAuthnResponse>> => {
    const op = "webAuthApiClient.twoFactorWebAuthnActivate"
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/webauthn`, {
        method: "PUT",
        headers: authHeaders(accessToken),
        body: JSON.stringify(payload),
      })
      return responseJsonParse(op, response, twoFactorWebAuthnResponseSchema)
    } catch {
      return resultErrorCreate(op, "Failed to activate WebAuthn key.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  const twoFactorWebAuthnDelete = async (
    accessToken: string,
    payload: { id: number | string; masterPasswordHash: string },
  ): Promise<Result<TwoFactorWebAuthnResponse>> => {
    const op = "webAuthApiClient.twoFactorWebAuthnDelete"
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/webauthn`, {
        method: "DELETE",
        headers: authHeaders(accessToken),
        body: JSON.stringify(payload),
      })
      return responseJsonParse(op, response, twoFactorWebAuthnResponseSchema)
    } catch {
      return resultErrorCreate(op, "Failed to delete WebAuthn credential.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  return {
    prelogin,
    login,
    register,
    sendVerificationEmail,
    verifyEmailToken,
    twoFactorProvidersGet,
    twoFactorRecoverGet,
    twoFactorDisable,
    twoFactorDeviceVerificationSettingsGet,
    twoFactorAuthenticatorGet,
    twoFactorAuthenticatorActivate,
    twoFactorAuthenticatorDisable,
    twoFactorEmailLoginSend,
    twoFactorEmailGet,
    twoFactorEmailSend,
    twoFactorEmailActivate,
    twoFactorDuoGet,
    twoFactorDuoActivate,
    twoFactorYubikeyGet,
    twoFactorYubikeyActivate,
    twoFactorWebAuthnGet,
    twoFactorWebAuthnChallengeGet,
    twoFactorWebAuthnActivate,
    twoFactorWebAuthnDelete,
  }
}

export type WebAuthApiClient = ReturnType<typeof webAuthApiClientCreate>
