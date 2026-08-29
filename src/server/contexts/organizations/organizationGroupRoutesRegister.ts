import type { Context, Hono } from "hono"
import type { Result } from "#result"
import * as v from "valibot"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import { authenticationContextGet } from "../authentication/authenticationContextGet.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationMiddlewareCreate } from "../authentication/authenticationMiddlewareCreate.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { notificationUpdateType } from "../notifications/notificationUpdateType.js"
import { organizationAdminMiddleware } from "./organizationAdminMiddleware.js"
import { organizationCollectionFindByOrganization } from "./organizationCollectionFindByOrganization.js"
import { organizationCollectionGroupAccessReplace } from "./organizationCollectionGroupAccessReplace.js"
import { organizationCollectionManageableByUser } from "./organizationCollectionManageableByUser.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"
import { organizationGroupCollectionsFindByGroup } from "./organizationGroupCollectionsFindByGroup.js"
import { organizationGroupCreate } from "./organizationGroupCreate.js"
import { organizationGroupDelete } from "./organizationGroupDelete.js"
import { organizationGroupDeleteMany } from "./organizationGroupDeleteMany.js"
import type { OrganizationGroup } from "./organizationGroup.js"
import { organizationGroupDetailsToJson } from "./organizationGroupDetailsToJson.js"
import { organizationGroupFindByOrganization } from "./organizationGroupFindByOrganization.js"
import { organizationGroupFindByUuidAndOrganization } from "./organizationGroupFindByUuidAndOrganization.js"
import { organizationGroupFullAccessByMember } from "./organizationGroupFullAccessByMember.js"
import { organizationGroupMemberDelete } from "./organizationGroupMemberDelete.js"
import { organizationGroupMemberMembershipUuidsFind } from "./organizationGroupMemberMembershipUuidsFind.js"
import { organizationGroupMembersReplace } from "./organizationGroupMembersReplace.js"
import { organizationGroupMutationToJson } from "./organizationGroupMutationToJson.js"
import { organizationGroupRequestDataSchema } from "./organizationGroupRequestDataSchema.js"
import { organizationGroupRequestValidate } from "./organizationGroupRequestValidate.js"
import { organizationGroupSave } from "./organizationGroupSave.js"
import { organizationGroupToJson } from "./organizationGroupToJson.js"
import { organizationGroupIdsDataSchema } from "./organizationGroupIdsDataSchema.js"
import { groupIdResolve } from "./groupIdResolve.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import type { OrganizationRouteOptions } from "./organizationRouteOptions.js"
import { organizationMemberUserUuidsFind } from "./organizationMemberUserUuidsFind.js"
import { organizationManagerLooseMiddleware } from "./organizationManagerLooseMiddleware.js"

const organizationGroupMemberIdsSchema = v.array(v.pipe(v.string(), v.uuid()))

