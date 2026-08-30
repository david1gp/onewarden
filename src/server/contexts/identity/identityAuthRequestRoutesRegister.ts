import type { Context, Hono } from "hono"
import type { Result } from "#result"
import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import { requestPathParse } from "../../../shared/validation/requestPathParse.js"
import { requestQueryParse } from "../../../shared/validation/requestQueryParse.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { AuthenticationContext } from "../authentication/authenticationContext.js"
import { authenticationContextGet } from "../authentication/authenticationContextGet.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationMiddlewareCreate } from "../authentication/authenticationMiddlewareCreate.js"
import { eventLogContextCreate } from "../events/eventLogContextCreate.js"
import { eventType } from "../events/eventType.js"
import { notificationUpdateType } from "../notifications/notificationUpdateType.js"
import { identityAuthRequestAccessCodeCheck } from "./identityAuthRequestAccessCodeCheck.js"
import { identityAuthRequestCreate } from "./identityAuthRequestCreate.js"
import { identityAuthRequestDataSchema } from "./identityAuthRequestDataSchema.js"
import { identityAuthRequestDelete } from "./identityAuthRequestDelete.js"
import { identityAuthRequestFindByUser } from "./identityAuthRequestFindByUser.js"
import { identityAuthRequestFindByUuid } from "./identityAuthRequestFindByUuid.js"
import { identityAuthRequestFindByUuidAndUser } from "./identityAuthRequestFindByUuidAndUser.js"
import { identityAuthRequestResponseDataSchema } from "./identityAuthRequestResponseDataSchema.js"
import { identityAuthRequestResponsePathSchema } from "./identityAuthRequestResponsePathSchema.js"
import { identityAuthRequestResponseQuerySchema } from "./identityAuthRequestResponseQuerySchema.js"
import { identityAuthRequestSave } from "./identityAuthRequestSave.js"
import { identityAuthRequestToJson } from "./identityAuthRequestToJson.js"
import { identityClientHeadersResolve } from "./identityClientHeadersResolve.js"
import { identityDeviceFindByUuidAndUser } from "./identityDeviceFindByUuidAndUser.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import { identityOriginResolve } from "./identityOriginResolve.js"
import type { IdentityRouteOptions } from "./identityRouteOptions.js"
import { identityUserFindByEmail } from "./identityUserFindByEmail.js"

