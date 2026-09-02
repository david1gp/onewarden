import { createRemoteJWKSet, jwtVerify as joseJwtVerify } from "jose"
import * as v from "valibot"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { base64Encode } from "../../../shared/crypto/base64Encode.js"
import { base64UrlEncode } from "../../../shared/crypto/base64UrlEncode.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import { sha256Digest } from "../../../shared/crypto/sha256Digest.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import type { IdentitySsoAdapter } from "./identitySsoAdapter.js"
import type { IdentitySsoAuthenticatedUser } from "./identitySsoAuthenticatedUserSchema.js"
import type { IdentitySsoIdentityClaims } from "./identitySsoIdentityClaimsSchema.js"
import { identitySsoIdentityClaimsSchema } from "./identitySsoIdentityClaimsSchema.js"
import {
  type IdentitySsoProviderConfiguration,
  identitySsoProviderConfigurationSchema,
} from "./identitySsoProviderConfigurationSchema.js"
import { identitySsoRedirectUriResolve } from "./identitySsoRedirectUriResolve.js"
import { identitySsoRefreshTokenResponseSchema } from "./identitySsoRefreshTokenResponseSchema.js"
import { type IdentitySsoTokenResponse, identitySsoTokenResponseSchema } from "./identitySsoTokenResponseSchema.js"
import { type IdentitySsoUserInfo, identitySsoUserInfoSchema } from "./identitySsoUserInfoSchema.js"

function identitySsoProviderUrlResolve(authority: string): string {
  return `${authority.replace(/\/+$/, "")}/.well-known/openid-configuration`
}

function identitySsoProviderUnavailableErrorCreate(op: string, message: string) {
  return resultErrorCreate(op, message, { code: "platform.unavailable", statusCode: 503 })
}

function identitySsoProviderResponseErrorCreate(op: string, message: string, status: number) {
  if (status === 429) return resultErrorCreate(op, message, { code: "platform.rate-limited", statusCode: 429 })
  if (status >= 500) return identitySsoProviderUnavailableErrorCreate(op, message)
  return identityDomainErrorCreate(op, message)
}

async function identitySsoProviderConfigurationGet(
  config: IdentityConfig,
): Promise<Result<IdentitySsoProviderConfiguration>> {
  const op = "identitySsoProviderConfigurationGet"
  if (config.SSO_AUTHORITY === "")
    return identityDomainErrorCreate(op, "Failed to discover OpenID provider: SSO authority is empty")
  let response: Response
  try {
    response = await fetch(identitySsoProviderUrlResolve(config.SSO_AUTHORITY))
  } catch {
    return identitySsoProviderUnavailableErrorCreate(op, "Failed to discover OpenID provider")
  }
  if (!response.ok)
    return identitySsoProviderResponseErrorCreate(
      op,
      `Failed to discover OpenID provider: ${response.status}`,
      response.status,
    )
  let parsedJson: unknown
  try {
    parsedJson = await response.json()
  } catch {
    return identityDomainErrorCreate(op, "Failed to discover OpenID provider")
  }
  const parsed = v.safeParse(identitySsoProviderConfigurationSchema, parsedJson)
  if (!parsed.success) return identityDomainErrorCreate(op, "Failed to discover OpenID provider")
  return resultCreate(parsed.output)
}

function identitySsoExtraParametersParse(value: string): Array<[string, string]> {
  const parameters: Array<[string, string]> = []
  for (const [key, parameter] of new URLSearchParams(value)) parameters.push([key, parameter])
  return parameters
}

