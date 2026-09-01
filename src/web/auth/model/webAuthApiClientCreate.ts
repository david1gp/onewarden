import * as v from "valibot"
import { type Result, type ResultErr, resultTryParsingFetchErr } from "#result"
import {
  type BitwardenPasswordTokenResponse,
  bitwardenPasswordTokenResponseSchema,
} from "../../../shared/api/bitwardenPasswordTokenResponseSchema.js"
import {
  type BitwardenPreloginResponse,
  bitwardenPreloginResponseSchema,
} from "../../../shared/api/bitwardenPreloginResponseSchema.js"
import { webApiResponseParse } from "../../../shared/api/webApiResponseParse.js"
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
import { type WebAuthLoginRequestInput, webAuthLoginRequestSchema } from "./webAuthLoginRequestSchema.js"
import { type WebAuthRegisterRequestInput, webAuthRegisterRequestSchema } from "./webAuthRegisterRequestSchema.js"
import {
  type WebAuthSetPasswordRequestInput,
  webAuthSetPasswordRequestSchema,
} from "./webAuthSetPasswordRequestSchema.js"
import { type WebAuthSsoLoginRequestInput, webAuthSsoLoginRequestSchema } from "./webAuthSsoLoginRequestSchema.js"
import {
  type WebAuthTwoFactorAuthenticatorActivateRequestInput,
  webAuthTwoFactorAuthenticatorActivateRequestSchema,
} from "./webAuthTwoFactorAuthenticatorActivateRequestSchema.js"
import {
  type WebAuthTwoFactorAuthenticatorDisableRequestInput,
  webAuthTwoFactorAuthenticatorDisableRequestSchema,
} from "./webAuthTwoFactorAuthenticatorDisableRequestSchema.js"
import {
  type WebAuthTwoFactorDisableRequestInput,
  webAuthTwoFactorDisableRequestSchema,
} from "./webAuthTwoFactorDisableRequestSchema.js"
import {
  type WebAuthTwoFactorDuoActivateRequestInput,
  webAuthTwoFactorDuoActivateRequestSchema,
} from "./webAuthTwoFactorDuoActivateRequestSchema.js"
import {
  type WebAuthTwoFactorEmailActivateRequestInput,
  webAuthTwoFactorEmailActivateRequestSchema,
} from "./webAuthTwoFactorEmailActivateRequestSchema.js"
import {
  type WebAuthTwoFactorEmailLoginSendRequestInput,
  webAuthTwoFactorEmailLoginSendRequestSchema,
} from "./webAuthTwoFactorEmailLoginSendRequestSchema.js"
import {
  type WebAuthTwoFactorEmailSendRequestInput,
  webAuthTwoFactorEmailSendRequestSchema,
} from "./webAuthTwoFactorEmailSendRequestSchema.js"
import {
  type WebAuthTwoFactorWebAuthnActivateRequestInput,
  webAuthTwoFactorWebAuthnActivateRequestSchema,
} from "./webAuthTwoFactorWebAuthnActivateRequestSchema.js"
import {
  type WebAuthTwoFactorWebAuthnDeleteRequestInput,
  webAuthTwoFactorWebAuthnDeleteRequestSchema,
} from "./webAuthTwoFactorWebAuthnDeleteRequestSchema.js"
import {
  type WebAuthTwoFactorYubikeyActivateRequestInput,
  webAuthTwoFactorYubikeyActivateRequestSchema,
} from "./webAuthTwoFactorYubikeyActivateRequestSchema.js"
import {
  type WebAuthVerificationEmailSendRequestInput,
  webAuthVerificationEmailSendRequestSchema,
} from "./webAuthVerificationEmailSendRequestSchema.js"
import {
  type WebAuthVerifyEmailRequestInput,
  webAuthVerifyEmailRequestSchema,
} from "./webAuthVerifyEmailRequestSchema.js"

const registerResponseSchema = v.object({
  object: v.literal("register"),
  captchaBypassToken: v.optional(v.string()),
})

const setPasswordResponseSchema = v.object({
  object: v.literal("set-password"),
  captchaBypassToken: v.optional(v.string()),
})

const twoFactorDisableResponseSchema = v.object({
  enabled: v.literal(false),
  type: v.optional(v.number()),
  keys: v.optional(v.union([v.number(), v.string()])),
  object: v.literal("twoFactorProvider"),
})

