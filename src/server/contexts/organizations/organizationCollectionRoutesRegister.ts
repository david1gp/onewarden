import type { Context, Hono } from "hono"
import type { Result } from "#result"
import { and, eq, or } from "drizzle-orm"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import { authenticationContextGet } from "../authentication/authenticationContextGet.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationMiddlewareCreate } from "../authentication/authenticationMiddlewareCreate.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { organizationManagerLooseMiddleware } from "./organizationManagerLooseMiddleware.js"
import { organizationManagerMiddleware } from "./organizationManagerMiddleware.js"
import { collectionIdResolve } from "./collectionIdResolve.js"
import { organizationCollectionAccessFindByUser } from "./organizationCollectionAccessFindByUser.js"
import { organizationCollectionAffectedUserUuidsFind } from "./organizationCollectionAffectedUserUuidsFind.js"
import { organizationCollectionAccessDetailsToJson } from "./organizationCollectionAccessDetailsToJson.js"
import { organizationCollectionAssignmentsReplace } from "./organizationCollectionAssignmentsReplace.js"
import { organizationCollectionAssignmentsResolve } from "./organizationCollectionAssignmentsResolve.js"
import { organizationCollectionBulkAccessDataSchema } from "./organizationCollectionBulkAccessDataSchema.js"
import { organizationCollectionCreate } from "./organizationCollectionCreate.js"
import { organizationCollectionDataSchema } from "./organizationCollectionDataSchema.js"
import { organizationCollectionDelete } from "./organizationCollectionDelete.js"
import { organizationCollectionDeleteInTransaction } from "./organizationCollectionDeleteInTransaction.js"
import type { OrganizationCollection } from "./organizationCollection.js"
import { organizationCollectionFindByOrganization } from "./organizationCollectionFindByOrganization.js"
import { organizationCollectionFindByUser } from "./organizationCollectionFindByUser.js"
import { organizationCollectionFindByUuidAndOrganization } from "./organizationCollectionFindByUuidAndOrganization.js"
import { organizationCollectionFindByUuidAndUser } from "./organizationCollectionFindByUuidAndUser.js"
import { organizationCollectionGroupAccessFindByCollection } from "./organizationCollectionGroupAccessFindByCollection.js"
import { organizationCollectionIdsDataSchema } from "./organizationCollectionIdsDataSchema.js"
import { organizationCollectionManageableByUser } from "./organizationCollectionManageableByUser.js"
import { organizationCollectionSave } from "./organizationCollectionSave.js"
import { organizationCollectionToJson } from "./organizationCollectionToJson.js"
import { organizationCollectionUpdate } from "./organizationCollectionUpdate.js"
import { organizationCollectionUserAccessFindByCollection } from "./organizationCollectionUserAccessFindByCollection.js"
import { organizationMemberUserUuidsFind } from "./organizationMemberUserUuidsFind.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import type { OrganizationRouteOptions } from "./organizationRouteOptions.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"
import { notificationUpdateType } from "../notifications/notificationUpdateType.js"

