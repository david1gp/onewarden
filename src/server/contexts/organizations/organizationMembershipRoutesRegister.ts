import type { Context, Hono } from "hono"
import * as v from "valibot"
import type { Result } from "#result"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import { requestPathParse } from "../../../shared/validation/requestPathParse.js"
import { authenticationContextGet } from "../authentication/authenticationContextGet.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationMiddlewareCreate } from "../authentication/authenticationMiddlewareCreate.js"
import { identityOriginResolve } from "../identity/identityOriginResolve.js"
import { notificationUpdateType } from "../notifications/notificationUpdateType.js"
import { organizationAdminMiddleware } from "./organizationAdminMiddleware.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"
import { organizationManagerLooseMiddleware } from "./organizationManagerLooseMiddleware.js"
import { organizationMembershipBulkConfirmDataSchema } from "./organizationMembershipBulkConfirmDataSchema.js"
import { organizationMembershipBulkIdsDataSchema } from "./organizationMembershipBulkIdsDataSchema.js"
import { organizationMembershipBulkRevokeDataSchema } from "./organizationMembershipBulkRevokeDataSchema.js"
import { organizationMembershipCollectionAssignmentsFind } from "./organizationMembershipCollectionAssignmentsFind.js"
import { organizationMembershipConfirm } from "./organizationMembershipConfirm.js"
import { organizationMembershipFindAllByOrganization } from "./organizationMembershipFindAllByOrganization.js"
import { organizationMembershipGroupAssignmentsFind } from "./organizationMembershipGroupAssignmentsFind.js"
import { organizationMembershipPathSchema } from "./organizationMembershipPathSchema.js"
import { organizationMembershipRemove } from "./organizationMembershipRemove.js"
import { organizationMembershipResend } from "./organizationMembershipResend.js"
import { organizationMembershipRestore } from "./organizationMembershipRestore.js"
import { organizationMembershipRevoke } from "./organizationMembershipRevoke.js"
import { organizationMembershipTwoFactorEnabledFind } from "./organizationMembershipTwoFactorEnabledFind.js"
import { organizationMembershipUpdate } from "./organizationMembershipUpdate.js"
import { organizationMembershipUpdateDataSchema } from "./organizationMembershipUpdateDataSchema.js"
import { organizationMembershipUserDetailsFind } from "./organizationMembershipUserDetailsFind.js"
import { organizationMembershipUserDetailsToJson } from "./organizationMembershipUserDetailsToJson.js"
import { organizationMembershipUserMiniDetailsToJson } from "./organizationMembershipUserMiniDetailsToJson.js"
import type { OrganizationRouteOptions } from "./organizationRouteOptions.js"
import { organizationMembershipStatus } from "./organizationMembershipStatus.js"
import { organizationMembershipType } from "./organizationMembershipType.js"

const organizationMembershipQueryBooleanSchema = v.union([v.literal("true"), v.literal("false")])

