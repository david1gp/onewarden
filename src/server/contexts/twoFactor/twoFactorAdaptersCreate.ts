import {
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server"
import { createHmac } from "node:crypto"
import type { Result } from "#result"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { base64Decode } from "../../../shared/crypto/base64Decode.js"
import { base64UrlDecode } from "../../../shared/crypto/base64UrlDecode.js"
import { base64UrlEncode } from "../../../shared/crypto/base64UrlEncode.js"
import type { Clock } from "../../../shared/clock/clock.js"
import { clockCreate } from "../../../shared/clock/clockCreate.js"
import { constantTimeStringsEqual } from "../../../shared/crypto/constantTimeStringsEqual.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { TwoFactorAdapters, TwoFactorDuoCredentials, TwoFactorDuoLogin } from "./twoFactorAdapters.js"
import type { TwoFactorWebAuthnAuthentication } from "./twoFactorWebAuthnAuthentication.js"

const adapterRequestTimeoutMilliseconds = 10_000

type TwoFactorAdapterConfiguration = Pick<
  IdentityConfig,
  "YUBICO_CLIENT_ID" | "YUBICO_ENABLED" | "YUBICO_SECRET_KEY" | "YUBICO_SERVER"
>

export function twoFactorAdaptersCreate(
  overrides?: TwoFactorAdapters,
  config?: TwoFactorAdapterConfiguration,
  clock: Clock = clockCreate(),
): TwoFactorAdapters {
  return {
    duo: {
      credentialsValidate: async (credentials) => {
        try {
          const overrideResult = await overrides?.duo?.credentialsValidate?.(credentials)
          if (overrideResult !== undefined) return overrideResult
        } catch {
          return resultErrorCreate("twoFactorDuoCredentialsValidate", "Duo credentials validation failed")
        }
        return twoFactorDuoCredentialsValidate(credentials)
      },
      loginValidate: async (login) => {
        try {
          const overrideResult = await overrides?.duo?.loginValidate?.(login)
          if (overrideResult !== undefined) return overrideResult
        } catch {
          return resultErrorCreate("twoFactorDuoLoginValidate", "Duo login validation failed")
        }
        return twoFactorDuoLoginValidate(login, clock)
      },
    },
    yubikey: {
      otpValidate: async (otp) => {
        try {
          const overrideResult = await overrides?.yubikey?.otpValidate?.(otp)
          if (overrideResult !== undefined) return overrideResult
        } catch {
          return resultErrorCreate("twoFactorYubikeyValidate", "Yubikey OTP validation failed")
        }
        return twoFactorYubikeyOtpValidate(otp, config)
      },
    },
    webauthn: {
      registrationValidate: async (response, state) => {
        try {
          const overrideResult = await overrides?.webauthn?.registrationValidate?.(response, state)
          if (overrideResult !== undefined) return overrideResult
        } catch {
          return resultErrorCreate("twoFactorWebAuthnRegistrationValidate", "Webauthn registration validation failed")
        }
        if (state.expiresAt <= Math.floor(clock.now().getTime() / 1_000))
          return resultErrorCreate("twoFactorWebAuthnRegistrationValidate", "Webauthn registration challenge expired")
        const normalized = webauthnResponseNormalize(response)
        try {
          const verification = await verifyRegistrationResponse({
            response: normalized as RegistrationResponseJSON,
            expectedChallenge: state.challenge,
            expectedOrigin: state.origin,
            expectedRPID: state.rpId,
            requireUserPresence: true,
            requireUserVerification: false,
            supportedAlgorithmIDs: [-7, -257],
          })
          if (!verification.verified)
            return resultErrorCreate("twoFactorWebAuthnRegistrationValidate", "Webauthn registration was not verified")
          const credential = verification.registrationInfo.credential
          const responseId = webauthnResponseStringRead(normalized, "id")
          const rawId = webauthnResponseStringRead(normalized, "rawId")
          if (responseId === undefined || rawId === undefined || responseId !== rawId || credential.id !== rawId)
            return resultErrorCreate("twoFactorWebAuthnRegistrationValidate", "Webauthn credential ID was invalid")
          return {
            success: true,
            data: {
              counter: credential.counter,
              id: credential.id,
              publicKey: base64UrlEncode(new Uint8Array(credential.publicKey)),
              transports: credential.transports,
            },
          }
        } catch {
          return resultErrorCreate("twoFactorWebAuthnRegistrationValidate", "Webauthn registration was invalid")
        }
      },
      loginValidate: async (response, state) => {
        try {
          const overrideResult = await overrides?.webauthn?.loginValidate?.(response, state)
          if (overrideResult !== undefined) return overrideResult
        } catch {
          return resultErrorCreate("twoFactorWebAuthnLoginValidate", "Webauthn login validation failed")
        }
        if (state.expiresAt <= Math.floor(clock.now().getTime() / 1_000))
          return resultErrorCreate("twoFactorWebAuthnLoginValidate", "Webauthn login challenge expired")
        const normalized = webauthnResponseNormalize(response)
        if (state.credentials === undefined)
          return resultErrorCreate("twoFactorWebAuthnLoginValidate", "Webauthn credentials are unavailable")
        if (typeof normalized !== "object" || normalized === null || Array.isArray(normalized))
          return resultErrorCreate("twoFactorWebAuthnLoginValidate", "Webauthn assertion was invalid")
        const responseId = (normalized as Record<string, unknown>).id
        const rawId = webauthnResponseStringRead(normalized, "rawId")
        if (typeof responseId !== "string" || rawId === undefined || responseId !== rawId)
          return resultErrorCreate("twoFactorWebAuthnLoginValidate", "Webauthn assertion was invalid")
        const storedCredential = state.credentials.find((credential) => credential.id === responseId)
        if (
          storedCredential === undefined ||
          storedCredential.publicKey === undefined ||
          storedCredential.counter === undefined
        )
          return resultErrorCreate("twoFactorWebAuthnLoginValidate", "Webauthn credential was not found")
        const publicKeyResult = base64UrlDecode(storedCredential.publicKey)
        if (!publicKeyResult.success)
          return resultErrorCreate("twoFactorWebAuthnLoginValidate", "Webauthn credential was invalid")
        try {
          const verification = await verifyAuthenticationResponse({
            response: normalized as AuthenticationResponseJSON,
            expectedChallenge: state.challenge,
            expectedOrigin: state.origin,
            expectedRPID: state.rpId,
            credential: {
              counter: storedCredential.counter,
              id: storedCredential.id,
              publicKey: Uint8Array.from(publicKeyResult.data),
              transports: storedCredential.transports as never,
            },
            advancedFIDOConfig: { userVerification: "discouraged" },
          })
          if (!verification.verified)
            return resultErrorCreate("twoFactorWebAuthnLoginValidate", "Webauthn assertion was not verified")
          const result: TwoFactorWebAuthnAuthentication = {
            credentialId: verification.authenticationInfo.credentialID,
            newCounter: verification.authenticationInfo.newCounter,
          }
          return { success: true, data: result }
        } catch {
          return resultErrorCreate("twoFactorWebAuthnLoginValidate", "Webauthn assertion was invalid")
        }
      },
    },
  }
}

async function twoFactorDuoCredentialsValidate(credentials: TwoFactorDuoCredentials): Promise<Result<void>> {
  const op = "twoFactorDuoCredentialsValidate"
  const urlResult = twoFactorDuoCheckUrlCreate(credentials.host)
  if (!urlResult.success) return urlResult
  const date = new Date().toUTCString()
  const signature = twoFactorDuoSignatureCreate(credentials.clientSecret, [
    date,
    "GET",
    credentials.host,
    "/auth/v2/check",
    "",
  ])
  try {
    const response = await fetch(urlResult.data, {
      headers: {
        authorization: `Basic ${Buffer.from(`${credentials.clientId}:${signature}`).toString("base64")}`,
        date,
        "user-agent": "onewarden:Duo/1.0 (TypeScript)",
      },
      method: "GET",
      signal: AbortSignal.timeout(adapterRequestTimeoutMilliseconds),
    })
    if (!response.ok) return resultErrorCreate(op, "Duo credentials validation failed")
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Duo credentials validation failed")
  }
}

async function twoFactorDuoLoginValidate(login: TwoFactorDuoLogin, clock: Clock): Promise<Result<void>> {
  const op = "twoFactorDuoLoginValidate"
  const parts = login.token.split(":")
  if (parts.length !== 2) return resultErrorCreate(op, "Invalid response length")
  const now = Math.floor(clock.now().getTime() / 1_000)
  const authResult = twoFactorDuoValueRead(
    login.credentials.clientSecret,
    parts[0] as string,
    login.credentials.clientId,
    "AUTH",
    now,
  )
  if (!authResult.success) return authResult
  const appResult = twoFactorDuoValueRead(
    login.credentials.clientSecret,
    parts[1] as string,
    login.credentials.clientId,
    "APP",
    now,
  )
  if (!appResult.success) return appResult
  if (
    !constantTimeStringsEqual(authResult.data, appResult.data) ||
    !constantTimeStringsEqual(authResult.data, login.email)
  )
    return resultErrorCreate(op, "Error validating duo authentication")
  return resultCreate(undefined)
}

function twoFactorDuoValueRead(
  secret: string,
  value: string,
  clientId: string,
  expectedPrefix: string,
  now: number,
): Result<string> {
  const parts = value.split("|")
  if (parts.length !== 3) return resultErrorCreate("twoFactorDuoLoginValidate", "Invalid value length")
  const [prefix, encoded, receivedSignature] = parts
  if (prefix === undefined || encoded === undefined || receivedSignature === undefined)
    return resultErrorCreate("twoFactorDuoLoginValidate", "Invalid value length")
  const expectedSignature = twoFactorDuoSignatureCreate(secret, [`${prefix}|${encoded}`])
  if (!constantTimeStringsEqual(expectedSignature, receivedSignature))
    return resultErrorCreate("twoFactorDuoLoginValidate", "Duo signatures don't match")
  if (prefix !== expectedPrefix) return resultErrorCreate("twoFactorDuoLoginValidate", "Prefixes don't match")
  const decodedResult = base64Decode(encoded)
  if (!decodedResult.success) return resultErrorCreate("twoFactorDuoLoginValidate", "Invalid Duo cookie encoding")
  const decoded = new TextDecoder().decode(decodedResult.data)
  const cookie = decoded.split("|")
  if (cookie.length !== 3) return resultErrorCreate("twoFactorDuoLoginValidate", "Invalid cookie length")
  const [email, receivedClientId, expirationText] = cookie
  if (email === undefined || receivedClientId === undefined || expirationText === undefined)
    return resultErrorCreate("twoFactorDuoLoginValidate", "Invalid cookie length")
  if (!constantTimeStringsEqual(clientId, receivedClientId))
    return resultErrorCreate("twoFactorDuoLoginValidate", "Invalid ikey")
  if (!/^\d+$/u.test(expirationText)) return resultErrorCreate("twoFactorDuoLoginValidate", "Invalid expire time")
  const expiration = Number(expirationText)
  if (!Number.isSafeInteger(expiration)) return resultErrorCreate("twoFactorDuoLoginValidate", "Invalid expire time")
  if (now >= expiration) return resultErrorCreate("twoFactorDuoLoginValidate", "Expired authorization")
  return resultCreate(email)
}

function twoFactorDuoSignatureCreate(secret: string, values: string[]): string {
  return createHmac("sha1", secret).update(values.join("\n")).digest("hex")
}

function twoFactorDuoCheckUrlCreate(host: string): Result<string> {
  try {
    const url = new URL(`https://${host}/auth/v2/check`)
    if (
      url.protocol !== "https:" ||
      url.hostname === "" ||
      url.username !== "" ||
      url.password !== "" ||
      url.pathname !== "/auth/v2/check" ||
      url.search !== "" ||
      url.hash !== ""
    )
      return resultErrorCreate("twoFactorDuoCredentialsValidate", "Duo host is invalid")
    return resultCreate(url.toString())
  } catch {
    return resultErrorCreate("twoFactorDuoCredentialsValidate", "Duo host is invalid")
  }
}

async function twoFactorYubikeyOtpValidate(
  otp: string,
  config: TwoFactorAdapterConfiguration | undefined,
): Promise<Result<void>> {
  const op = "twoFactorYubikeyValidate"
  if (
    config === undefined ||
    !config.YUBICO_ENABLED ||
    config.YUBICO_CLIENT_ID.trim() === "" ||
    config.YUBICO_SECRET_KEY.trim() === ""
  )
    return resultErrorCreate(op, "Yubico adapter unavailable")
  if (new TextEncoder().encode(otp).byteLength !== 44) return resultErrorCreate(op, "Invalid Yubikey OTP length")
  const nonceResult = secureRandomBytes(16)
  if (!nonceResult.success) return nonceResult
  const nonce = base64UrlEncode(nonceResult.data)
  const endpointResult = twoFactorYubikeyEndpointCreate(config.YUBICO_SERVER)
  if (!endpointResult.success) return endpointResult
  const url = new URL(endpointResult.data)
  url.searchParams.set("id", config.YUBICO_CLIENT_ID)
  url.searchParams.set("otp", otp)
  url.searchParams.set("nonce", nonce)
  url.searchParams.set("sl", "secure")
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(adapterRequestTimeoutMilliseconds),
    })
    if (!response.ok) return resultErrorCreate(op, "Failed to verify Yubikey against OTP server")
    const fields = twoFactorYubikeyResponseRead(await response.text())
    if (!fields.success) return fields
    if (fields.data.status !== "OK") return resultErrorCreate(op, "Failed to verify Yubikey against OTP server")
    if (fields.data.otp !== otp || fields.data.nonce !== nonce)
      return resultErrorCreate(op, "Yubikey OTP response did not match request")
    const secretResult = base64Decode(config.YUBICO_SECRET_KEY.trim())
    if (!secretResult.success || secretResult.data.byteLength === 0)
      return resultErrorCreate(op, "Yubico secret key is invalid")
    const signedFields = Object.entries(fields.data)
      .filter(([key]) => key !== "h")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join("&")
    const expectedSignature = createHmac("sha1", secretResult.data).update(signedFields).digest("base64")
    if (fields.data.h === undefined || !constantTimeStringsEqual(expectedSignature, fields.data.h))
      return resultErrorCreate(op, "Yubikey OTP response signature is invalid")
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Yubikey OTP validation failed")
  }
}