export function organizationCollectionRoutesRegister(
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
    database: options.database,
    groupsEnabled: options.groupsEnabled,
  })
  const manager = organizationManagerMiddleware({
    ...organizationAuthentication,
    database: options.database,
    groupsEnabled: options.groupsEnabled,
  })

  const getUserCollections = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = organizationCollectionRequestContextResolve(context, options, "getUserCollections")
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const result = organizationCollectionFindByUser(
      requestContext.data.database,
      requestContext.data.userUuid,
      options.groupsEnabled,
    )
    if (!result.success) return apiErrorResponseCreate(result)
    return context.json(organizationCollectionListToJson(result.data))
  }

  const getOrganizationCollections = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = organizationCollectionOrganizationContextResolve(context, options, "getOrgCollections")
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    if (!organizationCollectionHasFullAccess(requestContext.data.membership))
      return apiErrorResponseCreate(organizationErrorCreate("getOrgCollections", "Resource not found.", 404))
    const result = organizationCollectionFindByOrganization(
      requestContext.data.database,
      requestContext.data.organizationUuid,
    )
    if (!result.success) return apiErrorResponseCreate(result)
    return context.json(organizationCollectionListToJson(result.data))
  }

  const getOrganizationCollectionDetails = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = organizationCollectionOrganizationContextResolve(
      context,
      options,
      "getOrgCollectionsDetails",
    )
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const collectionsResult = organizationCollectionFindByOrganization(
      requestContext.data.database,
      requestContext.data.organizationUuid,
    )
    if (!collectionsResult.success) return apiErrorResponseCreate(collectionsResult)
    const manageAllResult = organizationCollectionManageAllMembershipsFind(
      requestContext.data.database,
      requestContext.data.organizationUuid,
    )
    if (!manageAllResult.success) return apiErrorResponseCreate(manageAllResult)

    const data: Record<string, unknown>[] = []
    for (const collection of collectionsResult.data) {
      const assignedResult = organizationCollectionFindByUuidAndUser(
        requestContext.data.database,
        collection.uuid,
        requestContext.data.userUuid,
        options.groupsEnabled,
      )
      if (!assignedResult.success) return apiErrorResponseCreate(assignedResult)
      const assigned =
        organizationCollectionHasFullAccess(requestContext.data.membership) || assignedResult.data !== null
      if (!assigned) continue

      const accessResult = organizationCollectionUserAccessFindByCollection(
        requestContext.data.database,
        requestContext.data.organizationUuid,
        collection.uuid,
      )
      if (!accessResult.success) return apiErrorResponseCreate(accessResult)
      const permissionResult = organizationCollectionAccessFindByUser(
        requestContext.data.database,
        collection.uuid,
        requestContext.data.userUuid,
        options.groupsEnabled,
      )
      if (!permissionResult.success) return apiErrorResponseCreate(permissionResult)
      const groupsResult = organizationCollectionGroupAccessFindByCollection(
        requestContext.data.database,
        requestContext.data.organizationUuid,
        collection.uuid,
      )
      if (!groupsResult.success) return apiErrorResponseCreate(groupsResult)
      data.push(
        organizationCollectionAccessDetailsToJson(
          collection,
          requestContext.data.membership,
          permissionResult.data,
          assigned,
          accessResult.data,
          options.groupsEnabled ? groupsResult.data : [],
          manageAllResult.data,
        ),
      )
    }
    return context.json({ continuationToken: null, data, object: "list" })
  }

  const createOrganizationCollection = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = organizationCollectionOrganizationContextResolve(
      context,
      options,
      "postOrganizationCollections",
    )
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    if (requestContext.data.membership.type === 3 && !requestContext.data.membership.accessAll)
      return apiErrorResponseCreate(
        organizationErrorCreate("postOrganizationCollections", "You don't have permission to create collections"),
      )
    const bodyResult = await requestBodyParse(context, organizationCollectionDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const result = databaseTransaction(requestContext.data.database, () =>
      organizationCollectionCreate(
        requestContext.data.database,
        requestContext.data.organizationUuid,
        bodyResult.data.name,
        bodyResult.data.externalId,
        options.clock.now().toISOString(),
        options.identifier,
        { groups: bodyResult.data.groups, users: bodyResult.data.users },
      ),
    )
    if (!result.success) return apiErrorResponseCreate(result)
    organizationCollectionMembersNotify(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      requestContext.data.deviceUuid,
      options,
    )
    return context.json(
      organizationCollectionDetailsToJson(
        requestContext.data.database,
        result.data,
        requestContext.data.membership,
        requestContext.data.userUuid,
        options.groupsEnabled,
      ),
    )
  }

  const updateOrganizationCollection = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = organizationCollectionOrganizationContextResolve(
      context,
      options,
      "postOrganizationCollectionUpdate",
    )
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const collectionUuidResult = organizationCollectionUuidResolve(context, "postOrganizationCollectionUpdate")
    if (!collectionUuidResult.success) return apiErrorResponseCreate(collectionUuidResult)
    const bodyResult = await requestBodyParse(context, organizationCollectionDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const result = databaseTransaction(requestContext.data.database, () =>
      organizationCollectionUpdate(
        requestContext.data.database,
        requestContext.data.organizationUuid,
        collectionUuidResult.data,
        bodyResult.data.name,
        bodyResult.data.externalId,
        options.clock,
        { groups: bodyResult.data.groups, users: bodyResult.data.users },
      ),
    )
    if (!result.success) return apiErrorResponseCreate(result)
    organizationCollectionMembersNotify(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      requestContext.data.deviceUuid,
      options,
    )
    return context.json(
      organizationCollectionDetailsToJson(
        requestContext.data.database,
        result.data,
        requestContext.data.membership,
        requestContext.data.userUuid,
        options.groupsEnabled,
      ),
    )
  }

  const bulkAccessOrganizationCollections = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = organizationCollectionOrganizationContextResolve(
      context,
      options,
      "postBulkAccessCollections",
    )
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, organizationCollectionBulkAccessDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const body = bodyResult.data
    const assignmentResult = organizationCollectionAssignmentsResolve(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      body.groups,
      body.users,
    )
    if (!assignmentResult.success) return apiErrorResponseCreate(assignmentResult)

    const collections: OrganizationCollection[] = []
    for (const collectionUuid of body.collectionIds) {
      const collectionResult = organizationCollectionFindByUuidAndOrganization(
        requestContext.data.database,
        collectionUuid,
        requestContext.data.organizationUuid,
      )
      if (!collectionResult.success) return apiErrorResponseCreate(collectionResult)
      if (collectionResult.data === null)
        return apiErrorResponseCreate(organizationErrorCreate("postBulkAccessCollections", "Collection not found"))
      const manageableResult = organizationCollectionManageableByUser(
        requestContext.data.database,
        collectionUuid,
        requestContext.data.userUuid,
        requestContext.data.organizationUuid,
        options.groupsEnabled,
      )
      if (!manageableResult.success) return apiErrorResponseCreate(manageableResult)
      if (!manageableResult.data)
        return apiErrorResponseCreate(organizationErrorCreate("postBulkAccessCollections", "Collection not found", 404))
      collections.push(collectionResult.data)
    }

    const revisionDate = options.clock.now().toISOString()
    const result = databaseTransaction(requestContext.data.database, () => {
      for (const collection of collections) {
        const saveResult = organizationCollectionSave(requestContext.data.database, collection, revisionDate)
        if (!saveResult.success) return saveResult
        const replaceResult = organizationCollectionAssignmentsReplace(
          requestContext.data.database,
          requestContext.data.organizationUuid,
          collection.uuid,
          body.groups,
          body.users,
          revisionDate,
        )
        if (!replaceResult.success) return replaceResult
      }
      return resultCreate(undefined)
    })
    if (!result.success) return apiErrorResponseCreate(result)
    organizationCollectionMembersNotify(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      requestContext.data.deviceUuid,
      options,
    )
    return new Response(null, { status: 200 })
  }

  const deleteOrganizationCollection = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = organizationCollectionOrganizationContextResolve(
      context,
      options,
      "deleteOrganizationCollection",
    )
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const collectionUuidResult = organizationCollectionUuidResolve(context, "deleteOrganizationCollection")
    if (!collectionUuidResult.success) return apiErrorResponseCreate(collectionUuidResult)
    const result = organizationCollectionDelete(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      collectionUuidResult.data,
      options.clock.now().toISOString(),
    )
    if (!result.success) return apiErrorResponseCreate(result)
    organizationCollectionMembersNotify(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      requestContext.data.deviceUuid,
      options,
    )
    return new Response(null, { status: 200 })
  }

  const getOrganizationCollectionDetail = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = organizationCollectionOrganizationContextResolve(context, options, "getOrgCollectionDetail")
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const collectionUuidResult = organizationCollectionUuidResolve(context, "getOrgCollectionDetail")
    if (!collectionUuidResult.success) return apiErrorResponseCreate(collectionUuidResult)
    const collectionResult = organizationCollectionFindByUuidAndUser(
      requestContext.data.database,
      collectionUuidResult.data,
      requestContext.data.userUuid,
      options.groupsEnabled,
    )
    if (!collectionResult.success) return apiErrorResponseCreate(collectionResult)
    if (collectionResult.data === null)
      return apiErrorResponseCreate(organizationErrorCreate("getOrgCollectionDetail", "Collection not found"))
    if (collectionResult.data.organizationUuid !== requestContext.data.organizationUuid)
      return apiErrorResponseCreate(
        organizationErrorCreate("getOrgCollectionDetail", "Collection is not owned by organization"),
      )
    const accessResult = organizationCollectionUserAccessFindByCollection(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      collectionResult.data.uuid,
    )
    if (!accessResult.success) return apiErrorResponseCreate(accessResult)
    const permissionResult = organizationCollectionAccessFindByUser(
      requestContext.data.database,
      collectionResult.data.uuid,
      requestContext.data.userUuid,
      options.groupsEnabled,
    )
    if (!permissionResult.success) return apiErrorResponseCreate(permissionResult)
    const groupsResult = organizationCollectionGroupAccessFindByCollection(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      collectionResult.data.uuid,
    )
    if (!groupsResult.success) return apiErrorResponseCreate(groupsResult)
    return context.json(
      organizationCollectionAccessDetailsToJson(
        collectionResult.data,
        requestContext.data.membership,
        permissionResult.data,
        true,
        accessResult.data,
        options.groupsEnabled ? groupsResult.data : [],
        [],
      ),
    )
  }

  const bulkDeleteOrganizationCollections = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = organizationCollectionOrganizationContextResolve(
      context,
      options,
      "bulkDeleteOrganizationCollections",
    )
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, organizationCollectionIdsDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)

    const collections: OrganizationCollection[] = []
    for (const collectionUuid of bodyResult.data.ids) {
      const collectionResult = organizationCollectionFindByUuidAndOrganization(
        requestContext.data.database,
        collectionUuid,
        requestContext.data.organizationUuid,
      )
      if (!collectionResult.success) return apiErrorResponseCreate(collectionResult)
      if (collectionResult.data === null)
        return apiErrorResponseCreate(
          organizationErrorCreate("bulkDeleteOrganizationCollections", "Collection not found"),
        )
      const manageableResult = organizationCollectionManageableByUser(
        requestContext.data.database,
        collectionUuid,
        requestContext.data.userUuid,
        requestContext.data.organizationUuid,
        options.groupsEnabled,
      )
      if (!manageableResult.success) return apiErrorResponseCreate(manageableResult)
      if (!manageableResult.data)
        return apiErrorResponseCreate(
          organizationErrorCreate("bulkDeleteOrganizationCollections", "Collection not found", 404),
        )
      collections.push(collectionResult.data)
    }

    const revisionDate = options.clock.now().toISOString()
    const result = databaseTransaction(requestContext.data.database, () => {
      for (const collection of collections) {
        const affectedResult = organizationCollectionAffectedUserUuidsFind(
          requestContext.data.database,
          requestContext.data.organizationUuid,
          collection.uuid,
        )
        if (!affectedResult.success) return affectedResult
        const deleteResult = organizationCollectionDeleteInTransaction(
          requestContext.data.database,
          requestContext.data.organizationUuid,
          collection,
          affectedResult.data,
          revisionDate,
        )
        if (!deleteResult.success) return deleteResult
      }
      return resultCreate(undefined)
    })
    if (!result.success) return apiErrorResponseCreate(result)
    organizationCollectionMembersNotify(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      requestContext.data.deviceUuid,
      options,
    )
    return new Response(null, { status: 200 })
  }

  const getOrganizationCollectionUsers = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = organizationCollectionOrganizationContextResolve(context, options, "getCollectionUsers")
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const collectionUuidResult = organizationCollectionUuidResolve(context, "getCollectionUsers")
    if (!collectionUuidResult.success) return apiErrorResponseCreate(collectionUuidResult)
    const collectionResult = organizationCollectionFindByOrganization(
      requestContext.data.database,
      requestContext.data.organizationUuid,
    )
    if (!collectionResult.success) return apiErrorResponseCreate(collectionResult)
    if (!collectionResult.data.some((collection) => collection.uuid === collectionUuidResult.data))
      return apiErrorResponseCreate(
        organizationErrorCreate("getCollectionUsers", "Collection not found in Organization"),
      )
    const accessResult = organizationCollectionUserAccessFindByCollection(
      requestContext.data.database,
      requestContext.data.organizationUuid,
      collectionUuidResult.data,
    )
    if (!accessResult.success) return apiErrorResponseCreate(accessResult)
    return context.json(
      accessResult.data.map((access) => ({
        hidePasswords: access.hidePasswords,
        id: access.membershipUuid,
        manage: access.manage,
        readOnly: access.readOnly,
      })),
    )
  }

  app.get("/api/collections", authenticate("get_user_collections"), getUserCollections)
  app.get(
    "/api/organizations/:org_id/collections",
    authenticate("get_org_collections"),
    managerLoose,
    getOrganizationCollections,
  )
  app.get(
    "/api/organizations/:org_id/collections/details",
    authenticate("get_org_collections_details"),
    managerLoose,
    getOrganizationCollectionDetails,
  )
  app.post(
    "/api/organizations/:org_id/collections",
    authenticate("post_organization_collections"),
    managerLoose,
    createOrganizationCollection,
  )
  app.post(
    "/api/organizations/:org_id/collections/bulk-access",
    authenticate("post_bulk_access_collections"),
    managerLoose,
    bulkAccessOrganizationCollections,
  )
  app.put(
    "/api/organizations/:org_id/collections/:col_id",
    authenticate("put_organization_collection_update"),
    manager,
    updateOrganizationCollection,
  )
  app.post(
    "/api/organizations/:org_id/collections/:col_id",
    authenticate("post_organization_collection_update"),
    manager,
    updateOrganizationCollection,
  )
  app.delete(
    "/api/organizations/:org_id/collections/:col_id",
    authenticate("delete_organization_collection"),
    manager,
    deleteOrganizationCollection,
  )
  app.post(
    "/api/organizations/:org_id/collections/:col_id/delete",
    authenticate("post_organization_collection_delete"),
    manager,
    deleteOrganizationCollection,
  )
  app.delete(
    "/api/organizations/:org_id/collections",
    authenticate("bulk_delete_organization_collections"),
    managerLoose,
    bulkDeleteOrganizationCollections,
  )
  app.get(
    "/api/organizations/:org_id/collections/:col_id/details",
    authenticate("get_org_collection_detail"),
    manager,
    getOrganizationCollectionDetail,
  )
  app.get(
    "/api/organizations/:org_id/collections/:col_id/users",
    authenticate("get_collection_users"),
    manager,
    getOrganizationCollectionUsers,
  )
}