export function organizationMembershipRoutesRegister(
  app: Hono<AuthenticationEnvironment>,
  options: OrganizationRouteOptions,
): void {
  const authenticate = authenticationMiddlewareCreate({
    clock: options.clock,
    database: options.database,
    publicKey: options.publicKey,
    publicOrigin: options.publicOrigin,
  })
  const organizationAuthentication = {
    clock: options.clock,
    database: options.database,
    publicKey: options.publicKey,
    publicOrigin: options.publicOrigin,
  }
  const admin = organizationAdminMiddleware(organizationAuthentication)
  const managerLoose = organizationManagerLooseMiddleware(organizationAuthentication)

  const listMembers = (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context, options)
    if (database === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesList", "Database unavailable."),
      )
    const organizationUuid = context.get("organizationId")
    const actorMembership = context.get("organizationMembership")
    if (organizationUuid === undefined || actorMembership === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesList", "Organization not found", 404),
      )
    if (!organizationMembershipHasFullAccess(actorMembership))
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesList", "Resource not found.", 404),
      )
    const queryResult = organizationMembershipQueryOptionsResolve(context)
    if (!queryResult.success) return apiErrorResponseCreate(queryResult)
    const membershipsResult = organizationMembershipFindAllByOrganization(database, organizationUuid)
    if (!membershipsResult.success) return apiErrorResponseCreate(membershipsResult)
    const dataResult = organizationMembershipDetailsListFind(
      database,
      organizationUuid,
      membershipsResult.data,
      queryResult.data.includeCollections,
      queryResult.data.includeGroups,
      options.groupsEnabled,
    )
    if (!dataResult.success) return apiErrorResponseCreate(dataResult)
    return context.json({ continuationToken: null, data: dataResult.data, object: "list" })
  }

  const listMiniDetails = (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context, options)
    if (database === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesMini", "Database unavailable."),
      )
    const organizationUuid = context.get("organizationId")
    if (organizationUuid === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesMini", "Organization not found", 404),
      )
    const membershipsResult = organizationMembershipFindAllByOrganization(database, organizationUuid)
    if (!membershipsResult.success) return apiErrorResponseCreate(membershipsResult)
    const data: Record<string, unknown>[] = []
    for (const membership of membershipsResult.data) {
      const detailsResult = organizationMembershipUserDetailsFind(database, organizationUuid, membership.uuid)
      if (!detailsResult.success) return apiErrorResponseCreate(detailsResult)
      if (detailsResult.data === null) continue
      data.push(organizationMembershipUserMiniDetailsToJson(detailsResult.data.membership, detailsResult.data.user))
    }
    return context.json({ continuationToken: null, data, object: "list" })
  }

  const getMember = (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context, options)
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationMembershipRoutesGet", "Database unavailable."))
    const pathResult = requestPathParse(context, organizationMembershipPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const queryResult = organizationMembershipQueryOptionsResolve(context)
    if (!queryResult.success) return apiErrorResponseCreate(queryResult)
    const result = organizationMembershipDetailsResponse(
      database,
      pathResult.data.org_id,
      pathResult.data.member_id,
      queryResult.data.includeCollections ||
        (!queryResult.data.includeCollectionsProvided && queryResult.data.includeGroups),
      queryResult.data.includeGroups,
      options.groupsEnabled,
    )
    if (!result.success) return apiErrorResponseCreate(result)
    return context.json(result.data)
  }

  const updateMember = async (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context, options)
    if (database === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesUpdate", "Database unavailable."),
      )
    const actorMembership = context.get("organizationMembership")
    if (actorMembership === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesUpdate", "Organization not found", 404),
      )
    const pathResult = requestPathParse(context, organizationMembershipPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const bodyResult = await requestBodyParse(context, organizationMembershipUpdateDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const revisionDate = options.clock.now().toISOString()
    const result = organizationMembershipUpdate(
      database,
      actorMembership,
      pathResult.data.org_id,
      pathResult.data.member_id,
      bodyResult.data,
      revisionDate,
    )
    if (!result.success) return apiErrorResponseCreate(result)
    return new Response(null, { status: 200 })
  }

  const removeMember = (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context, options)
    if (database === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesRemove", "Database unavailable."),
      )
    const authentication = authenticationContextGet(context)
    const actorMembership = context.get("organizationMembership")
    if (authentication === undefined || actorMembership === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesRemove", "Organization not found", 404),
      )
    const pathResult = requestPathParse(context, organizationMembershipPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const revisionDate = options.clock.now().toISOString()
    const result = organizationMembershipRemove(
      database,
      actorMembership,
      pathResult.data.org_id,
      pathResult.data.member_id,
      revisionDate,
      options.config.MAIL_ENABLED,
    )
    if (!result.success) return apiErrorResponseCreate(result)
    organizationMembershipUserNotify(
      options,
      result.data.userUuid,
      authentication.device.uuid,
      "syncOrgKeys",
      revisionDate,
    )
    return new Response(null, { status: 200 })
  }

  const revokeMember = (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context, options)
    if (database === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesRevoke", "Database unavailable."),
      )
    const actorMembership = context.get("organizationMembership")
    if (actorMembership === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesRevoke", "Organization not found", 404),
      )
    const pathResult = requestPathParse(context, organizationMembershipPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const result = organizationMembershipRevoke(
      database,
      actorMembership,
      pathResult.data.org_id,
      pathResult.data.member_id,
      options.clock.now().toISOString(),
    )
    if (!result.success) return apiErrorResponseCreate(result)
    return new Response(null, { status: 200 })
  }

  const restoreMember = (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context, options)
    if (database === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesRestore", "Database unavailable."),
      )
    const actorMembership = context.get("organizationMembership")
    if (actorMembership === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesRestore", "Organization not found", 404),
      )
    const pathResult = requestPathParse(context, organizationMembershipPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const result = organizationMembershipRestore(
      database,
      actorMembership,
      pathResult.data.org_id,
      pathResult.data.member_id,
      options.clock.now().toISOString(),
    )
    if (!result.success) return apiErrorResponseCreate(result)
    return new Response(null, { status: 200 })
  }

  const bulkRemoveMembers = async (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context, options)
    if (database === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesBulkRemove", "Database unavailable."),
      )
    const authentication = authenticationContextGet(context)
    const actorMembership = context.get("organizationMembership")
    const organizationUuid = context.get("organizationId")
    if (authentication === undefined || actorMembership === undefined || organizationUuid === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesBulkRemove", "Organization not found", 404),
      )
    const bodyResult = await requestBodyParse(context, organizationMembershipBulkIdsDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const data = bodyResult.data
    const bulkResponse: Record<string, unknown>[] = []
    for (const memberId of data.ids) {
      const revisionDate = options.clock.now().toISOString()
      const result = organizationMembershipRemove(
        database,
        actorMembership,
        organizationUuid,
        memberId,
        revisionDate,
        options.config.MAIL_ENABLED,
      )
      if (result.success) {
        organizationMembershipUserNotify(
          options,
          result.data.userUuid,
          authentication.device.uuid,
          "syncOrgKeys",
          revisionDate,
        )
      }
      bulkResponse.push(
        organizationMembershipBulkResponseToJson("OrganizationBulkConfirmResponseModel", memberId, result),
      )
    }
    return context.json({ continuationToken: null, data: bulkResponse, object: "list" })
  }

  const bulkRevokeMembers = async (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context, options)
    if (database === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesBulkRevoke", "Database unavailable."),
      )
    const actorMembership = context.get("organizationMembership")
    const organizationUuid = context.get("organizationId")
    if (actorMembership === undefined || organizationUuid === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesBulkRevoke", "Organization not found", 404),
      )
    const bodyResult = await requestBodyParse(context, organizationMembershipBulkRevokeDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    if (bodyResult.data.ids === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesBulkRevoke", "No users to revoke"),
      )
    const bulkResponse: Record<string, unknown>[] = []
    for (const memberId of bodyResult.data.ids) {
      const result = organizationMembershipRevoke(
        database,
        actorMembership,
        organizationUuid,
        memberId,
        options.clock.now().toISOString(),
      )
      bulkResponse.push(organizationMembershipBulkResponseToJson("OrganizationUserBulkResponseModel", memberId, result))
    }
    return context.json({ continuationToken: null, data: bulkResponse, object: "list" })
  }

  const bulkRestoreMembers = async (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context, options)
    if (database === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesBulkRestore", "Database unavailable."),
      )
    const actorMembership = context.get("organizationMembership")
    const organizationUuid = context.get("organizationId")
    if (actorMembership === undefined || organizationUuid === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesBulkRestore", "Organization not found", 404),
      )
    const bodyResult = await requestBodyParse(context, organizationMembershipBulkIdsDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const bulkResponse: Record<string, unknown>[] = []
    for (const memberId of bodyResult.data.ids) {
      const result = organizationMembershipRestore(
        database,
        actorMembership,
        organizationUuid,
        memberId,
        options.clock.now().toISOString(),
      )
      bulkResponse.push(organizationMembershipBulkResponseToJson("OrganizationUserBulkResponseModel", memberId, result))
    }
    return context.json({ continuationToken: null, data: bulkResponse, object: "list" })
  }

  const bulkReinviteMembers = async (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context, options)
    if (database === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesBulkReinvite", "Database unavailable."),
      )
    const authentication = authenticationContextGet(context)
    const organizationUuid = context.get("organizationId")
    if (authentication === undefined || organizationUuid === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesBulkReinvite", "Organization not found", 404),
      )
    const bodyResult = await requestBodyParse(context, organizationMembershipBulkIdsDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const bulkResponse: Record<string, unknown>[] = []
    for (const memberId of bodyResult.data.ids) {
      const result = await organizationMembershipResend(
        database,
        organizationUuid,
        memberId,
        authentication.user.email,
        {
          clock: options.clock,
          config: options.config,
          issuer: identityOriginResolve(options.publicOrigin, context.req.url),
          mail: options.mail,
          privateKey: options.privateKey,
        },
      )
      bulkResponse.push(
        organizationMembershipBulkResponseToJson("OrganizationBulkConfirmResponseModel", memberId, result),
      )
    }
    return context.json({ continuationToken: null, data: bulkResponse, object: "list" })
  }

  const bulkConfirmMembers = async (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context, options)
    if (database === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesBulkConfirm", "Database unavailable."),
      )
    const authentication = authenticationContextGet(context)
    const actorMembership = context.get("organizationMembership")
    const organizationUuid = context.get("organizationId")
    if (authentication === undefined || actorMembership === undefined || organizationUuid === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesBulkConfirm", "Organization not found", 404),
      )
    const bodyResult = await requestBodyParse(context, organizationMembershipBulkConfirmDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    if (bodyResult.data.keys === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationMembershipRoutesBulkConfirm", "No keys to confirm"),
      )
    const bulkResponse: Record<string, unknown>[] = []
    for (const invite of bodyResult.data.keys) {
      const memberId = invite.id ?? ""
      const result = await organizationMembershipConfirm(
        database,
        actorMembership,
        organizationUuid,
        memberId,
        invite.key ?? "",
        { clock: options.clock, config: options.config, mail: options.mail },
      )
      if (result.success)
        organizationMembershipUserNotify(
          options,
          result.data.userUuid,
          authentication.device.uuid,
          "syncOrgKeys",
          result.data.revisionDate,
        )
      bulkResponse.push(
        organizationMembershipBulkResponseToJson("OrganizationBulkConfirmResponseModel", memberId, result),
      )
    }
    return context.json({ continuationToken: null, data: bulkResponse, object: "list" })
  }

  app.get("/api/organizations/:org_id/users", authenticate("get_members"), managerLoose, listMembers)
  app.get(
    "/api/organizations/:org_id/users/mini-details",
    authenticate("get_org_user_mini_details"),
    managerLoose,
    listMiniDetails,
  )
  app.post(
    "/api/organizations/:org_id/users/reinvite",
    authenticate("bulk_reinvite_members"),
    admin,
    bulkReinviteMembers,
  )
  app.post("/api/organizations/:org_id/users/confirm", authenticate("bulk_confirm_invite"), admin, bulkConfirmMembers)
  app.put("/api/organizations/:org_id/users/revoke", authenticate("bulk_revoke_members"), admin, bulkRevokeMembers)
  app.put("/api/organizations/:org_id/users/restore", authenticate("bulk_restore_members"), admin, bulkRestoreMembers)
  app.get("/api/organizations/:org_id/users/:member_id", authenticate("get_user"), admin, getMember)
  app.put("/api/organizations/:org_id/users/:member_id", authenticate("put_member"), admin, updateMember)
  app.post("/api/organizations/:org_id/users/:member_id", authenticate("edit_member"), admin, updateMember)
  app.delete("/api/organizations/:org_id/users", authenticate("bulk_delete_member"), admin, bulkRemoveMembers)
  app.delete("/api/organizations/:org_id/users/:member_id", authenticate("delete_member"), admin, removeMember)
  app.put("/api/organizations/:org_id/users/:member_id/revoke", authenticate("revoke_member"), admin, revokeMember)
  app.put(
    "/api/organizations/:org_id/users/:member_id/restore/vnext",
    authenticate("restore_member_vnext"),
    admin,
    restoreMember,
  )
  app.put("/api/organizations/:org_id/users/:member_id/restore", authenticate("restore_member"), admin, restoreMember)
}

