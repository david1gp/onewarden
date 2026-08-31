import type { Context, Hono } from "hono"
import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { sessionHandoffCreateRequestSchema } from "../../../shared/sessionHandoff/sessionHandoffCreateRequestSchema.js"
import { sessionHandoffConsumeRequestSchema } from "../../../shared/sessionHandoff/sessionHandoffConsumeRequestSchema.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import { authenticationContextGet } from "../authentication/authenticationContextGet.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationMiddlewareCreate } from "../authentication/authenticationMiddlewareCreate.js"
import { cipherAccessFindByUser } from "../ciphers/cipherAccessFindByUser.js"
import { cipherFindByUuid } from "../ciphers/cipherFindByUuid.js"
import { identityOriginResolve } from "../identity/identityOriginResolve.js"
import { sessionHandoffConsume } from "./sessionHandoffConsume.js"
import { sessionHandoffCreate } from "./sessionHandoffCreate.js"
import type { SessionHandoffRouteOptions } from "./sessionHandoffRouteOptions.js"

const handoffAuthorizationPattern = /^Handoff ([A-Za-z0-9_-]{43})$/u

export function sessionHandoffRoutesRegister(app: Hono<any>, options: SessionHandoffRouteOptions): void {
  const authenticate = authenticationMiddlewareCreate({
    clock: options.clock,
    database: options.database,
    groupsEnabled: options.groupsEnabled,
    publicKey: options.publicKey,
    publicOrigin: options.publicOrigin,
  })

  app.post(
    "/api/extension/handoffs",
    authenticate("extension_handoff_create"),
    async (context: Context<AuthenticationEnvironment>) => {
      const authentication = authenticationContextGet(context)
      if (authentication === undefined || options.database === undefined) {
        return apiErrorResponseCreate(
          apiErrorCreate("sessionHandoffCreateRoute", "platform.internal", "Session handoff is unavailable."),
        )
      }
      const bodyResult = await requestBodyParse(context, sessionHandoffCreateRequestSchema)
      if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
      if (bodyResult.data.operation === "edit") {
        const cipherResult = cipherFindByUuid(options.database, bodyResult.data.cipherId)
        if (!cipherResult.success) return apiErrorResponseCreate(cipherResult)
        if (cipherResult.data === null) {
          return apiErrorResponseCreate(
            apiErrorCreate("sessionHandoffCreateRoute", "platform.not-found", "Cipher was not found."),
          )
        }
        const accessResult = cipherAccessFindByUser(
          options.database,
          cipherResult.data,
          authentication.user.uuid,
          options.groupsEnabled,
        )
        if (!accessResult.success) return apiErrorResponseCreate(accessResult)
        if (accessResult.data === null || accessResult.data.readOnly) {
          return apiErrorResponseCreate(
            apiErrorCreate("sessionHandoffCreateRoute", "platform.forbidden", "Cipher cannot be edited."),
          )
        }
      }
      const result = await sessionHandoffCreate(
        options.database,
        authentication.user.uuid,
        authentication.device.uuid,
        bodyResult.data,
        options.clock,
      )
      if (!result.success) return apiErrorResponseCreate(result)
      return context.json(result.data)
    },
  )

  app.post("/api/extension/handoffs/consume", async (context: Context<AuthenticationEnvironment>) => {
    if (options.database === undefined) {
      return apiErrorResponseCreate(
        apiErrorCreate("sessionHandoffConsumeRoute", "platform.internal", "Session handoff is unavailable."),
      )
    }
    const token = handoffAuthorizationPattern.exec(context.req.header("Authorization") ?? "")?.[1]
    if (token === undefined) {
      return apiErrorResponseCreate(
        apiErrorCreate("sessionHandoffConsumeRoute", "platform.unauthorized", "Session handoff is invalid or expired."),
      )
    }
    const bodyResult = await requestBodyParse(context, sessionHandoffConsumeRequestSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const result = await sessionHandoffConsume(token, bodyResult.data, {
      clock: options.clock,
      config: options.config,
      database: options.database,
      identifier: options.identifier,
      issuer: identityOriginResolve(options.publicOrigin, context.req.url),
      privateKey: options.privateKey,
    })
    if (!result.success) return apiErrorResponseCreate(result)
    return context.json(result.data)
  })
}