async function identitySsoProviderTokenExchange(
  config: IdentityConfig,
  endpoint: string,
  authMethods: string[] | undefined,
  auth: { redirectUri: string },
  code: string,
  codeVerifier: string,
): Promise<Result<IdentitySsoTokenResponse>> {
  const op = "identitySsoProviderTokenExchange"
  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri: auth.redirectUri,
  })
  if (config.SSO_PKCE) body.set("code_verifier", codeVerifier)
  const useBasicAuth = authMethods === undefined || authMethods.includes("client_secret_basic")
  if (!useBasicAuth && !authMethods?.includes("client_secret_post"))
    return identityDomainErrorCreate(
      op,
      `No supported auth_methods (only basic or request body), advertised: ${authMethods?.join(",") ?? ""}`,
    )
  if (useBasicAuth) {
    const credentials = base64Encode(new TextEncoder().encode(`${config.SSO_CLIENT_ID}:${config.SSO_CLIENT_SECRET}`))
    let response: Response
    try {
      response = await fetch(endpoint, {
        body,
        headers: { authorization: `Basic ${credentials}`, "content-type": "application/x-www-form-urlencoded" },
        method: "POST",
      })
    } catch {
      return identitySsoProviderUnavailableErrorCreate(op, "Failed to contact token endpoint")
    }
    if (!response.ok)
      return identitySsoProviderResponseErrorCreate(
        op,
        `Failed to contact token endpoint: ${response.status}`,
        response.status,
      )
    let parsedJson: unknown
    try {
      parsedJson = await response.json()
    } catch {
      return identityDomainErrorCreate(op, "Token response did not contain an id_token")
    }
    const parsed = v.safeParse(identitySsoTokenResponseSchema, parsedJson)
    if (!parsed.success) return identityDomainErrorCreate(op, "Token response did not contain an id_token")
    return resultCreate(parsed.output)
  }
  body.set("client_id", config.SSO_CLIENT_ID)
  body.set("client_secret", config.SSO_CLIENT_SECRET)
  let response: Response
  try {
    response = await fetch(endpoint, {
      body,
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
    })
  } catch {
    return identitySsoProviderUnavailableErrorCreate(op, "Failed to contact token endpoint")
  }
  if (!response.ok)
    return identitySsoProviderResponseErrorCreate(
      op,
      `Failed to contact token endpoint: ${response.status}`,
      response.status,
    )
  let parsedJson: unknown
  try {
    parsedJson = await response.json()
  } catch {
    return identityDomainErrorCreate(op, "Token response did not contain an id_token")
  }
  const parsed = v.safeParse(identitySsoTokenResponseSchema, parsedJson)
  if (!parsed.success) return identityDomainErrorCreate(op, "Token response did not contain an id_token")
  return resultCreate(parsed.output)
}

async function identitySsoProviderRefreshExchange(
  config: IdentityConfig,
  endpoint: string,
  authMethods: string[] | undefined,
  refreshToken: string,
): Promise<Result<{ access_token: string; refresh_token: string | null; expires_in: number | null }>> {
  const op = "identitySsoProviderRefreshExchange"
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken })
  const useBasicAuth = authMethods === undefined || authMethods.includes("client_secret_basic")
  if (!useBasicAuth && !authMethods?.includes("client_secret_post"))
    return identityDomainErrorCreate(
      op,
      `No supported auth_methods (only basic or request body), advertised: ${authMethods?.join(",") ?? ""}`,
    )
  const headers = { "content-type": "application/x-www-form-urlencoded" }
  if (useBasicAuth) {
    const credentials = base64Encode(new TextEncoder().encode(`${config.SSO_CLIENT_ID}:${config.SSO_CLIENT_SECRET}`))
    try {
      const response = await fetch(endpoint, {
        body,
        headers: { ...headers, authorization: `Basic ${credentials}` },
        method: "POST",
      })
      if (!response.ok)
        return identitySsoProviderResponseErrorCreate(
          op,
          `Failed to contact token endpoint: ${response.status}`,
          response.status,
        )
      const parsed = v.safeParse(identitySsoRefreshTokenResponseSchema, await response.json())
      if (!parsed.success) return identityDomainErrorCreate(op, "Token response did not contain an access_token")
      return resultCreate({
        access_token: parsed.output.access_token,
        refresh_token: parsed.output.refresh_token ?? null,
        expires_in: parsed.output.expires_in ?? null,
      })
    } catch {
      return identitySsoProviderUnavailableErrorCreate(op, "Failed to contact token endpoint")
    }
  }
  body.set("client_id", config.SSO_CLIENT_ID)
  body.set("client_secret", config.SSO_CLIENT_SECRET)
  try {
    const response = await fetch(endpoint, { body, headers, method: "POST" })
    if (!response.ok)
      return identitySsoProviderResponseErrorCreate(
        op,
        `Failed to contact token endpoint: ${response.status}`,
        response.status,
      )
    const parsed = v.safeParse(identitySsoRefreshTokenResponseSchema, await response.json())
    if (!parsed.success) return identityDomainErrorCreate(op, "Token response did not contain an access_token")
    return resultCreate({
      access_token: parsed.output.access_token,
      refresh_token: parsed.output.refresh_token ?? null,
      expires_in: parsed.output.expires_in ?? null,
    })
  } catch {
    return identitySsoProviderUnavailableErrorCreate(op, "Failed to contact token endpoint")
  }
}