type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

function requestValidationParse<TSchema extends v.GenericSchema>(
  op: string,
  input: unknown,
  schema: TSchema,
): Result<v.InferOutput<TSchema>> {
  const parsed = v.safeParse(schema, input)
  if (parsed.success) return resultCreate(parsed.output)
  return resultErrorCreate(op, v.summarize(parsed.issues), { code: "platform.invalid-request", statusCode: 400 })
}

function twoFactorChallengeErrorResultTransform(result: ResultErr, text: string): ResultErr {
  if (result.statusCode !== 400) return result
  try {
    const challengeCheck = v.safeParse(twoFactorChallengeSchema, JSON.parse(text))
    if (!challengeCheck.success) return result
    return resultErrorCreate(result.op, challengeCheck.output.error_description ?? "Two factor required.", {
      code: "auth.two-factor-required",
      statusCode: 400,
      errorData: JSON.stringify(challengeCheck.output),
    })
  } catch {
    return result
  }
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

  const responseJsonParse = <TSchema extends v.GenericSchema>(
    op: string,
    response: Response,
    schema: TSchema,
  ): Promise<Result<v.InferOutput<TSchema>>> =>
    webApiResponseParse(op, response, schema, { errorResultTransform: twoFactorChallengeErrorResultTransform })

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

  const login = async (request: WebAuthLoginRequestInput): Promise<Result<BitwardenPasswordTokenResponse>> => {
    const op = "webAuthApiClient.login"
    const requestResult = requestValidationParse(op, request, webAuthLoginRequestSchema)
    if (!requestResult.success) return requestResult
    const normalizedRequest = requestResult.data
    const formParams: Record<string, string> = {
      grant_type: "password",
      username: normalizedRequest.username,
      password: normalizedRequest.passwordHashB64,
      client_id: normalizedRequest.clientId,
      device_identifier: normalizedRequest.deviceIdentifier,
      device_name: normalizedRequest.deviceName,
      device_type: normalizedRequest.deviceType,
      scope: "api offline_access",
    }
    if (normalizedRequest.twoFactorProvider !== undefined) {
      formParams.two_factor_provider = normalizedRequest.twoFactorProvider
    }
    if (normalizedRequest.twoFactorToken !== undefined) {
      formParams.two_factor_token = normalizedRequest.twoFactorToken
    }
    if (normalizedRequest.twoFactorRemember !== undefined) {
      formParams.two_factor_remember = normalizedRequest.twoFactorRemember
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

  const ssoLogin = async (request: WebAuthSsoLoginRequestInput): Promise<Result<BitwardenPasswordTokenResponse>> => {
    const op = "webAuthApiClient.ssoLogin"
    const requestResult = requestValidationParse(op, request, webAuthSsoLoginRequestSchema)
    if (!requestResult.success) return requestResult
    const normalizedRequest = requestResult.data
    const form = new URLSearchParams({
      grant_type: "authorization_code",
      code: normalizedRequest.code,
      code_verifier: normalizedRequest.codeVerifier,
      client_id: normalizedRequest.clientId,
      device_identifier: normalizedRequest.deviceIdentifier,
      device_name: normalizedRequest.deviceName,
      device_type: normalizedRequest.deviceType,
      scope: "api offline_access",
    })

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
      return resultErrorCreate(op, "SSO login request failed.", { code: "platform.unavailable", statusCode: 503 })
    }
  }

  const register = async (
    request: WebAuthRegisterRequestInput,
  ): Promise<Result<{ object: "register"; captchaBypassToken?: string }>> => {
    const op = "webAuthApiClient.register"
    const requestResult = requestValidationParse(op, request, webAuthRegisterRequestSchema)
    if (!requestResult.success) return requestResult
    const normalizedRequest = requestResult.data
    const payload = {
      email: normalizedRequest.email,
      masterPasswordHash: normalizedRequest.masterPasswordHash,
      key: normalizedRequest.userSymmetricKey,
      masterPasswordHint: normalizedRequest.masterPasswordHint,
      name: normalizedRequest.name,
      kdf: normalizedRequest.kdf,
      kdfIterations: normalizedRequest.kdfIterations,
      kdfMemory: normalizedRequest.kdfMemory,
      kdfParallelism: normalizedRequest.kdfParallelism,
      keys: normalizedRequest.keys,
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

  const setPassword = async (
    request: WebAuthSetPasswordRequestInput,
  ): Promise<Result<{ object: "set-password"; captchaBypassToken?: string }>> => {
    const op = "webAuthApiClient.setPassword"
    const requestResult = requestValidationParse(op, request, webAuthSetPasswordRequestSchema)
    if (!requestResult.success) return requestResult
    const normalizedRequest = requestResult.data
    const payload = {
      masterPasswordHash: normalizedRequest.masterPasswordHash,
      key: normalizedRequest.userSymmetricKey,
      masterPasswordHint: normalizedRequest.masterPasswordHint,
      kdf: normalizedRequest.kdf,
      kdfIterations: normalizedRequest.kdfIterations,
      kdfMemory: normalizedRequest.kdfMemory,
      kdfParallelism: normalizedRequest.kdfParallelism,
      keys: normalizedRequest.keys,
    }

    try {
      const response = await fetchFn(`${baseUrl}/api/accounts/set-password`, {
        method: "POST",
        headers: authHeaders(normalizedRequest.accessToken),
        body: JSON.stringify(payload),
      })
      return responseJsonParse(op, response, setPasswordResponseSchema)
    } catch {
      return resultErrorCreate(op, "Set password request failed.", { code: "platform.unavailable", statusCode: 503 })
    }
  }

  const sendVerificationEmail = async (
    request: WebAuthVerificationEmailSendRequestInput,
  ): Promise<Result<{ token?: string; userId?: string }>> => {
    const op = "webAuthApiClient.sendVerificationEmail"
    const requestResult = requestValidationParse(op, request, webAuthVerificationEmailSendRequestSchema)
    if (!requestResult.success) return requestResult
    const normalizedRequest = requestResult.data
    try {
      const response = await fetchFn(`${baseUrl}/identity/accounts/register/send-verification-email`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(normalizedRequest),
      })
      if (response.status === 204) {
        return resultCreate({})
      }
      const result = await webApiResponseParse(
        op,
        response,
        v.union([v.string(), v.object({ userId: v.optional(v.string()), token: v.optional(v.string()) })]),
      )
      if (!result.success) return result
      if (typeof result.data === "string") return resultCreate({ token: result.data })
      return resultCreate(result.data)
    } catch {
      return resultErrorCreate(op, "Failed to send verification email.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  const verifyEmailToken = async (request: WebAuthVerifyEmailRequestInput): Promise<Result<void>> => {
    const op = "webAuthApiClient.verifyEmailToken"
    const requestResult = requestValidationParse(op, request, webAuthVerifyEmailRequestSchema)
    if (!requestResult.success) return requestResult
    try {
      const response = await fetchFn(`${baseUrl}/api/accounts/verify-email-token`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(requestResult.data),
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
    payload: WebAuthTwoFactorDisableRequestInput,
  ): Promise<Result<v.InferOutput<typeof twoFactorDisableResponseSchema>>> => {
    const op = "webAuthApiClient.twoFactorDisable"
    const payloadResult = requestValidationParse(op, payload, webAuthTwoFactorDisableRequestSchema)
    if (!payloadResult.success) return payloadResult
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/disable`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify(payloadResult.data),
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
    payload: WebAuthTwoFactorAuthenticatorActivateRequestInput,
  ): Promise<Result<TwoFactorAuthenticatorResponse>> => {
    const op = "webAuthApiClient.twoFactorAuthenticatorActivate"
    const payloadResult = requestValidationParse(op, payload, webAuthTwoFactorAuthenticatorActivateRequestSchema)
    if (!payloadResult.success) return payloadResult
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/authenticator`, {
        method: "PUT",
        headers: authHeaders(accessToken),
        body: JSON.stringify(payloadResult.data),
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
    payload: WebAuthTwoFactorAuthenticatorDisableRequestInput,
  ): Promise<Result<v.InferOutput<typeof twoFactorDisableResponseSchema>>> => {
    const op = "webAuthApiClient.twoFactorAuthenticatorDisable"
    const payloadResult = requestValidationParse(op, payload, webAuthTwoFactorAuthenticatorDisableRequestSchema)
    if (!payloadResult.success) return payloadResult
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/authenticator`, {
        method: "DELETE",
        headers: authHeaders(accessToken),
        body: JSON.stringify(payloadResult.data),
      })
      return responseJsonParse(op, response, twoFactorDisableResponseSchema)
    } catch {
      return resultErrorCreate(op, "Failed to disable authenticator.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
  }

  const twoFactorEmailLoginSend = async (
    payload: WebAuthTwoFactorEmailLoginSendRequestInput,
  ): Promise<Result<void>> => {
    const op = "webAuthApiClient.twoFactorEmailLoginSend"
    const payloadResult = requestValidationParse(op, payload, webAuthTwoFactorEmailLoginSendRequestSchema)
    if (!payloadResult.success) return payloadResult
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/send-email-login`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payloadResult.data),
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
    payload: WebAuthTwoFactorEmailSendRequestInput,
  ): Promise<Result<void>> => {
    const op = "webAuthApiClient.twoFactorEmailSend"
    const payloadResult = requestValidationParse(op, payload, webAuthTwoFactorEmailSendRequestSchema)
    if (!payloadResult.success) return payloadResult
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/send-email`, {
        method: "POST",
        headers: authHeaders(accessToken),
        body: JSON.stringify(payloadResult.data),
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
    payload: WebAuthTwoFactorEmailActivateRequestInput,
  ): Promise<Result<TwoFactorEmailResponse>> => {
    const op = "webAuthApiClient.twoFactorEmailActivate"
    const payloadResult = requestValidationParse(op, payload, webAuthTwoFactorEmailActivateRequestSchema)
    if (!payloadResult.success) return payloadResult
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/email`, {
        method: "PUT",
        headers: authHeaders(accessToken),
        body: JSON.stringify(payloadResult.data),
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
    payload: WebAuthTwoFactorDuoActivateRequestInput,
  ): Promise<Result<TwoFactorDuoResponse>> => {
    const op = "webAuthApiClient.twoFactorDuoActivate"
    const payloadResult = requestValidationParse(op, payload, webAuthTwoFactorDuoActivateRequestSchema)
    if (!payloadResult.success) return payloadResult
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/duo`, {
        method: "PUT",
        headers: authHeaders(accessToken),
        body: JSON.stringify(payloadResult.data),
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
    payload: WebAuthTwoFactorYubikeyActivateRequestInput,
  ): Promise<Result<TwoFactorYubikeyResponse>> => {
    const op = "webAuthApiClient.twoFactorYubikeyActivate"
    const payloadResult = requestValidationParse(op, payload, webAuthTwoFactorYubikeyActivateRequestSchema)
    if (!payloadResult.success) return payloadResult
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/yubikey`, {
        method: "PUT",
        headers: authHeaders(accessToken),
        body: JSON.stringify({
          key1: payloadResult.data.key1 ?? undefined,
          key2: payloadResult.data.key2 ?? undefined,
          key3: payloadResult.data.key3 ?? undefined,
          key4: payloadResult.data.key4 ?? undefined,
          key5: payloadResult.data.key5 ?? undefined,
          nfc: payloadResult.data.nfc,
          masterPasswordHash: payloadResult.data.masterPasswordHash,
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
    payload: WebAuthTwoFactorWebAuthnActivateRequestInput,
  ): Promise<Result<TwoFactorWebAuthnResponse>> => {
    const op = "webAuthApiClient.twoFactorWebAuthnActivate"
    const payloadResult = requestValidationParse(op, payload, webAuthTwoFactorWebAuthnActivateRequestSchema)
    if (!payloadResult.success) return payloadResult
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/webauthn`, {
        method: "PUT",
        headers: authHeaders(accessToken),
        body: JSON.stringify(payloadResult.data),
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
    payload: WebAuthTwoFactorWebAuthnDeleteRequestInput,
  ): Promise<Result<TwoFactorWebAuthnResponse>> => {
    const op = "webAuthApiClient.twoFactorWebAuthnDelete"
    const payloadResult = requestValidationParse(op, payload, webAuthTwoFactorWebAuthnDeleteRequestSchema)
    if (!payloadResult.success) return payloadResult
    try {
      const response = await fetchFn(`${baseUrl}/api/two-factor/webauthn`, {
        method: "DELETE",
        headers: authHeaders(accessToken),
        body: JSON.stringify(payloadResult.data),
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
    ssoLogin,
    register,
    setPassword,
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
