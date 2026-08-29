import type { Context, Hono } from "hono"
import * as v from "valibot"
import type { ResultErr } from "#result"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import { identityOriginResolve } from "./identityOriginResolve.js"
import { identityApiKeyLogin } from "./identityApiKeyLogin.js"
import { identityPrelogin } from "./identityPrelogin.js"
import { identityPreloginDataSchema } from "./identityPreloginDataSchema.js"
import { identityRegistration } from "./identityRegistration.js"
import { identityRegistrationDataSchema } from "./identityRegistrationDataSchema.js"
import { identityAccountRegisterVerificationDataSchema } from "./identityAccountRegisterVerificationDataSchema.js"
import { identityRegistrationVerificationEmail } from "./identityRegistrationVerificationEmail.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import { identityPasswordLogin } from "./identityPasswordLogin.js"
import { identityRefreshLogin } from "./identityRefreshLogin.js"
import type { IdentityRouteOptions } from "./identityRouteOptions.js"
import { identityAccountRoutesRegister } from "./identityAccountRoutesRegister.js"
import { identitySsoAuthorize } from "./identitySsoAuthorize.js"
import { identitySsoAuthorizeDataSchema } from "./identitySsoAuthorizeDataSchema.js"
import { identitySsoCallback } from "./identitySsoCallback.js"
import { identitySsoLogin } from "./identitySsoLogin.js"
import { identitySsoPrevalidateTokenCreate } from "./identitySsoPrevalidateTokenCreate.js"
import { identitySsoAdapterCreate } from "./identitySsoAdapterCreate.js"
import { identityTokenRequestParse } from "./identityTokenRequestParse.js"
import { identityDevicePushRoutesRegister } from "./identityDevicePushRoutesRegister.js"
import { sendAccessTokenCreate } from "../sends/sendAccessTokenCreate.js"
import { twoFactorRoutesRegister } from "../twoFactor/twoFactorRoutesRegister.js"

