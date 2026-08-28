import type { Context, Hono } from "hono"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import { identityOriginResolve } from "./identityOriginResolve.js"
import { identityPrelogin } from "./identityPrelogin.js"
import { identityPreloginDataSchema } from "./identityPreloginDataSchema.js"
import { identityRegistration } from "./identityRegistration.js"
import { identityRegistrationDataSchema } from "./identityRegistrationDataSchema.js"
import { identityRegistrationVerificationDataSchema } from "./identityRegistrationVerificationDataSchema.js"
import { identityRegistrationVerificationEmail } from "./identityRegistrationVerificationEmail.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import { identityPasswordLogin } from "./identityPasswordLogin.js"
import { identityRefreshLogin } from "./identityRefreshLogin.js"
import type { IdentityRouteOptions } from "./identityRouteOptions.js"
import { identityTokenRequestParse } from "./identityTokenRequestParse.js"

export function identityRoutesRegister(app: Hono<any>, options: IdentityRouteOptions): void {
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
      })
      if (!result.success) return identityInvalidGrantResponse()
      return context.json(result.data)
    }
    if (data.grantType === "password") {
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
      })
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
      publicKey: options.publicKey,
    })
    if (!result.success) return apiErrorResponseCreate(result)
    return context.json(result.data)
  }

  app.post("/identity/accounts/prelogin", prelogin)
  app.post("/identity/accounts/prelogin/password", prelogin)
  app.post("/api/accounts/prelogin", prelogin)
  app.post("/identity/connect/token", token)
  app.post("/identity/accounts/register", (context) => register(context, false))
  app.post("/identity/accounts/register/finish", (context) => register(context, true))
  app.post("/identity/accounts/register/send-verification-email", async (context) => {
    const rateLimitResult = options.rateLimiter.check(identityClientIpResolve(context))
    if (!rateLimitResult.success) return apiErrorResponseCreate(rateLimitResult)
    const bodyResult = await requestBodyParse(context, identityRegistrationVerificationDataSchema)
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
}

function identityInvalidGrantResponse(): Response {
  return new Response(JSON.stringify({ error: "invalid_grant" }), {
    headers: { "content-type": "application/json" },
    status: 400,
  })
}

function identityClientIpResolve(context: Context): string {
  return context.req.header("x-real-ip") ?? context.req.header("x-forwarded-for")?.split(",", 1)[0]?.trim() ?? "unknown"
}