function databaseResolve(
  context: Context<AuthenticationEnvironment>,
  options: OrganizationRouteOptions,
): OrganizationRouteOptions["database"] {
  return options.database ?? context.get("database")
}

function organizationMembershipHasFullAccess(
  membership: import("./organizationMembershipSchema.js").OrganizationMembership,
): boolean {
  return (
    membership.status === organizationMembershipStatus.confirmed &&
    (membership.accessAll ||
      membership.type === organizationMembershipType.owner ||
      membership.type === organizationMembershipType.admin)
  )
}

function organizationMembershipQueryOptionsResolve(
  context: Context<AuthenticationEnvironment>,
): Result<{ includeCollections: boolean; includeCollectionsProvided: boolean; includeGroups: boolean }> {
  const includeCollectionsValue = context.req.query("includeCollections")
  const includeCollectionsResult = organizationMembershipQueryBooleanResolve(context.req.query("includeCollections"))
  if (!includeCollectionsResult.success) return includeCollectionsResult
  const includeGroupsResult = organizationMembershipQueryBooleanResolve(context.req.query("includeGroups"))
  if (!includeGroupsResult.success) return includeGroupsResult
  return {
    success: true,
    data: {
      includeCollections: includeCollectionsResult.data,
      includeCollectionsProvided: includeCollectionsValue !== undefined,
      includeGroups: includeGroupsResult.data,
    },
  }
}