function twoFactorYubikeyEndpointCreate(configuredServer: string | undefined): Result<string> {
  const server =
    configuredServer === undefined || configuredServer.trim() === "" ? "https://api.yubico.com" : configuredServer
  try {
    const url = new URL(server)
    if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.search !== "" || url.hash !== "")
      return resultErrorCreate("twoFactorYubikeyValidate", "Yubico server is invalid")
    if (url.pathname === "/" || url.pathname === "") url.pathname = "/wsapi/2.0/verify"
    return resultCreate(url.toString())
  } catch {
    return resultErrorCreate("twoFactorYubikeyValidate", "Yubico server is invalid")
  }
}

function twoFactorYubikeyResponseRead(body: string): Result<Record<string, string>> {
  const fields: Record<string, string> = {}
  for (const line of body.split(/\r?\n/u)) {
    if (line === "") continue
    const separator = line.indexOf("=")
    if (separator <= 0) return resultErrorCreate("twoFactorYubikeyValidate", "Yubico response is invalid")
    const key = line.slice(0, separator)
    if (fields[key] !== undefined) return resultErrorCreate("twoFactorYubikeyValidate", "Yubico response is invalid")
    fields[key] = line.slice(separator + 1)
  }
  if (fields.status === undefined) return resultErrorCreate("twoFactorYubikeyValidate", "Yubico response is invalid")
  return resultCreate(fields)
}