function organizationCollectionRequestContextResolve(
  context: Context<AuthenticationEnvironment>,
  options: OrganizationRouteOptions,
  op: string,
): Result<OrganizationCollectionRequestContext> {
  const authentication = authenticationContextGet(context)
  if (authentication === undefined) return organizationErrorCreate(op, "Authentication is required.", 401)
  const database = options.database ?? context.get("database")
  if (database === undefined) return organizationErrorCreate(op, "Database unavailable.")
  return {
    success: true,
    data: {
      database,
      deviceUuid: authentication.device.uuid,
      organizationUuid: "",
      userUuid: authentication.user.uuid,
    },
  }
}

function organizationCollectionOrganizationContextResolve(
  context: Context<AuthenticationEnvironment>,
  options: OrganizationRouteOptions,
  op: string,
): Result<OrganizationCollectionRequestContext & { membership: OrganizationMembership }> {
  const requestContext = organizationCollectionRequestContextResolve(context, options, op)
  if (!requestContext.success) return requestContext
  const organizationUuid = context.get("organizationId")
  const membership = context.get("organizationMembership")
  if (organizationUuid === undefined || membership === undefined)
    return organizationErrorCreate(op, "Organization not found", 404)
  return { success: true, data: { ...requestContext.data, membership, organizationUuid } }
}

