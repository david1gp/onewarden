import type { Context, Hono } from "hono"
import * as v from "valibot"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { requestPathParse } from "../../../shared/validation/requestPathParse.js"
import { requestQueryParse } from "../../../shared/validation/requestQueryParse.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import { authenticationContextGet } from "../authentication/authenticationContextGet.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationMiddleware } from "../authentication/authenticationMiddleware.js"
import { organizationAdminMiddleware } from "../organizations/organizationAdminMiddleware.js"
import { cipherEventAccessCheck } from "./cipherEventAccessCheck.js"
import { cipherFindByUuid } from "../ciphers/cipherFindByUuid.js"
import { eventFindByCipher } from "./eventFindByCipher.js"
import { eventFindByOrganization } from "./eventFindByOrganization.js"
import { eventFindByOrganizationUser } from "./eventFindByOrganizationUser.js"
import { eventCollectDataSchema } from "./eventCollectDataSchema.js"
import { eventRangeDataSchema } from "./eventRangeDataSchema.js"
import type { EventRouteOptions } from "./eventRouteOptions.js"
import { eventToJson } from "./eventToJson.js"
import { organizationMembershipFindByUserAndOrganization } from "../organizations/organizationMembershipFindByUserAndOrganization.js"
import { organizationMembershipStatus } from "../organizations/organizationMembershipStatus.js"

const eventCipherPathSchema = v.object({ cipher_id: v.pipe(v.string(), v.uuid()) })
const eventOrganizationUserPathSchema = v.object({ member_id: v.pipe(v.string(), v.uuid()) })

export function eventRoutesRegister(app: Hono<AuthenticationEnvironment>, options: EventRouteOptions): void {
  const authenticate = (routeName: string) =>
    authenticationMiddleware({
      clock: options.clock,
      database: options.database,
      publicKey: options.publicKey,
      publicOrigin: options.publicOrigin,
      routeName,
    })
  const organizationAdmin = organizationAdminMiddleware({
    clock: options.clock,
    database: options.database,
    publicKey: options.publicKey,
    publicOrigin: options.publicOrigin,
  })

  const organizationEvents = (context: Context<AuthenticationEnvironment>) =>
    eventOrganizationEventsGet(context, options)
  const organizationUserEvents = (context: Context<AuthenticationEnvironment>) =>
    eventOrganizationUserEventsGet(context, options)
  const cipherEvents = (context: Context<AuthenticationEnvironment>) => eventCipherEventsGet(context, options)
  const collect = (context: Context<AuthenticationEnvironment>) => eventCollect(context, options)

  app.get("/api/organizations/:org_id/events", authenticate("get_org_events"), organizationAdmin, organizationEvents)
  app.get(
    "/api/organizations/:org_id/users/:member_id/events",
    authenticate("get_user_events"),
    organizationAdmin,
    organizationUserEvents,
  )
  app.get("/api/ciphers/:cipher_id/events", authenticate("get_cipher_events"), cipherEvents)
  app.post("/events/collect", authenticate("post_events_collect"), collect)
}

async function eventCollect(
  context: Context<AuthenticationEnvironment>,
  options: EventRouteOptions,
): Promise<Response> {
  const authentication = authenticationContextGet(context)
  if (authentication === undefined)
    return apiErrorResponseCreate(eventRouteErrorCreate("Authentication is required.", 401))
  if (!options.enabled) return new Response(null, { status: 200 })
  const database = options.database ?? context.get("database")
  if (database === undefined) return apiErrorResponseCreate(eventRouteErrorCreate("Database unavailable."))
  if (options.event === undefined) return apiErrorResponseCreate(eventRouteErrorCreate("Event adapter unavailable."))
  const bodyResult = await requestBodyParse(context, eventCollectDataSchema)
  if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
  const eventContext = {
    deviceType: authentication.device.type,
    ipAddress: authentication.ip,
  }
  for (const item of bodyResult.data) {
    if (item.type >= 1000 && item.type <= 1099) {
      options.event.userEventCreate(item.type, authentication.user.uuid, { ...eventContext, eventDate: item.date })
      continue
    }
    if (item.type >= 1600 && item.type <= 1699) {
      const organizationUuid = item.organizationId
      if (organizationUuid === undefined || organizationUuid === null) continue
      const membershipResult = organizationMembershipFindByUserAndOrganization(
        database,
        authentication.user.uuid,
        organizationUuid,
      )
      if (!membershipResult.success || membershipResult.data?.status !== organizationMembershipStatus.confirmed)
        continue
      options.event.organizationEventCreate(item.type, organizationUuid, organizationUuid, authentication.user.uuid, {
        ...eventContext,
        eventDate: item.date,
      })
      continue
    }
    const cipherUuid = item.cipherId
    if (cipherUuid === undefined || cipherUuid === null) continue
    const cipherResult = cipherFindByUuid(database, cipherUuid)
    if (!cipherResult.success || cipherResult.data === null || cipherResult.data.organizationUuid === null) continue
    if (
      !eventCipherAccessible(
        database,
        cipherResult.data.userUuid,
        cipherResult.data.organizationUuid,
        authentication.user.uuid,
      )
    )
      continue
    options.event.organizationEventCreate(
      item.type,
      cipherUuid,
      cipherResult.data.organizationUuid,
      authentication.user.uuid,
      { ...eventContext, eventDate: item.date },
    )
  }
  return new Response(null, { status: 200 })
}