export function identityRoutesRegister(app: Hono<any>, options: IdentityRouteOptions): void {
  const sso = options.sso ?? identitySsoAdapterCreate(options.config, options.publicOrigin, options.clock)
  const token = async (context: Context) => {
    let form: unknown
    try {
      form = await context.req.parseBody()
    } catch {
      return apiErrorResponseCreate(identityDomainErrorCreate("identityTokenRequestParse", "Invalid request."))
    }
    const bodyResult = identityTokenRequestParse(form)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const data = bodyResult.data
    const issuer = identityOriginResolve(options.publicOrigin, context.req.url)
    if (data.grantType === "refresh_token") {
      const result = await identityRefreshLogin(data.refreshToken, data.clientId, {
        clock: options.clock,
        config: options.config,
        database: options.database,
        issuer,
        privateKey: options.privateKey,
        publicKey: options.publicKey,
        sso,
      })
      if (!result.success) return identityInvalidGrantResponse()
      return context.json(result.data)
    }
    if (data.grantType === "send_access") {
      if (data.clientId === undefined)
        return identitySendAccessErrorResponse("client_id cannot be blank", "send_id_invalid", 400)
      if (data.sendId === undefined)
        return identitySendAccessErrorResponse("send_id cannot be blank", "send_id_invalid", 400)
      if (options.database === undefined)
        return identitySendAccessErrorResponse("Database unavailable.", "send_id_invalid", 500)
      const result = await sendAccessTokenCreate(
        options.database,
        data.sendId,
        data.passwordHashB64,
        identityClientIpResolve(context),
        options.privateKey,
        issuer,
        options.clock,
      )
      if (!result.success) return identitySendAccessResultErrorResponse(result)
      return context.json({
        access_token: result.data.accessToken,
        expires_in: result.data.expiresIn,
        token_type: "Bearer",
        scope: "api.send.access",
      })
    }
    if (data.grantType === "client_credentials") {
      const requiredFields: Array<[string, string | undefined]> = [
        ["client_id", data.clientId],
        ["client_secret", data.clientSecret],
        ["scope", data.scope],
        ["device_identifier", data.deviceIdentifier],
        ["device_name", data.deviceName],
        ["device_type", data.deviceType],
      ]
      for (const [field, value] of requiredFields) {
        if (value === undefined)
          return apiErrorResponseCreate(identityDomainErrorCreate("identityApiKeyLogin", `${field} cannot be blank`))
      }
      const result = await identityApiKeyLogin(data, {
        clock: options.clock,
        config: options.config,
        database: options.database,
        identifier: options.identifier,
        issuer,
        privateKey: options.privateKey,
        rateLimiter: options.rateLimiter,
        clientIp: identityClientIpResolve(context),
      })
      if (!result.success) return apiErrorResponseCreate(result)
      return context.json(result.data)
    }
    if (data.grantType === "authorization_code" && !options.config.SSO_ENABLED)
      return apiErrorResponseCreate(identityDomainErrorCreate("identitySsoLogin", "SSO sign-in is not available"))
    if (data.grantType === "authorization_code") {
      const requiredFields: Array<[string, string | undefined]> = [
        ["client_id", data.clientId],
        ["code", data.code],
        ["code verifier", data.codeVerifier],
        ["device_identifier", data.deviceIdentifier],
        ["device_name", data.deviceName],
        ["device_type", data.deviceType],
      ]
      for (const [field, value] of requiredFields) {
        if (value === undefined)
          return apiErrorResponseCreate(identityDomainErrorCreate("identitySsoLogin", `${field} cannot be blank`))
      }
      const result = await identitySsoLogin(data, {
        clock: options.clock,
        config: options.config,
        database: options.database,
        identifier: options.identifier,
        issuer,
        privateKey: options.privateKey,
        rateLimiter: options.rateLimiter,
        clientIp: identityClientIpResolve(context),
        sso,
        push: options.push,
      })
      if (!result.success) return apiErrorResponseCreate(result)
      return context.json(result.data)
    }
    if (data.grantType === "password") {
      if (options.config.SSO_ENABLED && options.config.SSO_ONLY)
        return apiErrorResponseCreate(identityDomainErrorCreate("identityPasswordLogin", "SSO sign-in is required"))
      const requiredFields: Array<[string, string | undefined]> = [
        ["client_id", data.clientId],
        ["password", data.password],
        ["scope", data.scope],
        ["username", data.username],
        ["device_identifier", data.deviceIdentifier],
        ["device_name", data.deviceName],
        ["device_type", data.deviceType],
      ]
      for (const [field, value] of requiredFields) {
        if (value === undefined)
          return apiErrorResponseCreate(identityDomainErrorCreate("identityPasswordLogin", `${field} cannot be blank`))
      }
      const result = await identityPasswordLogin(data, {
        clock: options.clock,
        config: options.config,
        database: options.database,
        identifier: options.identifier,
        issuer,
        mail: options.mail,
        privateKey: options.privateKey,
        rateLimiter: options.rateLimiter,
        clientIp: identityClientIpResolve(context),
        push: options.push,
        publicKey: options.publicKey,
        publicOrigin: options.publicOrigin,
        clientVersion: context.req.header("Bitwarden-Client-Version"),
        twoFactor: options.twoFactor,
      })
      if (!result.success) {
        const twoFactorResponse = identityTwoFactorLoginResponse(result)
        if (twoFactorResponse !== undefined) return twoFactorResponse
      }
      if (!result.success) return apiErrorResponseCreate(result)
      return context.json(result.data)
    }
    return apiErrorResponseCreate(identityDomainErrorCreate("identityToken", "Invalid type"))
  }

  const prelogin = async (context: Context) => {
    const bodyResult = await requestBodyParse(context, identityPreloginDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const result = await identityPrelogin(options.database, bodyResult.data.email)
    if (!result.success) return apiErrorResponseCreate(result)
    return context.json(result.data)
  }

  const register = async (context: Context, emailVerification: boolean) => {
    const bodyResult = await requestBodyParse(context, identityRegistrationDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const result = await identityRegistration(bodyResult.data, emailVerification, {
      clock: options.clock,
      config: options.config,
      database: options.database,
      identifier: options.identifier,
      issuer: identityOriginResolve(options.publicOrigin, context.req.url),
      mail: options.mail,
      privateKey: options.privateKey,
      publicKey: options.publicKey,
    })
    if (!result.success) return apiErrorResponseCreate(result)
    return context.json(result.data)
  }

  const prevalidate = async (context: Context) => {
    if (!options.config.SSO_ENABLED)
      return apiErrorResponseCreate(
        identityDomainErrorCreate("identitySsoPrevalidateTokenCreate", "SSO sign-in is not available"),
      )
    const issuer = identityOriginResolve(options.publicOrigin, context.req.url)
    const result = await identitySsoPrevalidateTokenCreate(issuer, options.privateKey, options.clock)
    if (!result.success) return apiErrorResponseCreate(result)
    return context.json({ token: result.data })
  }

  const authorize = async (context: Context) => {
    const query = context.req.query()
    const normalized: Record<string, string> = {}
    const aliases: Record<string, string> = {
      client_id: "clientId",
      clientid: "clientId",
      redirect_uri: "redirectUri",
      redirecturi: "redirectUri",
      response_type: "responseType",
      responsetype: "responseType",
      scope: "scope",
      state: "state",
      code_challenge: "codeChallenge",
      codechallenge: "codeChallenge",
      code_challenge_method: "codeChallengeMethod",
      codechallengemethod: "codeChallengeMethod",
      response_mode: "responseMode",
      responsemode: "responseMode",
      domain_hint: "domainHint",
      domainhint: "domainHint",
      ssotoken: "ssoToken",
    }
    for (const [key, value] of Object.entries(query)) {
      const field = aliases[key.toLowerCase()]
      if (field !== undefined && normalized[field] === undefined) normalized[field] = value
    }
    const parsed = v.safeParse(identitySsoAuthorizeDataSchema, normalized)
    if (!parsed.success)
      return apiErrorResponseCreate(identityDomainErrorCreate("identitySsoAuthorize", "Invalid request."))
    const issuer = identityOriginResolve(options.publicOrigin, context.req.url)
    const result = await identitySsoAuthorize(parsed.output, {
      clock: options.clock,
      database: options.database,
      issuer,
      sso,
    })
    if (!result.success) return apiErrorResponseCreate(result)
    const secure = new URL(context.req.url).protocol === "https:" || context.req.header("x-forwarded-proto") === "https"
    const cookie = `VW_SSO_BINDING=${result.data.bindingToken}; Path=/identity/connect/; Max-Age=600; SameSite=Lax; HttpOnly${secure ? "; Secure" : ""}`
    return new Response(null, {
      headers: { location: result.data.authorizationUrl, "set-cookie": cookie },
      status: 307,
    })
  }

  const oidcSignin = async (context: Context) => {
    const query = context.req.query()
    const state = query.state
    if (state === undefined || (query.code === undefined && query.error === undefined))
      return apiErrorResponseCreate(identityDomainErrorCreate("identitySsoCallback", "Invalid request."))
    const cookieHeader = context.req.header("cookie")
    const bindingToken = cookieHeader
      ?.split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith("VW_SSO_BINDING="))
      ?.slice("VW_SSO_BINDING=".length)
    const error =
      query.code !== undefined || query.error === undefined
        ? null
        : { error: query.error, errorDescription: query.error_description ?? null }
    const code = query.code ?? state
    const issuer = identityOriginResolve(options.publicOrigin, context.req.url)
    const result = await identitySsoCallback(state, code, error, {
      clock: options.clock,
      database: options.database,
      issuer,
      bindingToken,
    })
    if (!result.success) return apiErrorResponseCreate(result)
    const secure = new URL(context.req.url).protocol === "https:" || context.req.header("x-forwarded-proto") === "https"
    const clearCookie = `VW_SSO_BINDING=; Path=/identity/connect/; Max-Age=0; SameSite=Lax; HttpOnly${secure ? "; Secure" : ""}`
    return new Response(null, { headers: { location: result.data.location, "set-cookie": clearCookie }, status: 307 })
  }

  app.post("/identity/accounts/prelogin", prelogin)
  app.post("/identity/accounts/prelogin/password", prelogin)
  app.post("/api/accounts/prelogin", prelogin)
  app.post("/identity/connect/token", token)
  app.get("/identity/sso/prevalidate", prevalidate)
  app.get("/identity/connect/authorize", authorize)
  app.get("/identity/connect/oidc-signin", oidcSignin)
  app.post("/identity/accounts/register", (context) => register(context, false))
  app.post("/identity/accounts/register/finish", (context) => register(context, true))
  app.post("/identity/accounts/register/send-verification-email", async (context) => {
    const rateLimitResult = options.rateLimiter.check(identityClientIpResolve(context))
    if (!rateLimitResult.success) return apiErrorResponseCreate(rateLimitResult)
    const bodyResult = await requestBodyParse(context, identityAccountRegisterVerificationDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const result = await identityRegistrationVerificationEmail(bodyResult.data.email, bodyResult.data.name ?? null, {
      clock: options.clock,
      config: options.config,
      database: options.database,
      issuer: identityOriginResolve(options.publicOrigin, context.req.url),
      mail: options.mail,
      privateKey: options.privateKey,
    })
    if (!result.success) return apiErrorResponseCreate(result)
    if (result.data.kind === "noContent") return new Response(null, { status: 204 })
    return context.json(result.data.token)
  })
  identityAccountRoutesRegister(app, options)
  twoFactorRoutesRegister(app, options)
  identityDevicePushRoutesRegister(app, options)
}

function identityTwoFactorLoginResponse(error: ResultErr): Response | undefined {
  if (error.errorData === undefined || error.errorData === null) return undefined
  try {
    const data = JSON.parse(error.errorData) as {
      twoFactorLogin?: { providers: number[]; providers2: Record<string, unknown> }
    }
    if (data.twoFactorLogin === undefined) return undefined
    return new Response(
      JSON.stringify({
        error: "invalid_grant",
        error_description: "Two factor required.",
        TwoFactorProviders: data.twoFactorLogin.providers.map(String),
        TwoFactorProviders2: data.twoFactorLogin.providers2,
        MasterPasswordPolicy: { Object: "masterPasswordPolicy" },
      }),
      { headers: { "content-type": "application/json" }, status: 400 },
    )
  } catch {
    return undefined
  }
}

function identityInvalidGrantResponse(): Response {
  return new Response(JSON.stringify({ error: "invalid_grant" }), {
    headers: { "content-type": "application/json" },
    status: 400,
  })
}

function identitySendAccessResultErrorResponse(error: ResultErr): Response {
  let sendAccessErrorType = "send_id_invalid"
  if (error.errorData !== undefined && error.errorData !== null) {
    try {
      const data: unknown = JSON.parse(error.errorData)
      if (
        typeof data === "object" &&
        data !== null &&
        typeof (data as { sendAccessErrorType?: unknown }).sendAccessErrorType === "string"
      )
        sendAccessErrorType = (data as { sendAccessErrorType: string }).sendAccessErrorType
    } catch {
      sendAccessErrorType = "send_id_invalid"
    }
  }
  return identitySendAccessErrorResponse(
    error.errorMessage,
    sendAccessErrorType,
    error.statusCode === 404 ? 404 : error.statusCode === 500 ? 500 : 400,
  )
}

function identitySendAccessErrorResponse(message: string, sendAccessErrorType: string, status: number): Response {
  return new Response(
    JSON.stringify({
      error: status === 404 ? "invalid_grant" : "invalid_request",
      error_description: message,
      send_access_error_type: sendAccessErrorType,
    }),
    { headers: { "content-type": "application/json" }, status },
  )
}

function identityClientIpResolve(context: Context): string {
  return context.req.header("x-real-ip") ?? context.req.header("x-forwarded-for")?.split(",", 1)[0]?.trim() ?? "unknown"
}