function organizationCollectionUuidResolve(context: Context<AuthenticationEnvironment>, op: string): Result<string> {
  const collectionUuid = collectionIdResolve(context)
  if (collectionUuid === undefined) return organizationErrorCreate(op, "Error getting the collection id")
  return { success: true, data: collectionUuid }
}

function organizationCollectionListToJson(collections: readonly OrganizationCollection[]) {
  return {
    continuationToken: null,
    data: collections.map(organizationCollectionToJson),
    object: "list" as const,
  }
}

function organizationCollectionHasFullAccess(membership: OrganizationMembership): boolean {
  return membership.accessAll || membership.type <= 1
}

function organizationCollectionDetailsToJson(
  database: NonNullable<OrganizationRouteOptions["database"]>,
  collection: OrganizationCollection,
  membership: OrganizationMembership,
  userUuid: string,
  groupsEnabled: boolean,
) {
  const accessResult = organizationCollectionAccessFindByUser(database, collection.uuid, userUuid, groupsEnabled)
  const access = accessResult.success ? accessResult.data : null
  const permissions = organizationCollectionPermissionsFromAccess(membership, access)
  return {
    ...organizationCollectionToJson(collection),
    hidePasswords: permissions.hidePasswords,
    manage: permissions.manage,
    object: "collectionDetails" as const,
    readOnly: permissions.readOnly,
  }
}