function eventCipherAccessible(
  database: NonNullable<EventRouteOptions["database"]>,
  ownerUuid: string | null,
  organizationUuid: string,
  userUuid: string,
): boolean {
  if (ownerUuid === userUuid) return true
  const membershipResult = organizationMembershipFindByUserAndOrganization(database, userUuid, organizationUuid)
  return membershipResult.success && membershipResult.data?.status === organizationMembershipStatus.confirmed
}

function eventOrganizationEventsGet(
  context: Context<AuthenticationEnvironment>,
  options: EventRouteOptions,
): Response | Promise<Response> {
  const rangeResult = requestQueryParse(context, eventRangeDataSchema)
  if (!rangeResult.success) return apiErrorResponseCreate(rangeResult)
  const database = options.database ?? context.get("database")
  if (database === undefined) return apiErrorResponseCreate(eventRouteErrorCreate("Database unavailable."))
  const organizationUuid = context.get("organizationId")
  if (organizationUuid === undefined)
    return apiErrorResponseCreate(eventRouteErrorCreate("Organization not found.", 404))
  if (!options.enabled) return eventListResponse(context, [])
  const result = eventFindByOrganization(
    database,
    organizationUuid,
    rangeResult.data.start,
    rangeResult.data.continuationToken ?? rangeResult.data.end,
  )
  if (!result.success) return apiErrorResponseCreate(result)
  return eventListResponse(context, result.data)
}

function eventOrganizationUserEventsGet(
  context: Context<AuthenticationEnvironment>,
  options: EventRouteOptions,
): Response | Promise<Response> {
  const rangeResult = requestQueryParse(context, eventRangeDataSchema)
  if (!rangeResult.success) return apiErrorResponseCreate(rangeResult)
  const pathResult = requestPathParse(context, eventOrganizationUserPathSchema)
  if (!pathResult.success) return apiErrorResponseCreate(pathResult)
  const database = options.database ?? context.get("database")
  if (database === undefined) return apiErrorResponseCreate(eventRouteErrorCreate("Database unavailable."))
  const organizationUuid = context.get("organizationId")
  if (organizationUuid === undefined)
    return apiErrorResponseCreate(eventRouteErrorCreate("Organization not found.", 404))
  if (!options.enabled) return eventListResponse(context, [])
  const result = eventFindByOrganizationUser(
    database,
    organizationUuid,
    pathResult.data.member_id,
    rangeResult.data.start,
    rangeResult.data.continuationToken ?? rangeResult.data.end,
  )
  if (!result.success) return apiErrorResponseCreate(result)
  return eventListResponse(context, result.data)
}

function eventCipherEventsGet(
  context: Context<AuthenticationEnvironment>,
  options: EventRouteOptions,
): Response | Promise<Response> {
  const rangeResult = requestQueryParse(context, eventRangeDataSchema)
  if (!rangeResult.success) return apiErrorResponseCreate(rangeResult)
  const pathResult = requestPathParse(context, eventCipherPathSchema)
  if (!pathResult.success) return apiErrorResponseCreate(pathResult)
  const database = options.database ?? context.get("database")
  if (database === undefined) return apiErrorResponseCreate(eventRouteErrorCreate("Database unavailable."))
  if (!options.enabled) return eventListResponse(context, [])
  const authentication = authenticationContextGet(context)
  if (authentication === undefined)
    return apiErrorResponseCreate(eventRouteErrorCreate("Authentication is required.", 401))
  const accessResult = cipherEventAccessCheck(database, pathResult.data.cipher_id, authentication.user.uuid)
  if (!accessResult.success) return apiErrorResponseCreate(accessResult)
  if (!accessResult.data) return eventListResponse(context, [])
  const result = eventFindByCipher(
    database,
    pathResult.data.cipher_id,
    rangeResult.data.start,
    rangeResult.data.continuationToken ?? rangeResult.data.end,
  )
  if (!result.success) return apiErrorResponseCreate(result)
  return eventListResponse(context, result.data)
}

function eventListResponse(context: Context<AuthenticationEnvironment>, events: readonly import("./event.js").Event[]) {
  const data = events.map(eventToJson)
  const lastEvent = data[data.length - 1]
  const continuationToken = events.length === 30 && lastEvent !== undefined ? lastEvent.date : null
  return context.json({ data, object: "list", continuationToken })
}

function eventRouteErrorCreate(message: string, statusCode = 400) {
  const code =
    statusCode === 404
      ? "platform.not-found"
      : statusCode === 401
        ? "platform.unauthorized"
        : "platform.invalid-request"
  return resultErrorCreate("eventRoutes", message, { code, statusCode })
}