async function identitySsoIdClaimsRead(
  token: string,
  provider: IdentitySsoProviderConfiguration,
  config: IdentityConfig,
  clock: Clock,
  jwks: ReturnType<typeof createRemoteJWKSet> | undefined,
): Promise<Result<IdentitySsoIdentityClaims>> {
  const op = "identitySsoIdClaimsRead"
  if (jwks === undefined)
    return identityDomainErrorCreate(op, "Could not read id_token claims, provider has no jwks_uri")
  try {
    const verified = await joseJwtVerify(token, jwks, {
      algorithms: ["RS256"],
      audience: config.SSO_CLIENT_ID,
      currentDate: clock.now(),
      issuer: provider.issuer ?? config.SSO_AUTHORITY,
    })
    const parsed = v.safeParse(identitySsoIdentityClaimsSchema, verified.payload)
    if (!parsed.success || parsed.output.nonce === null)
      return identityDomainErrorCreate(op, "Could not read id_token claims")
    return resultCreate(parsed.output)
  } catch {
    return identityDomainErrorCreate(op, "Could not read id_token claims")
  }
}

async function identitySsoUserInfoRead(endpoint: string, accessToken: string): Promise<Result<IdentitySsoUserInfo>> {
  const op = "identitySsoUserInfoRead"
  let response: Response
  try {
    response = await fetch(endpoint, { headers: { authorization: `Bearer ${accessToken}` } })
  } catch {
    return identitySsoProviderUnavailableErrorCreate(op, "Request to user_info endpoint failed")
  }
  if (!response.ok)
    return identitySsoProviderResponseErrorCreate(
      op,
      `Request to user_info endpoint failed: ${response.status}`,
      response.status,
    )
  let parsedJson: unknown
  try {
    parsedJson = await response.json()
  } catch {
    return identityDomainErrorCreate(op, "Request to user_info endpoint failed")
  }
  const parsed = v.safeParse(identitySsoUserInfoSchema, parsedJson)
  if (!parsed.success) return identityDomainErrorCreate(op, "Request to user_info endpoint failed")
  return resultCreate(parsed.output)
}