export function identityAuthRequestRoutesRegister(
  app: Hono<AuthenticationEnvironment>,
  options: IdentityRouteOptions,
): void {
  const authenticate = authenticationMiddlewareCreate({
    clock: options.clock,
    database: options.database,
    publicKey: options.publicKey,
    publicOrigin: options.publicOrigin,
  })

  const create = async (context: Context<AuthenticationEnvironment>) => {
    const database = options.database ?? context.get("database")
    if (database === undefined)
      return apiErrorResponseCreate(
        apiErrorCreate("identityAuthRequestCreate", "platform.internal", "Database unavailable."),
      )

    const bodyResult = await requestBodyParse(context, identityAuthRequestDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)

    const userResult = identityUserFindByEmail(database, bodyResult.data.email)
    if (!userResult.success) return apiErrorResponseCreate(userResult)
    if (userResult.data === null)
      return apiErrorResponseCreate(identityAuthRequestDoesNotExistError("identityAuthRequestCreate"))

    const clientHeaders = identityClientHeadersResolve(context, options.clientIp)
    const deviceResult = identityDeviceFindByUuidAndUser(
      database,
      bodyResult.data.deviceIdentifier,
      userResult.data.uuid,
    )
    if (!deviceResult.success) return apiErrorResponseCreate(deviceResult)
    if (deviceResult.data === null || deviceResult.data.type !== clientHeaders.deviceType)
      return apiErrorResponseCreate(identityAuthRequestDoesNotExistError("identityAuthRequestCreate"))

    const requestResult = identityAuthRequestCreate(
      userResult.data.uuid,
      bodyResult.data.deviceIdentifier,
      clientHeaders.deviceType,
      clientHeaders.ipAddress,
      bodyResult.data.accessCode,
      bodyResult.data.publicKey,
      options.clock,
      options.identifier,
    )
    if (!requestResult.success) return apiErrorResponseCreate(requestResult)

    const saveResult = identityAuthRequestSave(database, requestResult.data)
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)

    identityAuthRequestNotificationSend(options, userResult.data.uuid, deviceResult.data.uuid, requestResult.data.uuid)
    options.event?.userEventCreate(eventType.userRequestedDeviceApproval, userResult.data.uuid, {
      deviceType: clientHeaders.deviceType,
      ipAddress: clientHeaders.ipAddress,
    })

    return context.json({
      ...identityAuthRequestToJson(requestResult.data, identityOriginResolve(options.publicOrigin, context.req.url)),
      requestApproved: false,
    })
  }

  const get = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = identityAuthRequestRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)

    const authRequestId = context.req.param("auth_request_id")
    if (authRequestId === undefined)
      return apiErrorResponseCreate(identityAuthRequestDoesNotExistError("identityAuthRequestGet"))

    const requestResult = identityAuthRequestFindByUuidAndUser(
      requestContext.data.database,
      authRequestId,
      requestContext.data.authentication.user.uuid,
    )
    if (!requestResult.success) return apiErrorResponseCreate(requestResult)
    if (requestResult.data === null)
      return apiErrorResponseCreate(identityAuthRequestDoesNotExistError("identityAuthRequestGet"))

    return context.json(
      identityAuthRequestToJson(requestResult.data, identityOriginResolve(options.publicOrigin, context.req.url)),
    )
  }

  const list = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = identityAuthRequestRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)

    const requestsResult = identityAuthRequestFindByUser(
      requestContext.data.database,
      requestContext.data.authentication.user.uuid,
    )
    if (!requestsResult.success) return apiErrorResponseCreate(requestsResult)

    const origin = identityOriginResolve(options.publicOrigin, context.req.url)
    const data = requestsResult.data
      .filter((request) => request.approved === null)
      .map((request) => identityAuthRequestToJson(request, origin))
    return context.json({ continuationToken: null, data, object: "list" as const })
  }

  const response = (context: Context<AuthenticationEnvironment>) => {
    const database = options.database ?? context.get("database")
    if (database === undefined)
      return apiErrorResponseCreate(
        apiErrorCreate("identityAuthRequestResponse", "platform.internal", "Database unavailable."),
      )

    const pathResult = requestPathParse(context, identityAuthRequestResponsePathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const queryResult = requestQueryParse(context, identityAuthRequestResponseQuerySchema)
    if (!queryResult.success) return apiErrorResponseCreate(queryResult)

    const requestResult = identityAuthRequestFindByUuid(database, pathResult.data.auth_request_id)
    if (!requestResult.success) return apiErrorResponseCreate(requestResult)
    if (requestResult.data === null)
      return apiErrorResponseCreate(identityAuthRequestDoesNotExistError("identityAuthRequestResponse"))

    const clientHeaders = identityClientHeadersResolve(context, options.clientIp)
    const accessCodeMatches = identityAuthRequestAccessCodeCheck(requestResult.data, queryResult.data.code)
    if (
      requestResult.data.deviceType !== clientHeaders.deviceType ||
      requestResult.data.requestIp !== clientHeaders.ipAddress ||
      !accessCodeMatches
    )
      return apiErrorResponseCreate(identityAuthRequestDoesNotExistError("identityAuthRequestResponse"))

    return context.json(
      identityAuthRequestToJson(requestResult.data, identityOriginResolve(options.publicOrigin, context.req.url)),
    )
  }

  const respond = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = identityAuthRequestRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)

    const authRequestId = context.req.param("auth_request_id")
    if (authRequestId === undefined)
      return apiErrorResponseCreate(identityAuthRequestDoesNotExistError("identityAuthRequestRespond"))

    const bodyResult = await requestBodyParse(context, identityAuthRequestResponseDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)

    const requestResult = identityAuthRequestFindByUuidAndUser(
      requestContext.data.database,
      authRequestId,
      requestContext.data.authentication.user.uuid,
    )
    if (!requestResult.success) return apiErrorResponseCreate(requestResult)
    if (requestResult.data === null)
      return apiErrorResponseCreate(identityAuthRequestDoesNotExistError("identityAuthRequestRespond"))

    if (requestContext.data.authentication.device.uuid !== bodyResult.data.deviceIdentifier)
      return apiErrorResponseCreate(identityAuthRequestDoesNotExistError("identityAuthRequestRespond"))

    if (requestResult.data.approved !== null)
      return apiErrorResponseCreate(
        identityDomainErrorCreate(
          "identityAuthRequestRespond",
          "An authentication request with the same device already exists",
        ),
      )

    const responseDate = options.clock.now().toISOString()
    if (bodyResult.data.requestApproved) {
      requestResult.data.approved = true
      requestResult.data.encKey = bodyResult.data.key
      requestResult.data.masterPasswordHash = bodyResult.data.masterPasswordHash
      requestResult.data.responseDeviceId = bodyResult.data.deviceIdentifier
      requestResult.data.responseDate = responseDate

      const saveResult = identityAuthRequestSave(requestContext.data.database, requestResult.data)
      if (!saveResult.success) return apiErrorResponseCreate(saveResult)

      identityAuthRequestResponseNotificationSend(
        options,
        requestResult.data.userUuid,
        requestResult.data.uuid,
        requestContext.data.authentication.device.uuid,
      )
    } else {
      const deleteResult = identityAuthRequestDelete(requestContext.data.database, requestResult.data)
      if (!deleteResult.success) return apiErrorResponseCreate(deleteResult)
    }

    options.event?.userEventCreate(
      bodyResult.data.requestApproved
        ? eventType.organizationUserApprovedAuthRequest
        : eventType.organizationUserRejectedAuthRequest,
      requestContext.data.authentication.user.uuid,
      eventLogContextCreate(requestContext.data.authentication),
    )

    return context.json({
      ...identityAuthRequestToJson(requestResult.data, identityOriginResolve(options.publicOrigin, context.req.url)),
      responseDate,
    })
  }

  app.post("/api/auth-requests", create)
  app.get("/api/auth-requests/pending", authenticate("get_auth_requests_pending"), list)
  app.get("/api/auth-requests/:auth_request_id/response", response)
  app.get("/api/auth-requests/:auth_request_id", authenticate("get_auth_request"), get)
  app.get("/api/auth-requests", authenticate("get_auth_requests"), list)
  app.put("/api/auth-requests/:auth_request_id", authenticate("put_auth_request"), respond)
}