export function organizationGroupRoutesRegister(
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
  const managerLoose = organizationManagerLooseMiddleware({
    ...organizationAuthentication,
    groupsEnabled: options.groupsEnabled,
  })
  const admin = organizationAdminMiddleware(organizationAuthentication)

  const getGroups = (context: Context<AuthenticationEnvironment>, details: boolean) => {
    const requestContext = organizationGroupRequestContextResolve(
      context,
      options,
      details ? "get_groups_details" : "get_groups",
    )
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const allowedResult = organizationGroupListAllowed(requestContext.data, options, details)
    if (!allowedResult.success) return apiErrorResponseCreate(allowedResult)
    if (!allowedResult.data)
      return apiErrorResponseCreate(
        organizationErrorCreate(details ? "get_groups_details" : "get_groups", "Resource not found.", 404),
      )
    if (!options.groupsEnabled) return context.json(organizationGroupListToJson([]))
    const groupsResult = organizationGroupFindByOrganization(
      requestContext.data.database,
      requestContext.data.organizationUuid,
    )
    if (!groupsResult.success) return apiErrorResponseCreate(groupsResult)
    if (!details) return context.json(organizationGroupListToJson(groupsResult.data.map(organizationGroupToJson)))
    const detailsResult = organizationGroupDetailsListCreate(requestContext.data.database, groupsResult.data)
    if (!detailsResult.success) return apiErrorResponseCreate(detailsResult)
    return context.json(organizationGroupListToJson(detailsResult.data))
  }

  const createGroup = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = organizationGroupRequestContextResolve(context, options, "post_groups")
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    if (!options.groupsEnabled) return apiErrorResponseCreate(organizationGroupDisabledError("post_groups"))
    const bodyResult = await requestBodyParse(context, organizationGroupRequestDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const validationResult = organizationGroupRequestValidate(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      bodyResult.data,
    )
    if (!validationResult.success) return apiErrorResponseCreate(validationResult)

    const result = databaseTransaction(requestContext.data.database, () => {
      const groupResult = organizationGroupCreate(
        requestContext.data.database,
        requestContext.data.organizationUuid,
        bodyResult.data.name,
        bodyResult.data.accessAll,
        bodyResult.data.externalId,
        options.clock,
        options.identifier,
      )
      if (!groupResult.success) return groupResult
      const revisionDate = options.clock.now().toISOString()
      const collectionsResult = organizationCollectionGroupAccessReplace(
        requestContext.data.database,
        requestContext.data.organizationUuid,
        groupResult.data.uuid,
        bodyResult.data.collections,
        revisionDate,
      )
      if (!collectionsResult.success) return collectionsResult
      const membersResult = organizationGroupMembersReplace(
        requestContext.data.database,
        requestContext.data.organizationUuid,
        groupResult.data.uuid,
        bodyResult.data.users,
        revisionDate,
      )
      if (!membersResult.success) return membersResult
      return resultCreate(groupResult.data)
    })
    if (!result.success) return apiErrorResponseCreate(result)
    organizationGroupMembersNotify(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      requestContext.data.deviceUuid,
      options,
    )
    return context.json(organizationGroupMutationToJson(result.data))
  }

  const updateGroup = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = organizationGroupRequestContextResolve(context, options, "put_group")
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    if (!options.groupsEnabled) return apiErrorResponseCreate(organizationGroupDisabledError("put_group"))
    const groupUuidResult = organizationGroupUuidResolve(context, "put_group")
    if (!groupUuidResult.success) return apiErrorResponseCreate(groupUuidResult)
    const groupResult = organizationGroupFindByUuidAndOrganization(
      requestContext.data.database,
      groupUuidResult.data,
      requestContext.data.organizationUuid,
    )
    if (!groupResult.success) return apiErrorResponseCreate(groupResult)
    if (groupResult.data === null) return apiErrorResponseCreate(organizationGroupNotFoundError("put_group"))
    const bodyResult = await requestBodyParse(context, organizationGroupRequestDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const validationResult = organizationGroupRequestValidate(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      bodyResult.data,
    )
    if (!validationResult.success) return apiErrorResponseCreate(validationResult)

    const updatedGroup: OrganizationGroup = {
      ...groupResult.data,
      accessAll: bodyResult.data.accessAll,
      name: bodyResult.data.name,
    }
    const revisionDate = options.clock.now().toISOString()
    const result = databaseTransaction(requestContext.data.database, () => {
      const saveResult = organizationGroupSave(requestContext.data.database, updatedGroup, revisionDate)
      if (!saveResult.success) return saveResult
      const collectionsResult = organizationCollectionGroupAccessReplace(
        requestContext.data.database,
        requestContext.data.organizationUuid,
        updatedGroup.uuid,
        bodyResult.data.collections,
        revisionDate,
      )
      if (!collectionsResult.success) return collectionsResult
      const membersResult = organizationGroupMembersReplace(
        requestContext.data.database,
        requestContext.data.organizationUuid,
        updatedGroup.uuid,
        bodyResult.data.users,
        revisionDate,
      )
      if (!membersResult.success) return membersResult
      return resultCreate(updatedGroup)
    })
    if (!result.success) return apiErrorResponseCreate(result)
    organizationGroupMembersNotify(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      requestContext.data.deviceUuid,
      options,
    )
    return context.json(organizationGroupMutationToJson(result.data))
  }

  const getGroup = (context: Context<AuthenticationEnvironment>, details: boolean) => {
    const operation = details ? "get_group_details" : "get_group"
    const requestContext = organizationGroupRequestContextResolve(context, options, operation)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    if (!options.groupsEnabled) return apiErrorResponseCreate(organizationGroupDisabledError(operation))
    const groupUuidResult = organizationGroupUuidResolve(context, operation)
    if (!groupUuidResult.success) return apiErrorResponseCreate(groupUuidResult)
    const groupResult = organizationGroupFindByUuidAndOrganization(
      requestContext.data.database,
      groupUuidResult.data,
      requestContext.data.organizationUuid,
    )
    if (!groupResult.success) return apiErrorResponseCreate(groupResult)
    if (groupResult.data === null) return apiErrorResponseCreate(organizationGroupNotFoundError(operation))
    if (!details) return context.json(organizationGroupToJson(groupResult.data))
    const collectionsResult = organizationGroupCollectionsFindByGroup(
      requestContext.data.database,
      groupResult.data.uuid,
      requestContext.data.organizationUuid,
    )
    if (!collectionsResult.success) return apiErrorResponseCreate(collectionsResult)
    return context.json(organizationGroupDetailsToJson(groupResult.data, collectionsResult.data))
  }

  const deleteGroup = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = organizationGroupRequestContextResolve(context, options, "delete_group")
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    if (!options.groupsEnabled) return apiErrorResponseCreate(organizationGroupDisabledError("delete_group"))
    const groupUuidResult = organizationGroupUuidResolve(context, "delete_group")
    if (!groupUuidResult.success) return apiErrorResponseCreate(groupUuidResult)
    const groupResult = organizationGroupFindByUuidAndOrganization(
      requestContext.data.database,
      groupUuidResult.data,
      requestContext.data.organizationUuid,
    )
    if (!groupResult.success) return apiErrorResponseCreate(groupResult)
    if (groupResult.data === null) return apiErrorResponseCreate(organizationGroupNotFoundError("delete_group"))
    const result = organizationGroupDelete(
      requestContext.data.database,
      groupResult.data,
      options.clock.now().toISOString(),
    )
    if (!result.success) return apiErrorResponseCreate(result)
    organizationGroupMembersNotify(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      requestContext.data.deviceUuid,
      options,
    )
    return new Response(null, { status: 200 })
  }

  const getGroupMembers = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = organizationGroupRequestContextResolve(context, options, "get_group_members")
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    if (!options.groupsEnabled) return apiErrorResponseCreate(organizationGroupDisabledError("get_group_members"))
    const groupUuidResult = organizationGroupUuidResolve(context, "get_group_members")
    if (!groupUuidResult.success) return apiErrorResponseCreate(groupUuidResult)
    const groupResult = organizationGroupFindByUuidAndOrganization(
      requestContext.data.database,
      groupUuidResult.data,
      requestContext.data.organizationUuid,
    )
    if (!groupResult.success) return apiErrorResponseCreate(groupResult)
    if (groupResult.data === null)
      return apiErrorResponseCreate(organizationErrorCreate("get_group_members", "Group could not be found!"))
    const membersResult = organizationGroupMemberMembershipUuidsFind(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      groupUuidResult.data,
    )
    if (!membersResult.success) return apiErrorResponseCreate(membersResult)
    return context.json(membersResult.data)
  }

  const bulkDeleteGroups = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = organizationGroupRequestContextResolve(context, options, "bulk_delete_groups")
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    if (!options.groupsEnabled) return apiErrorResponseCreate(organizationGroupDisabledError("bulk_delete_groups"))
    const bodyResult = await requestBodyParse(context, organizationGroupIdsDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const result = organizationGroupDeleteMany(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      bodyResult.data.ids,
      options.clock.now().toISOString(),
    )
    if (!result.success) return apiErrorResponseCreate(result)
    organizationGroupMembersNotify(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      requestContext.data.deviceUuid,
      options,
    )
    return new Response(null, { status: 200 })
  }

  const replaceGroupMembers = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = organizationGroupRequestContextResolve(context, options, "put_group_members")
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    if (!options.groupsEnabled) return apiErrorResponseCreate(organizationGroupDisabledError("put_group_members"))
    const groupUuidResult = organizationGroupUuidResolve(context, "put_group_members")
    if (!groupUuidResult.success) return apiErrorResponseCreate(groupUuidResult)
    const groupResult = organizationGroupFindByUuidAndOrganization(
      requestContext.data.database,
      groupUuidResult.data,
      requestContext.data.organizationUuid,
    )
    if (!groupResult.success) return apiErrorResponseCreate(groupResult)
    if (groupResult.data === null)
      return apiErrorResponseCreate(organizationErrorCreate("put_group_members", "Group could not be found!"))
    const bodyResult = await requestBodyParse(context, organizationGroupMemberIdsSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const result = databaseTransaction(requestContext.data.database, () =>
      organizationGroupMembersReplace(
        requestContext.data.database,
        requestContext.data.organizationUuid,
        groupUuidResult.data,
        bodyResult.data,
        options.clock.now().toISOString(),
      ),
    )
    if (!result.success) return apiErrorResponseCreate(result)
    organizationGroupMembersNotify(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      requestContext.data.deviceUuid,
      options,
    )
    return new Response(null, { status: 200 })
  }

  const deleteGroupMember = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = organizationGroupRequestContextResolve(context, options, "post_delete_group_member")
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    if (!options.groupsEnabled)
      return apiErrorResponseCreate(organizationGroupDisabledError("post_delete_group_member"))
    const groupUuidResult = organizationGroupUuidResolve(context, "post_delete_group_member")
    if (!groupUuidResult.success) return apiErrorResponseCreate(groupUuidResult)
    const memberUuid = context.req.param("member_id")
    if (memberUuid === undefined || !v.safeParse(v.pipe(v.string(), v.uuid()), memberUuid).success)
      return apiErrorResponseCreate(
        organizationErrorCreate(
          "post_delete_group_member",
          "User could not be found or does not belong to the organization.",
        ),
      )
    const membershipExists = organizationGroupMembershipExists(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      memberUuid,
    )
    if (!membershipExists.success) return apiErrorResponseCreate(membershipExists)
    if (!membershipExists.data)
      return apiErrorResponseCreate(
        organizationErrorCreate(
          "post_delete_group_member",
          "User could not be found or does not belong to the organization.",
        ),
      )
    const groupResult = organizationGroupFindByUuidAndOrganization(
      requestContext.data.database,
      groupUuidResult.data,
      requestContext.data.organizationUuid,
    )
    if (!groupResult.success) return apiErrorResponseCreate(groupResult)
    if (groupResult.data === null)
      return apiErrorResponseCreate(
        organizationErrorCreate(
          "post_delete_group_member",
          "Group could not be found or does not belong to the organization.",
        ),
      )
    const result = organizationGroupMemberDelete(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      groupUuidResult.data,
      memberUuid,
      options.clock,
    )
    if (!result.success) return apiErrorResponseCreate(result)
    organizationGroupMembersNotify(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      requestContext.data.deviceUuid,
      options,
    )
    return new Response(null, { status: 200 })
  }

  app.get("/api/organizations/:org_id/groups/details", authenticate("get_groups_details"), managerLoose, (context) =>
    getGroups(context, true),
  )
  app.get("/api/organizations/:org_id/groups", authenticate("get_groups"), managerLoose, (context) =>
    getGroups(context, false),
  )
  app.post("/api/organizations/:org_id/groups", authenticate("post_groups"), admin, createGroup)
  app.post("/api/organizations/:org_id/groups/:group_id", authenticate("post_group"), admin, updateGroup)
  app.put("/api/organizations/:org_id/groups/:group_id", authenticate("put_group"), admin, updateGroup)
  app.get("/api/organizations/:org_id/groups/:group_id/details", authenticate("get_group_details"), admin, (context) =>
    getGroup(context, true),
  )
  app.post("/api/organizations/:org_id/groups/:group_id/delete", authenticate("post_delete_group"), admin, deleteGroup)
  app.delete("/api/organizations/:org_id/groups/:group_id", authenticate("delete_group"), admin, deleteGroup)
  app.delete("/api/organizations/:org_id/groups", authenticate("bulk_delete_groups"), admin, bulkDeleteGroups)
  app.get("/api/organizations/:org_id/groups/:group_id", authenticate("get_group"), admin, (context) =>
    getGroup(context, false),
  )
  app.get(
    "/api/organizations/:org_id/groups/:group_id/users",
    authenticate("get_group_members"),
    admin,
    getGroupMembers,
  )
  app.put(
    "/api/organizations/:org_id/groups/:group_id/users",
    authenticate("put_group_members"),
    admin,
    replaceGroupMembers,
  )
  app.post(
    "/api/organizations/:org_id/groups/:group_id/delete-user/:member_id",
    authenticate("post_delete_group_member"),
    admin,
    deleteGroupMember,
  )
}