export function identitySsoAdapterCreate(
  config: IdentityConfig,
  publicOrigin: string | undefined,
  clock: Clock,
): IdentitySsoAdapter {
  const redirectOrigin = publicOrigin?.replace(/\/+$/, "") ?? ""
  return {
    authorize: async ({ clientId, rawRedirectUri, redirectUri, state, clientChallenge, configuration }) => {
      const effectiveConfig = configuration ?? config
      const redirectResult = identitySsoRedirectUriResolve(clientId, rawRedirectUri, redirectOrigin)
      if (!redirectResult.success) return redirectResult
      const providerResult = await identitySsoProviderConfigurationGet(effectiveConfig)
      if (!providerResult.success) return providerResult
      const randomResult = secureRandomBytes(32)
      if (!randomResult.success) return randomResult
      const nonce = base64UrlEncode(randomResult.data)
      const stateValue = base64Encode(new TextEncoder().encode(state))
      let url: URL
      try {
        url = new URL(providerResult.data.authorization_endpoint)
      } catch {
        return identityDomainErrorCreate("identitySsoAdapterAuthorize", "Failed to discover OpenID provider")
      }
      url.searchParams.set("client_id", effectiveConfig.SSO_CLIENT_ID)
      url.searchParams.set("redirect_uri", redirectUri)
      url.searchParams.set("response_type", "code")
      url.searchParams.set("scope", `openid ${effectiveConfig.SSO_SCOPES}`.trim())
      url.searchParams.set("state", stateValue)
      url.searchParams.set("nonce", nonce)
      for (const [key, value] of identitySsoExtraParametersParse(effectiveConfig.SSO_AUTHORIZE_EXTRA_PARAMS))
        url.searchParams.set(key, value)
      if (effectiveConfig.SSO_PKCE) {
        url.searchParams.set("code_challenge", clientChallenge)
        url.searchParams.set("code_challenge_method", "S256")
      }
      return resultCreate({ authorizationUrl: url.toString(), nonce })
    },
    exchange: async ({ auth, code, codeVerifier, configuration }) => {
      const effectiveConfig = configuration ?? config
      const providerResult = await identitySsoProviderConfigurationGet(effectiveConfig)
      if (!providerResult.success) return providerResult
      if (!effectiveConfig.SSO_PKCE) {
        const digestResult = await sha256Digest(new TextEncoder().encode(codeVerifier))
        if (!digestResult.success)
          return identityDomainErrorCreate("identitySsoAdapterExchange", "PKCE client challenge failed")
        if (base64UrlEncode(digestResult.data) !== auth.clientChallenge)
          return identityDomainErrorCreate("identitySsoAdapterExchange", "PKCE client challenge failed")
      }
      const tokenResult = await identitySsoProviderTokenExchange(
        effectiveConfig,
        providerResult.data.token_endpoint,
        providerResult.data.token_endpoint_auth_methods_supported,
        auth,
        code,
        codeVerifier,
      )
      if (!tokenResult.success) return tokenResult
      const provider = providerResult.data
      let jwks: ReturnType<typeof createRemoteJWKSet> | undefined
      if (provider.jwks_uri !== undefined) {
        try {
          jwks = createRemoteJWKSet(new URL(provider.jwks_uri))
        } catch {
          return identityDomainErrorCreate("identitySsoAdapterExchange", "Could not read id_token claims")
        }
      }
      const claimsResult = await identitySsoIdClaimsRead(
        tokenResult.data.id_token,
        provider,
        effectiveConfig,
        clock,
        jwks,
      )
      if (!claimsResult.success) return claimsResult
      if (claimsResult.data.nonce !== auth.nonce)
        return identityDomainErrorCreate("identitySsoAdapterExchange", "Could not read id_token claims")
      let userInfo: IdentitySsoUserInfo | null = null
      if (provider.userinfo_endpoint !== undefined) {
        const userInfoResult = await identitySsoUserInfoRead(provider.userinfo_endpoint, tokenResult.data.access_token)
        if (!userInfoResult.success) return userInfoResult
        userInfo = userInfoResult.data
      }
      const email = claimsResult.data.email ?? userInfo?.email
      if (email === undefined || email === null)
        return identityDomainErrorCreate(
          "identitySsoAdapterExchange",
          "Neither id token nor userinfo contained an email",
        )
      return resultCreate<IdentitySsoAuthenticatedUser>({
        refresh_token: tokenResult.data.refresh_token ?? null,
        access_token: tokenResult.data.access_token,
        expires_in: tokenResult.data.expires_in ?? null,
        identifier: `${claimsResult.data.iss}/${claimsResult.data.sub}`,
        email: email.toLowerCase(),
        email_verified: claimsResult.data.email_verified ?? userInfo?.email_verified ?? null,
        user_name: claimsResult.data.preferred_username ?? userInfo?.preferred_username ?? null,
      })
    },
    refresh: async (refreshToken, configuration) => {
      const effectiveConfig = configuration ?? config
      const providerResult = await identitySsoProviderConfigurationGet(effectiveConfig)
      if (!providerResult.success) return providerResult
      return identitySsoProviderRefreshExchange(
        effectiveConfig,
        providerResult.data.token_endpoint,
        providerResult.data.token_endpoint_auth_methods_supported,
        refreshToken,
      )
    },
    validateAccessToken: async (accessToken, configuration) => {
      const effectiveConfig = configuration ?? config
      const providerResult = await identitySsoProviderConfigurationGet(effectiveConfig)
      if (!providerResult.success) return providerResult
      if (providerResult.data.userinfo_endpoint === undefined)
        return identityDomainErrorCreate(
          "identitySsoAdapterValidateAccessToken",
          "Request to user_info endpoint failed",
        )
      const userInfoResult = await identitySsoUserInfoRead(providerResult.data.userinfo_endpoint, accessToken)
      if (!userInfoResult.success) return userInfoResult
      return resultCreate(undefined)
    },
  }
}