function identityAuthRequestRequestContextResolve(
  context: Context<AuthenticationEnvironment>,
  options: IdentityRouteOptions,
): Result<{ authentication: AuthenticationContext; database: DatabaseConnection }> {
  const authentication = authenticationContextGet(context)
  if (authentication === undefined)
    return apiErrorCreate("identityAuthRequestAuthentication", "platform.unauthorized", "Authentication is required.")
  const database = options.database ?? context.get("database")
  if (database === undefined)
    return apiErrorCreate("identityAuthRequestDatabase", "platform.internal", "Database unavailable.")
  return { success: true, data: { authentication, database } }
}

function identityAuthRequestDoesNotExistError(op: string) {
  return identityDomainErrorCreate(op, "AuthRequest doesn't exist")
}

function identityAuthRequestResponseNotificationSend(
  options: IdentityRouteOptions,
  userUuid: string,
  authRequestUuid: string,
  responseDeviceUuid: string,
): void {
  try {
    options.anonymousAuthRequestResponseSend?.(userUuid, authRequestUuid)
  } catch {}

  try {
    options.notification?.sendUpdate([userUuid], {
      contextId: responseDeviceUuid,
      payload: { Id: authRequestUuid, UserId: userUuid },
      type: notificationUpdateType.authRequestResponse,
    })
  } catch {
    return
  }
}

function identityAuthRequestNotificationSend(
  options: IdentityRouteOptions,
  userUuid: string,
  deviceUuid: string,
  authRequestUuid: string,
): void {
  if (options.notification === undefined) return
  try {
    options.notification.sendUpdate([userUuid], {
      contextId: deviceUuid,
      payload: { Id: authRequestUuid, UserId: userUuid },
      type: notificationUpdateType.authRequest,
    })
  } catch {
    return
  }
}