function organizationGroupRequestContextResolve(
  context: Context<AuthenticationEnvironment>,
  options: OrganizationRouteOptions,
  op: string,
): Result<OrganizationGroupRequestContext> {
  const authentication = authenticationContextGet(context)
  if (authentication === undefined) return organizationErrorCreate(op, "Authentication is required.", 401)
  const database = options.database ?? context.get("database")
  if (database === undefined) return organizationErrorCreate(op, "Database unavailable.")
  const organizationUuid = context.get("organizationId")
  const membership = context.get("organizationMembership")
  if (organizationUuid === undefined || membership === undefined)
    return organizationErrorCreate(op, "Organization not found", 404)
  return {
    success: true,
    data: {
      database,
      deviceUuid: authentication.device.uuid,
      membership,
      organizationUuid,
      userUuid: authentication.user.uuid,
    },
  }
}

function organizationGroupUuidResolve(context: Context<AuthenticationEnvironment>, op: string): Result<string> {
  const groupUuid = groupIdResolve(context)
  if (groupUuid === undefined) return organizationErrorCreate(op, "Error getting the group id")
  return resultCreate(groupUuid)
}

function organizationGroupListAllowed(
  requestContext: OrganizationGroupRequestContext,
  options: OrganizationRouteOptions,
  details: boolean,
): Result<boolean> {
  const fullAccess = organizationGroupHasFullAccess(requestContext.membership)
  if (options.groupsEnabled) {
    const groupAccessResult = organizationGroupFullAccessByMember(
      requestContext.database,
      requestContext.organizationUuid,
      requestContext.membership.uuid,
    )
    if (!groupAccessResult.success) return groupAccessResult
    if (groupAccessResult.data) return resultCreate(true)
  }
  if (fullAccess) return resultCreate(true)
  if (details) return resultCreate(false)
  const collectionsResult = organizationCollectionFindByOrganization(
    requestContext.database,
    requestContext.organizationUuid,
  )
  if (!collectionsResult.success) return collectionsResult
  for (const collection of collectionsResult.data) {
    const manageableResult = organizationCollectionManageableByUser(
      requestContext.database,
      collection.uuid,
      requestContext.userUuid,
      requestContext.organizationUuid,
      options.groupsEnabled,
    )
    if (!manageableResult.success) return manageableResult
    if (manageableResult.data) return resultCreate(true)
  }
  return resultCreate(false)
}