function webauthnResponseNormalize(response: unknown): unknown {
  if (typeof response !== "object" || response === null || Array.isArray(response)) return response
  const normalized = { ...(response as Record<string, unknown>) }
  if (normalized.rawId === undefined && normalized.raw_id !== undefined) normalized.rawId = normalized.raw_id
  if (normalized.clientExtensionResults === undefined && normalized.client_extension_results !== undefined)
    normalized.clientExtensionResults = normalized.client_extension_results
  const nested = normalized.response
  if (typeof nested !== "object" || nested === null || Array.isArray(nested)) return normalized
  const nestedResponse = { ...(nested as Record<string, unknown>) }
  if (nestedResponse.clientDataJSON === undefined && nestedResponse.clientDataJson !== undefined)
    nestedResponse.clientDataJSON = nestedResponse.clientDataJson
  if (nestedResponse.clientDataJSON === undefined && nestedResponse.client_data_json !== undefined)
    nestedResponse.clientDataJSON = nestedResponse.client_data_json
  if (nestedResponse.attestationObject === undefined && nestedResponse.AttestationObject !== undefined)
    nestedResponse.attestationObject = nestedResponse.AttestationObject
  if (nestedResponse.attestationObject === undefined && nestedResponse.attestation_object !== undefined)
    nestedResponse.attestationObject = nestedResponse.attestation_object
  if (nestedResponse.authenticatorData === undefined && nestedResponse.authenticator_data !== undefined)
    nestedResponse.authenticatorData = nestedResponse.authenticator_data
  if (nestedResponse.userHandle === undefined && nestedResponse.user_handle !== undefined)
    nestedResponse.userHandle = nestedResponse.user_handle
  normalized.response = nestedResponse
  return normalized
}

function webauthnResponseStringRead(response: unknown, key: string): string | undefined {
  if (typeof response !== "object" || response === null || Array.isArray(response)) return undefined
  const value = (response as Record<string, unknown>)[key]
  return typeof value === "string" && value !== "" ? value : undefined
}
