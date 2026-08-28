import type { Context, Hono } from "hono"
import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import { authenticationContextGet } from "../authentication/authenticationContextGet.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationMiddleware } from "../authentication/authenticationMiddleware.js"
import type { IdentityRouteOptions } from "./identityRouteOptions.js"
import { identityDeviceClearPushTokenByUuid } from "./identityDeviceClearPushTokenByUuid.js"
import { identityDeviceFindByUuid } from "./identityDeviceFindByUuid.js"
import { identityDeviceFindByUuidAndUser } from "./identityDeviceFindByUuidAndUser.js"
import { identityDevicePushTokenDataSchema } from "./identityDevicePushTokenDataSchema.js"
import { identityDeviceSave } from "./identityDeviceSave.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"

export function identityDevicePushRoutesRegister(
  app: Hono<AuthenticationEnvironment>,
  options: IdentityRouteOptions,
): void {
  const updateToken = async (context: Context<AuthenticationEnvironment>) => {
    const authentication = authenticationContextGet(context)
    if (authentication === undefined)
      return apiErrorResponseCreate(
        apiErrorCreate("identityDevicePushToken", "platform.unauthorized", "Authentication is required."),
      )
    const database = options.database ?? context.get("database")
    if (database === undefined)
      return apiErrorResponseCreate(
        apiErrorCreate("identityDevicePushToken", "platform.internal", "Database unavailable."),
      )
    const bodyResult = await requestBodyParse(context, identityDevicePushTokenDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const deviceResult = identityDeviceFindByUuidAndUser(database, authentication.device.uuid, authentication.user.uuid)
    if (!deviceResult.success) return apiErrorResponseCreate(deviceResult)
    if (deviceResult.data === null)
      return apiErrorResponseCreate(
        identityDomainErrorCreate(
          "identityDevicePushToken",
          `Error: device ${context.req.param("device_id")} should be present before a token can be assigned`,
        ),
      )
    if (deviceResult.data.pushToken === bodyResult.data.pushToken) return new Response(null, { status: 200 })

    deviceResult.data.pushToken = bodyResult.data.pushToken
    const saveResult = identityDeviceSave(database, deviceResult.data, options.clock, true)
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    if (options.push !== undefined) {
      const registerResult = await options.push.registerDevice(deviceResult.data)
      if (!registerResult.success) return apiErrorResponseCreate(registerResult)
      const pushUuidSaveResult = identityDeviceSave(database, deviceResult.data, options.clock, false)
      if (!pushUuidSaveResult.success) return apiErrorResponseCreate(pushUuidSaveResult)
    }
    return new Response(null, { status: 200 })
  }

  const clearToken = async (context: Context<AuthenticationEnvironment>) => {
    const rateLimitResult = options.rateLimiter.check(identityDevicePushClientIpResolve(context))
    if (!rateLimitResult.success) return apiErrorResponseCreate(rateLimitResult)
    const database = options.database ?? context.get("database")
    if (database === undefined)
      return apiErrorResponseCreate(
        apiErrorCreate("identityDeviceClearPushToken", "platform.internal", "Database unavailable."),
      )
    const deviceId = context.req.param("device_id")
    if (deviceId === undefined) return new Response(null, { status: 200 })
    const deviceResult = identityDeviceFindByUuid(database, deviceId)
    if (!deviceResult.success) return apiErrorResponseCreate(deviceResult)
    if (deviceResult.data !== null) {
      const clearResult = identityDeviceClearPushTokenByUuid(database, deviceId)
      if (!clearResult.success) return apiErrorResponseCreate(clearResult)
      if (options.push !== undefined) {
        const unregisterResult = await options.push.unregisterDevice(deviceResult.data.pushUuid)
        if (!unregisterResult.success) return apiErrorResponseCreate(unregisterResult)
      }
    }
    return new Response(null, { status: 200 })
  }

  app.post(
    "/api/devices/identifier/:device_id/token",
    authenticationMiddleware({
      clock: options.clock,
      database: options.database,
      publicKey: options.publicKey,
      publicOrigin: options.publicOrigin,
      routeName: "post_device_token",
    }),
    updateToken,
  )
  app.put(
    "/api/devices/identifier/:device_id/token",
    authenticationMiddleware({
      clock: options.clock,
      database: options.database,
      publicKey: options.publicKey,
      publicOrigin: options.publicOrigin,
      routeName: "put_device_token",
    }),
    updateToken,
  )
  app.put("/api/devices/identifier/:device_id/clear-token", clearToken)
  app.post("/api/devices/identifier/:device_id/clear-token", clearToken)
}

function identityDevicePushClientIpResolve(context: Context<AuthenticationEnvironment>): string {
  return context.req.header("x-real-ip") ?? context.req.header("x-forwarded-for")?.split(",", 1)[0]?.trim() ?? "unknown"
}