function organizationGroupHasFullAccess(membership: OrganizationMembership): boolean {
  return membership.accessAll || membership.type <= 1
}

function organizationGroupListToJson(groups: readonly Record<string, unknown>[]) {
  return {
    continuationToken: null,
    data: groups,
    object: "list" as const,
  }
}

function organizationGroupDetailsListCreate(
  database: OrganizationGroupRequestContext["database"],
  groups: readonly OrganizationGroup[],
): Result<Record<string, unknown>[]> {
  const data: Record<string, unknown>[] = []
  for (const group of groups) {
    const collectionsResult = organizationGroupCollectionsFindByGroup(database, group.uuid, group.organizationUuid)
    if (!collectionsResult.success) return collectionsResult
    data.push(organizationGroupDetailsToJson(group, collectionsResult.data))
  }
  return resultCreate(data)
}

function organizationGroupDisabledError(op: string) {
  return organizationErrorCreate(op, "Group support is disabled")
}

function organizationGroupNotFoundError(op: string) {
  return organizationErrorCreate(op, "Group not found")
}

function organizationGroupMembershipExists(
  database: OrganizationGroupRequestContext["database"],
  organizationUuid: string,
  membershipUuid: string,
): Result<boolean> {
  const op = "organizationGroupMembershipExists"
  try {
    const row = database
      .query<{ uuid: string }, [string, string]>(
        "SELECT uuid FROM users_organizations WHERE uuid = ? AND org_uuid = ? LIMIT 1",
      )
      .get(membershipUuid, organizationUuid)
    return resultCreate(row !== null)
  } catch {
    return organizationErrorCreate(op, "Organization membership lookup failed.")
  }
}

function organizationGroupMembersNotify(
  database: OrganizationGroupRequestContext["database"],
  organizationUuid: string,
  contextId: string,
  options: OrganizationRouteOptions,
): void {
  if (options.notification === undefined) return
  const memberUuidsResult = organizationMemberUserUuidsFind(database, organizationUuid)
  if (!memberUuidsResult.success) return
  const date = options.clock.now().toISOString()
  for (const userUuid of memberUuidsResult.data) {
    try {
      options.notification.sendUserUpdate({
        contextId,
        payload: { Date: date, UserId: userUuid },
        type: notificationUpdateType.syncSettings,
      })
    } catch {}
  }
}

type OrganizationGroupRequestContext = {
  database: NonNullable<OrganizationRouteOptions["database"]>
  deviceUuid: string
  membership: OrganizationMembership
  organizationUuid: string
  userUuid: string
}