function organizationMembershipQueryBooleanResolve(value: string | undefined): Result<boolean> {
  if (value === undefined) return { success: true, data: false }
  const result = v.safeParse(organizationMembershipQueryBooleanSchema, value)
  if (!result.success)
    return organizationErrorCreate("organizationMembershipQueryOptionsResolve", "Invalid query parameter")
  return { success: true, data: result.output === "true" }
}

function organizationMembershipDetailsListFind(
  database: NonNullable<OrganizationRouteOptions["database"]>,
  organizationUuid: string,
  memberships: readonly import("./organizationMembershipSchema.js").OrganizationMembership[],
  includeCollections: boolean,
  includeGroups: boolean,
  groupsEnabled: boolean,
): Result<Record<string, unknown>[]> {
  const data: Record<string, unknown>[] = []
  for (const membership of memberships) {
    const result = organizationMembershipDetailsResponse(
      database,
      organizationUuid,
      membership.uuid,
      includeCollections,
      includeGroups,
      groupsEnabled,
    )
    if (!result.success) return result
    data.push(result.data)
  }
  return { success: true, data }
}

function organizationMembershipDetailsResponse(
  database: NonNullable<OrganizationRouteOptions["database"]>,
  organizationUuid: string,
  membershipUuid: string,
  includeCollections: boolean,
  includeGroups: boolean,
  groupsEnabled: boolean,
): Result<Record<string, unknown>> {
  const detailsResult = organizationMembershipUserDetailsFind(database, organizationUuid, membershipUuid)
  if (!detailsResult.success) return detailsResult
  if (detailsResult.data === null)
    return organizationErrorCreate(
      "organizationMembershipRoutesGet",
      "The specified user isn't a member of the organization",
    )
  const { membership, user } = detailsResult.data
  const groupsResult =
    includeGroups && groupsEnabled
      ? organizationMembershipGroupAssignmentsFind(database, organizationUuid, membership.uuid)
      : { success: true as const, data: [] as string[] }
  if (!groupsResult.success) return groupsResult
  const collectionsResult =
    includeCollections && !membership.accessAll
      ? organizationMembershipCollectionAssignmentsFind(database, organizationUuid, membership.uuid, groupsEnabled)
      : {
          success: true as const,
          data: [] as Array<{ hidePasswords: boolean; id: string; manage: boolean; readOnly: boolean }>,
        }
  if (!collectionsResult.success) return collectionsResult
  const twoFactorResult = organizationMembershipTwoFactorEnabledFind(database, user.uuid)
  if (!twoFactorResult.success) return twoFactorResult
  return {
    success: true,
    data: organizationMembershipUserDetailsToJson(
      membership,
      user,
      collectionsResult.data,
      groupsResult.data,
      twoFactorResult.data,
    ),
  }
}

function organizationMembershipBulkResponseToJson(
  object: string,
  id: string,
  result: Result<unknown>,
): Record<string, unknown> {
  return { error: result.success ? "" : result.errorMessage, id, object }
}

function organizationMembershipUserNotify(
  options: OrganizationRouteOptions,
  userUuid: string,
  contextId: string,
  type: "syncOrgKeys" | "syncSettings",
  revisionDate: string,
): void {
  if (options.notification === undefined) return
  try {
    options.notification.sendUserUpdate({
      contextId,
      payload: { Date: revisionDate, UserId: userUuid },
      type: notificationUpdateType[type],
    })
  } catch {}
}
