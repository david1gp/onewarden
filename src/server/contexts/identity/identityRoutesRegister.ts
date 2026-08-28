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
import type { IdentityRouteOptions } from "./identityRouteOptions.js"

export function identityRoutesRegister(app: Hono<any>, options: IdentityRouteOptions): void {
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

function identityClientIpResolve(context: Context): string {
  return context.req.header("x-real-ip") ?? context.req.header("x-forwarded-for")?.split(",", 1)[0]?.trim() ?? "unknown"
}