function organizationCollectionPermissionsFromAccess(
  membership: OrganizationMembership,
  access: { hidePasswords: boolean; manage: boolean; readOnly: boolean } | null,
): { hidePasswords: boolean; manage: boolean; readOnly: boolean } {
  if (organizationCollectionHasFullAccess(membership))
    return { hidePasswords: false, manage: membership.type >= 3, readOnly: false }
  if (access === null) return { hidePasswords: true, manage: false, readOnly: true }
  return {
    hidePasswords: access.hidePasswords,
    manage: membership.type === 3 && (access.manage || (!access.readOnly && !access.hidePasswords)),
    readOnly: access.readOnly,
  }
}

function organizationCollectionManageAllMembershipsFind(
  database: NonNullable<OrganizationRouteOptions["database"]>,
  organizationUuid: string,
): Result<string[]> {
  const op = "organizationCollectionManageAllMembershipsFind"
  try {
    const rows = database.drizzle
      .select({ uuid: usersOrganizations.uuid })
      .from(usersOrganizations)
      .where(
        and(
          eq(usersOrganizations.orgUuid, organizationUuid),
          eq(usersOrganizations.status, 2),
          or(
            eq(usersOrganizations.atype, 0),
            eq(usersOrganizations.atype, 1),
            and(eq(usersOrganizations.atype, 3), eq(usersOrganizations.accessAll, true)),
          ),
        ),
      )
      .all()
    return { success: true, data: rows.map((row) => row.uuid) }
  } catch {
    return organizationErrorCreate(op, "Organization membership lookup failed.")
  }
}

function organizationCollectionMembersNotify(
  database: NonNullable<OrganizationRouteOptions["database"]>,
  organizationUuid: string,
  contextId: string,
  options: OrganizationRouteOptions,
): void {
  if (options.notification === undefined) return
  const membersResult = organizationMemberUserUuidsFind(database, organizationUuid)
  if (!membersResult.success) return
  const date = options.clock.now().toISOString()
  for (const userUuid of membersResult.data) {
    try {
      options.notification.sendUserUpdate({
        contextId,
        payload: { Date: date, UserId: userUuid },
        type: notificationUpdateType.syncSettings,
      })
    } catch {}
  }
}

type OrganizationCollectionRequestContext = {
  database: NonNullable<OrganizationRouteOptions["database"]>
  deviceUuid: string
  organizationUuid: string
  userUuid: string
}
