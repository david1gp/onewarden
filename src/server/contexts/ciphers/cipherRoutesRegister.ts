import type { Context, Hono } from "hono"
import * as v from "valibot"
import { type ResultErr } from "#result"
import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import { requestPathParse } from "../../../shared/validation/requestPathParse.js"
import { requestQueryParse } from "../../../shared/validation/requestQueryParse.js"
import type { AuthenticationContext } from "../authentication/authenticationContext.js"
import { authenticationDatabaseRequestContextResolve } from "../authentication/authenticationDatabaseRequestContextResolve.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationMiddlewareCreate } from "../authentication/authenticationMiddlewareCreate.js"
import { cipherArchive } from "./cipherArchive.js"
import { cipherAccessFindByUser } from "./cipherAccessFindByUser.js"
import { cipherCollectionsDataSchema } from "./cipherCollectionsDataSchema.js"
import { cipherCollectionsReplace } from "./cipherCollectionsReplace.js"
import type { Cipher } from "./cipher.js"
import { cipherCreate } from "./cipherCreate.js"
import { cipherCreateRequestSchema } from "./cipherCreateRequestSchema.js"
import type { CipherData } from "./cipherDataSchema.js"
import { cipherDataSchema } from "./cipherDataSchema.js"
import { cipherDelete } from "./cipherDelete.js"
import { cipherIdsDataSchema } from "./cipherIdsDataSchema.js"
import { cipherErrorCreate } from "./cipherErrorCreate.js"
import { cipherFindByOrganization } from "./cipherFindByOrganization.js"
import { cipherFindByUser } from "./cipherFindByUser.js"
import { cipherFindByUuid } from "./cipherFindByUuid.js"
import { cipherImport } from "./cipherImport.js"
import { cipherImportDataSchema } from "./cipherImportDataSchema.js"
import { cipherOrganizationImport } from "./cipherOrganizationImport.js"
import { cipherOrganizationImportDataSchema } from "./cipherOrganizationImportDataSchema.js"
import { cipherMoveDataSchema } from "./cipherMoveDataSchema.js"
import { cipherNotificationAdapterCreate } from "./cipherNotificationAdapterCreate.js"
import { cipherNotificationSend } from "./cipherNotificationSend.js"
import { cipherFavoriteSet } from "./cipherFavoriteSet.js"
import { cipherFolderSet } from "./cipherFolderSet.js"
import type { CipherRouteOptions } from "./cipherRouteOptions.js"
import type { CipherPartialData } from "./cipherPartialDataSchema.js"
import { cipherPartialDataSchema } from "./cipherPartialDataSchema.js"
import { cipherRestore } from "./cipherRestore.js"
import { cipherShare } from "./cipherShare.js"
import { cipherShareDataSchema } from "./cipherShareDataSchema.js"
import { cipherShareSelected } from "./cipherShareSelected.js"
import { cipherShareSelectedDataSchema } from "./cipherShareSelectedDataSchema.js"
import { cipherToJson } from "./cipherToJson.js"
import { cipherOrganizationDetailsQuerySchema } from "./cipherOrganizationDetailsQuerySchema.js"
import { cipherOrganizationToJson } from "./cipherOrganizationToJson.js"
import { cipherUpdate } from "./cipherUpdate.js"
import { cipherUpdateType } from "./cipherUpdateType.js"
import { cipherUserNotificationSend } from "./cipherUserNotificationSend.js"
import { cipherUserUuidsFind } from "./cipherUserUuidsFind.js"
import { cipherMoveSelected } from "./cipherMoveSelected.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { folderFindByUuidAndUser } from "../folders/folderFindByUuidAndUser.js"
import { eventType } from "../events/eventType.js"
import { organizationManagerLooseMiddleware } from "../organizations/organizationManagerLooseMiddleware.js"
import { organizationMemberMiddleware } from "../organizations/organizationMemberMiddleware.js"
import { organizationMembershipHasFullAccess } from "../organizations/organizationMembershipHasFullAccess.js"
import { organizationErrorCreate } from "../organizations/organizationErrorCreate.js"

const cipherPathSchema = v.object({ cipher_id: v.string() })

export function cipherRoutesRegister(app: Hono<AuthenticationEnvironment>, options: CipherRouteOptions): void {
  const notification = options.notification ?? cipherNotificationAdapterCreate()
  const authenticate = authenticationMiddlewareCreate({
    clock: options.clock,
    database: options.database,
    publicKey: options.publicKey,
    publicOrigin: options.publicOrigin,
  })
  const organizationManagerLoose = organizationManagerLooseMiddleware({
    clock: options.clock,
    database: options.database,
    publicKey: options.publicKey,
    publicOrigin: options.publicOrigin,
  })
  const organizationMember = organizationMemberMiddleware({
    clock: options.clock,
    database: options.database,
    publicKey: options.publicKey,
    publicOrigin: options.publicOrigin,
  })

  const list = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = cipherRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const ciphersResult = cipherFindByUser(
      requestContext.data.database,
      requestContext.data.userUuid,
      options.groupsEnabled,
    )
    if (!ciphersResult.success) return apiErrorResponseCreate(ciphersResult)
    const data: Record<string, unknown>[] = []
    for (const cipher of ciphersResult.data) {
      const jsonResult = await cipherToJson(
        requestContext.data.database,
        cipher,
        requestContext.data.userUuid,
        cipherJsonOptions(context, options),
      )
      if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
      data.push(jsonResult.data)
    }
    return context.json({ continuationToken: null, data, object: "list" })
  }

  const organizationDetails = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = cipherRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const queryResult = requestQueryParse(context, cipherOrganizationDetailsQuerySchema)
    if (!queryResult.success) return apiErrorResponseCreate(queryResult)
    const organizationUuid = context.get("organizationId")
    const membership = context.get("organizationMembership")
    if (organizationUuid === undefined || membership === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("cipherRoutesOrganizationDetails", "Organization not found", 404),
      )
    if (organizationUuid !== queryResult.data.organizationId)
      return apiErrorResponseCreate(
        organizationErrorCreate("cipherRoutesOrganizationDetails", "Resource not found.", 404),
      )
    if (!organizationMembershipHasFullAccess(membership))
      return apiErrorResponseCreate(
        organizationErrorCreate("cipherRoutesOrganizationDetails", "Resource not found.", 404),
      )
    const ciphersResult = cipherFindByOrganization(requestContext.data.database, queryResult.data.organizationId)
    if (!ciphersResult.success) return apiErrorResponseCreate(ciphersResult)
    const data: Record<string, unknown>[] = []
    for (const cipher of ciphersResult.data) {
      const jsonResult = await cipherOrganizationToJson(
        requestContext.data.database,
        cipher,
        queryResult.data.organizationId,
        {
          clock: options.clock,
          origin: new URL(options.publicOrigin ?? context.req.url).origin,
          privateKey: options.privateKey,
        },
      )
      if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
      data.push(jsonResult.data)
    }
    return context.json({ continuationToken: null, data, object: "list" })
  }

  const get = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = cipherRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const pathResult = requestPathParse(context, cipherPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const cipherResult = cipherFindByUuid(requestContext.data.database, pathResult.data.cipher_id)
    if (!cipherResult.success) return apiErrorResponseCreate(cipherResult)
    if (cipherResult.data === null)
      return apiErrorResponseCreate(cipherErrorCreate("cipherRoutesGet", "Cipher doesn't exist"))
    const accessResult = cipherAccessFindByUser(
      requestContext.data.database,
      cipherResult.data,
      requestContext.data.userUuid,
      options.groupsEnabled,
    )
    if (!accessResult.success) return apiErrorResponseCreate(accessResult)
    if (accessResult.data === null)
      return apiErrorResponseCreate(cipherErrorCreate("cipherRoutesGet", "Cipher is not accessible"))
    const jsonResult = await cipherToJson(
      requestContext.data.database,
      cipherResult.data,
      requestContext.data.userUuid,
      cipherJsonOptions(context, options),
    )
    if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
    return context.json(jsonResult.data)
  }

  const create = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = cipherRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, cipherDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    return cipherCreateResponse(context, requestContext.data, bodyResult.data, options)
  }

  const createWrapped = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = cipherRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, cipherCreateRequestSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const body = bodyResult.data
    let data: CipherData | undefined
    if ("cipher" in body && body.cipher !== undefined) data = body.cipher
    if ("Cipher" in body && body.Cipher !== undefined) data = body.Cipher
    if ("type" in body) data = body
    if (data === undefined) return apiErrorResponseCreate(cipherErrorCreate("cipherRoutesCreate", "Cipher is required"))
    const collectionIds = "cipher" in body || "Cipher" in body ? (body.collectionIds ?? body.CollectionIds) : undefined
    return cipherCreateResponse(context, requestContext.data, data, options, collectionIds)
  }

  const importCiphers = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = cipherRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, cipherImportDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const importResult = cipherImport(
      requestContext.data.database,
      requestContext.data.userUuid,
      bodyResult.data,
      options.clock,
      options.identifier,
      options.maxNoteSize,
      options.groupsEnabled,
    )
    if (!importResult.success) return apiErrorResponseCreate(importResult)
    await cipherUserNotificationSend(
      notification,
      cipherUpdateType.syncVault,
      requestContext.data.userUuid,
      importResult.data.revisionDate,
      requestContext.data.device,
    )
    return new Response(null, { status: 200 })
  }

  const importOrganizationCiphers = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = cipherRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const queryResult = requestQueryParse(context, cipherOrganizationDetailsQuerySchema)
    if (!queryResult.success) return apiErrorResponseCreate(queryResult)
    const organizationUuid = context.get("organizationId")
    if (organizationUuid === undefined || organizationUuid !== queryResult.data.organizationId)
      return apiErrorResponseCreate(organizationErrorCreate("cipherRoutesOrganizationImport", "Organization not found"))
    const bodyResult = await requestBodyParse(context, cipherOrganizationImportDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const importResult = cipherOrganizationImport(
      requestContext.data.database,
      requestContext.data.userUuid,
      queryResult.data.organizationId,
      bodyResult.data,
      options.clock,
      options.identifier,
      options.maxNoteSize,
      options.groupsEnabled,
    )
    if (!importResult.success) return apiErrorResponseCreate(importResult)
    const eventContext = {
      deviceType: requestContext.data.device.type,
      ipAddress: requestContext.data.ipAddress,
    }
    for (const collection of importResult.data.createdCollections)
      options.event?.organizationEventCreate(
        eventType.collectionCreated,
        collection.uuid,
        queryResult.data.organizationId,
        requestContext.data.userUuid,
        eventContext,
      )
    for (const importedCipher of importResult.data.ciphers) {
      await cipherNotificationSend(
        notification,
        cipherUpdateType.create,
        importedCipher.cipher,
        requestContext.data.device,
        importedCipher.collectionIds,
        importedCipher.userUuids,
      )
      cipherEventCreate(options, eventType.cipherCreated, importedCipher.cipher, requestContext.data)
    }
    return new Response(null, { status: 200 })
  }

  const update = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = cipherRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const pathResult = requestPathParse(context, cipherPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const bodyResult = await requestBodyParse(context, cipherDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const cipherResult = cipherUpdate(
      requestContext.data.database,
      pathResult.data.cipher_id,
      requestContext.data.userUuid,
      bodyResult.data,
      options.clock,
      options.groupsEnabled,
    )
    if (!cipherResult.success) return apiErrorResponseCreate(cipherResult)
    await cipherNotificationSend(notification, cipherUpdateType.update, cipherResult.data, requestContext.data.device)
    cipherEventCreate(options, eventType.cipherUpdated, cipherResult.data, requestContext.data)
    return cipherJsonResponse(
      context,
      requestContext.data.database,
      cipherResult.data,
      requestContext.data.userUuid,
      options,
    )
  }

  const partial = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = cipherRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const pathResult = requestPathParse(context, cipherPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const bodyResult = await requestBodyParse(context, cipherPartialDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const cipherResult = cipherFindByUuid(requestContext.data.database, pathResult.data.cipher_id)
    if (!cipherResult.success) return apiErrorResponseCreate(cipherResult)
    if (cipherResult.data === null)
      return apiErrorResponseCreate(cipherErrorCreate("cipherRoutesPartial", "Cipher does not exist"))
    const accessResult = cipherAccessFindByUser(
      requestContext.data.database,
      cipherResult.data,
      requestContext.data.userUuid,
      options.groupsEnabled,
    )
    if (!accessResult.success) return apiErrorResponseCreate(accessResult)
    if (accessResult.data === null)
      return apiErrorResponseCreate(
        cipherErrorCreate(
          "cipherRoutesPartial",
          "Cipher does not exist",
          "Cipher is not accessible for the current user",
        ),
      )
    const result = cipherPartialApply(
      requestContext.data.database,
      requestContext.data.userUuid,
      cipherResult.data,
      bodyResult.data,
      options,
    )
    if (!result.success) return apiErrorResponseCreate(result)
    return cipherJsonResponse(context, requestContext.data.database, result.data, requestContext.data.userUuid, options)
  }

  const softDelete = (context: Context<AuthenticationEnvironment>) =>
    cipherDeleteResponse(context, options, true, notification)
  const hardDelete = (context: Context<AuthenticationEnvironment>) =>
    cipherDeleteResponse(context, options, false, notification)

  const bulkDelete = async (context: Context<AuthenticationEnvironment>, soft: boolean) => {
    const requestContext = cipherRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, cipherIdsDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    for (const cipherId of bodyResult.data.ids) {
      const deleteResult = cipherDelete(
        requestContext.data.database,
        cipherId,
        requestContext.data.userUuid,
        soft,
        options.clock,
        options.groupsEnabled,
      )
      if (!deleteResult.success) return apiErrorResponseCreate(deleteResult)
      cipherEventCreate(
        options,
        soft ? eventType.cipherSoftDeleted : eventType.cipherDeleted,
        deleteResult.data,
        requestContext.data,
      )
      if (!soft && options.attachmentStorage !== undefined)
        await options.attachmentStorage.delete(deleteResult.data.uuid)
    }
    const revision = options.clock.now().toISOString()
    await cipherUserNotificationSend(
      notification,
      cipherUpdateType.sync,
      requestContext.data.userUuid,
      revision,
      requestContext.data.device,
    )
    return new Response(null, { status: 200 })
  }

  const restore = (context: Context<AuthenticationEnvironment>) => cipherRestoreResponse(context, options, notification)

  const bulkRestore = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = cipherRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, cipherIdsDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const data: Record<string, unknown>[] = []
    for (const cipherId of bodyResult.data.ids) {
      const restoreResult = cipherRestore(
        requestContext.data.database,
        cipherId,
        requestContext.data.userUuid,
        options.clock,
        options.groupsEnabled,
      )
      if (!restoreResult.success) return apiErrorResponseCreate(restoreResult)
      cipherEventCreate(options, eventType.cipherRestored, restoreResult.data, requestContext.data)
      const jsonResult = await cipherToJson(
        requestContext.data.database,
        restoreResult.data,
        requestContext.data.userUuid,
        cipherJsonOptions(context, options),
      )
      if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
      data.push(jsonResult.data)
    }
    await cipherUserNotificationSend(
      notification,
      cipherUpdateType.sync,
      requestContext.data.userUuid,
      options.clock.now().toISOString(),
      requestContext.data.device,
    )
    return context.json({ continuationToken: null, data, object: "list" })
  }

  const move = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = cipherRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, cipherMoveDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const body = bodyResult.data
    const folderUuid =
      body.folderId === undefined || body.folderId === null || body.folderId === "" ? null : body.folderId
    if (folderUuid !== null) {
      const folderResult = folderFindByUuidAndUser(
        requestContext.data.database,
        folderUuid,
        requestContext.data.userUuid,
      )
      if (!folderResult.success) return apiErrorResponseCreate(folderResult)
      if (folderResult.data === null)
        return apiErrorResponseCreate(
          cipherErrorCreate("cipherRoutesMove", "Invalid folder", "Folder does not exist or belongs to another user"),
        )
    }
    const moveResult = cipherMoveSelected(
      requestContext.data.database,
      body.ids,
      requestContext.data.userUuid,
      folderUuid,
      options.clock,
      options.groupsEnabled,
    )
    if (!moveResult.success) return apiErrorResponseCreate(moveResult)
    if (body.ids.length === 1 && moveResult.data.movedCipher !== undefined) {
      await cipherNotificationSend(
        notification,
        cipherUpdateType.update,
        moveResult.data.movedCipher,
        requestContext.data.device,
        null,
        [requestContext.data.userUuid],
      )
    } else {
      await cipherUserNotificationSend(
        notification,
        cipherUpdateType.sync,
        requestContext.data.userUuid,
        options.clock.now().toISOString(),
        requestContext.data.device,
      )
    }
    return new Response(null, { status: 200 })
  }

  const archive = (context: Context<AuthenticationEnvironment>) =>
    cipherArchiveResponse(context, options, true, notification)
  const unarchive = (context: Context<AuthenticationEnvironment>) =>
    cipherArchiveResponse(context, options, false, notification)
  const bulkArchive = (context: Context<AuthenticationEnvironment>, archived: boolean) =>
    cipherBulkArchiveResponse(context, options, archived, notification)

  const replaceCollections = (
    context: Context<AuthenticationEnvironment>,
    adminCollections: boolean,
    wrapped: boolean,
  ) => cipherCollectionsReplaceResponse(context, options, notification, adminCollections, wrapped)

  const share = (context: Context<AuthenticationEnvironment>) => cipherShareResponse(context, options, notification)
  const shareSelected = (context: Context<AuthenticationEnvironment>) =>
    cipherShareSelectedResponse(context, options, notification)

  app.get("/api/ciphers", authenticate("get_ciphers"), list)
  app.get(
    "/api/ciphers/organization-details",
    authenticate("get_org_details"),
    organizationManagerLoose,
    organizationDetails,
  )
  app.get("/api/ciphers/:cipher_id", authenticate("get_cipher"), get)
  app.get("/api/ciphers/:cipher_id/admin", authenticate("get_cipher_admin"), get)
  app.get("/api/ciphers/:cipher_id/details", authenticate("get_cipher_details"), get)
  app.post("/api/ciphers", authenticate("post_ciphers"), create)
  app.post("/api/ciphers/create", authenticate("post_ciphers_create"), createWrapped)
  app.post("/api/ciphers/admin", authenticate("post_ciphers_admin"), createWrapped)
  app.post("/api/ciphers/import", authenticate("post_ciphers_import"), importCiphers)
  app.post(
    "/api/ciphers/import-organization",
    authenticate("post_org_import"),
    organizationMember,
    importOrganizationCiphers,
  )
  app.delete("/api/ciphers", authenticate("delete_cipher_selected"), (context) => bulkDelete(context, false))
  app.post("/api/ciphers/delete", authenticate("delete_cipher_selected_post"), (context) => bulkDelete(context, false))
  app.put("/api/ciphers/delete", authenticate("delete_cipher_selected_put"), (context) => bulkDelete(context, true))
  app.delete("/api/ciphers/admin", authenticate("delete_cipher_selected_admin"), (context) =>
    bulkDelete(context, false),
  )
  app.post("/api/ciphers/delete-admin", authenticate("delete_cipher_selected_post_admin"), (context) =>
    bulkDelete(context, false),
  )
  app.put("/api/ciphers/delete-admin", authenticate("delete_cipher_selected_put_admin"), (context) =>
    bulkDelete(context, true),
  )
  app.put("/api/ciphers/restore", authenticate("restore_cipher_selected"), bulkRestore)
  app.put("/api/ciphers/restore-admin", authenticate("restore_cipher_selected_admin"), bulkRestore)
  app.post("/api/ciphers/move", authenticate("move_cipher_selected"), move)
  app.put("/api/ciphers/move", authenticate("move_cipher_selected_put"), move)
  app.put("/api/ciphers/archive", authenticate("archive_cipher_selected"), (context) => bulkArchive(context, true))
  app.put("/api/ciphers/unarchive", authenticate("unarchive_cipher_selected"), (context) => bulkArchive(context, false))
  app.put("/api/ciphers/:cipher_id/collections_v2", authenticate("put_collections2_update"), (context) =>
    replaceCollections(context, false, true),
  )
  app.post("/api/ciphers/:cipher_id/collections_v2", authenticate("post_collections2_update"), (context) =>
    replaceCollections(context, false, true),
  )
  app.put("/api/ciphers/:cipher_id/collections", authenticate("put_collections_update"), (context) =>
    replaceCollections(context, false, false),
  )
  app.post("/api/ciphers/:cipher_id/collections", authenticate("post_collections_update"), (context) =>
    replaceCollections(context, false, false),
  )
  app.put("/api/ciphers/:cipher_id/collections-admin", authenticate("put_collections_admin"), (context) =>
    replaceCollections(context, true, false),
  )
  app.post("/api/ciphers/:cipher_id/collections-admin", authenticate("post_collections_admin"), (context) =>
    replaceCollections(context, true, false),
  )
  app.post("/api/ciphers/:cipher_id/share", authenticate("post_cipher_share"), share)
  app.put("/api/ciphers/:cipher_id/share", authenticate("put_cipher_share"), share)
  app.put("/api/ciphers/share", authenticate("put_cipher_share_selected"), shareSelected)
  app.post("/api/ciphers/:cipher_id", authenticate("post_cipher"), update)
  app.put("/api/ciphers/:cipher_id", authenticate("put_cipher"), update)
  app.post("/api/ciphers/:cipher_id/admin", authenticate("post_cipher_admin"), update)
  app.put("/api/ciphers/:cipher_id/admin", authenticate("put_cipher_admin"), update)
  app.post("/api/ciphers/:cipher_id/partial", authenticate("post_cipher_partial"), partial)
  app.put("/api/ciphers/:cipher_id/partial", authenticate("put_cipher_partial"), partial)
  app.post("/api/ciphers/:cipher_id/delete", authenticate("delete_cipher_post"), hardDelete)
  app.post("/api/ciphers/:cipher_id/delete-admin", authenticate("delete_cipher_post_admin"), hardDelete)
  app.put("/api/ciphers/:cipher_id/delete", authenticate("delete_cipher_put"), softDelete)
  app.put("/api/ciphers/:cipher_id/delete-admin", authenticate("delete_cipher_put_admin"), softDelete)
  app.delete("/api/ciphers/:cipher_id", authenticate("delete_cipher"), hardDelete)
  app.delete("/api/ciphers/:cipher_id/admin", authenticate("delete_cipher_admin"), hardDelete)
  app.put("/api/ciphers/:cipher_id/restore", authenticate("restore_cipher_put"), restore)
  app.put("/api/ciphers/:cipher_id/restore-admin", authenticate("restore_cipher_put_admin"), restore)
  app.put("/api/ciphers/:cipher_id/archive", authenticate("archive_cipher_put"), archive)
  app.put("/api/ciphers/:cipher_id/unarchive", authenticate("unarchive_cipher_put"), unarchive)
}

async function cipherCollectionsReplaceResponse(
  context: Context<AuthenticationEnvironment>,
  options: CipherRouteOptions,
  notification: ReturnType<typeof cipherNotificationAdapterCreate>,
  adminCollections: boolean,
  wrapped: boolean,
): Promise<Response> {
  const requestContext = cipherRequestContextResolve(context, options)
  if (!requestContext.success) return apiErrorResponseCreate(requestContext)
  const pathResult = requestPathParse(context, cipherPathSchema)
  if (!pathResult.success) return apiErrorResponseCreate(pathResult)
  const bodyResult = await requestBodyParse(context, cipherCollectionsDataSchema)
  if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
  const collectionIds = bodyResult.data.collectionIds ?? bodyResult.data.CollectionIds
  if (collectionIds === undefined)
    return apiErrorResponseCreate(cipherErrorCreate("cipherCollectionsReplace", "CollectionIds is required"))
  const result = cipherCollectionsReplace(
    requestContext.data.database,
    pathResult.data.cipher_id,
    requestContext.data.userUuid,
    collectionIds,
    options.clock,
    options.groupsEnabled,
    adminCollections,
  )
  if (!result.success) return apiErrorResponseCreate(result)
  await cipherNotificationSend(
    notification,
    cipherUpdateType.update,
    result.data.cipher,
    requestContext.data.device,
    result.data.collectionIds,
    result.data.userUuids,
  )
  const jsonResult = await cipherJsonData(
    context,
    requestContext.data.database,
    result.data.cipher,
    requestContext.data.userUuid,
    options,
  )
  if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
  return wrapped
    ? context.json({ cipher: jsonResult.data, object: "optionalCipherDetails", unavailable: false })
    : context.json(jsonResult.data)
}

async function cipherShareResponse(
  context: Context<AuthenticationEnvironment>,
  options: CipherRouteOptions,
  notification: ReturnType<typeof cipherNotificationAdapterCreate>,
): Promise<Response> {
  const requestContext = cipherRequestContextResolve(context, options)
  if (!requestContext.success) return apiErrorResponseCreate(requestContext)
  const pathResult = requestPathParse(context, cipherPathSchema)
  if (!pathResult.success) return apiErrorResponseCreate(pathResult)
  const bodyResult = await requestBodyParse(context, cipherShareDataSchema)
  if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
  const data = bodyResult.data.cipher ?? bodyResult.data.Cipher
  const collectionIds = bodyResult.data.collectionIds ?? bodyResult.data.CollectionIds
  if (data === undefined) return apiErrorResponseCreate(cipherErrorCreate("cipherShare", "Cipher is required"))
  if (collectionIds === undefined)
    return apiErrorResponseCreate(cipherErrorCreate("cipherShare", "CollectionIds is required"))
  const result = cipherShare(
    requestContext.data.database,
    pathResult.data.cipher_id,
    requestContext.data.userUuid,
    data,
    collectionIds,
    options.clock,
    options.groupsEnabled,
  )
  if (!result.success) return apiErrorResponseCreate(result)
  const usersResult = cipherUserUuidsFind(requestContext.data.database, result.data, options.groupsEnabled)
  if (!usersResult.success) return apiErrorResponseCreate(usersResult)
  const sharedCollectionIds = result.data.organizationUuid === null ? [] : [...new Set(collectionIds)]
  const updateType =
    data.lastKnownRevisionDate === undefined || data.lastKnownRevisionDate === null
      ? cipherUpdateType.create
      : cipherUpdateType.update
  await cipherNotificationSend(
    notification,
    updateType,
    result.data,
    requestContext.data.device,
    sharedCollectionIds,
    usersResult.data,
  )
  return cipherJsonResponse(context, requestContext.data.database, result.data, requestContext.data.userUuid, options)
}

async function cipherShareSelectedResponse(
  context: Context<AuthenticationEnvironment>,
  options: CipherRouteOptions,
  notification: ReturnType<typeof cipherNotificationAdapterCreate>,
): Promise<Response> {
  const requestContext = cipherRequestContextResolve(context, options)
  if (!requestContext.success) return apiErrorResponseCreate(requestContext)
  const bodyResult = await requestBodyParse(context, cipherShareSelectedDataSchema)
  if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
  const ciphers = bodyResult.data.ciphers
  const collectionIds = bodyResult.data.collectionIds
  if (ciphers === undefined)
    return apiErrorResponseCreate(cipherErrorCreate("cipherShareSelected", "You must select at least one cipher."))
  if (collectionIds === undefined)
    return apiErrorResponseCreate(cipherErrorCreate("cipherShareSelected", "You must select at least one collection."))
  const result = cipherShareSelected(
    requestContext.data.database,
    ciphers,
    [...new Set(collectionIds)],
    requestContext.data.userUuid,
    options.clock,
    options.groupsEnabled,
  )
  if (!result.success) return apiErrorResponseCreate(result)
  await cipherUserNotificationSend(
    notification,
    cipherUpdateType.sync,
    requestContext.data.userUuid,
    options.clock.now().toISOString(),
    requestContext.data.device,
  )
  return new Response(null, { status: 200 })
}

async function cipherCreateResponse(
  context: Context<AuthenticationEnvironment>,
  requestContext: CipherRequestContext,
  data: CipherData,
  options: CipherRouteOptions,
  collectionIds: readonly string[] | undefined = undefined,
): Promise<Response> {
  const cipherResult = cipherCreate(
    requestContext.database,
    requestContext.userUuid,
    data,
    options.clock,
    options.identifier,
    options.groupsEnabled,
    collectionIds,
  )
  if (!cipherResult.success) return apiErrorResponseCreate(cipherResult)
  const notification = options.notification ?? cipherNotificationAdapterCreate()
  const userUuidsResult =
    cipherResult.data.organizationUuid === null
      ? undefined
      : cipherUserUuidsFind(requestContext.database, cipherResult.data, options.groupsEnabled)
  if (userUuidsResult !== undefined && !userUuidsResult.success) return apiErrorResponseCreate(userUuidsResult)
  const notificationCollectionIds =
    collectionIds === undefined ? null : cipherResult.data.organizationUuid === null ? [] : [...new Set(collectionIds)]
  await cipherNotificationSend(
    notification,
    cipherUpdateType.create,
    cipherResult.data,
    requestContext.device,
    notificationCollectionIds,
    userUuidsResult?.data,
  )
  cipherEventCreate(options, eventType.cipherCreated, cipherResult.data, requestContext)
  return cipherJsonResponse(context, requestContext.database, cipherResult.data, requestContext.userUuid, options)
}

async function cipherJsonData(
  context: Context<AuthenticationEnvironment>,
  database: NonNullable<CipherRouteOptions["database"]>,
  cipher: Cipher,
  userUuid: string,
  options: CipherRouteOptions,
): Promise<Awaited<ReturnType<typeof cipherToJson>>> {
  return cipherToJson(database, cipher, userUuid, cipherJsonOptions(context, options))
}

async function cipherJsonResponse(
  context: Context<AuthenticationEnvironment>,
  database: NonNullable<CipherRouteOptions["database"]>,
  cipher: Cipher,
  userUuid: string,
  options: CipherRouteOptions,
): Promise<Response> {
  const jsonResult = await cipherToJson(database, cipher, userUuid, cipherJsonOptions(context, options))
  if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
  return context.json(jsonResult.data)
}

function cipherJsonOptions(
  context: Context<AuthenticationEnvironment>,
  options: CipherRouteOptions,
): {
  adminCollections?: boolean
  clock: CipherRouteOptions["clock"]
  groupsEnabled: boolean
  origin: string
  privateKey: CipherRouteOptions["privateKey"]
} {
  const path = context.req.path
  return {
    adminCollections: path.endsWith("/collections-admin"),
    clock: options.clock,
    groupsEnabled: options.groupsEnabled,
    origin: new URL(options.publicOrigin ?? context.req.url).origin,
    privateKey: options.privateKey,
  }
}

function cipherPartialApply(
  database: NonNullable<CipherRouteOptions["database"]>,
  userUuid: string,
  cipher: Cipher,
  data: CipherPartialData,
  options: CipherRouteOptions,
): { success: true; data: Cipher } | ResultErr {
  const folderUuid =
    data.folderId === undefined || data.folderId === null || data.folderId === "" ? null : data.folderId
  const folderResult = folderUuid === null ? undefined : folderFindByUuidAndUser(database, folderUuid, userUuid)
  if (folderResult !== undefined) {
    if (!folderResult.success) return folderResult
    if (folderResult.data === null)
      return cipherErrorCreate(
        "cipherRoutesPartial",
        "Invalid folder",
        "Folder does not exist or belongs to another user",
      )
  }
  const revisionDate = options.clock.now().toISOString()
  return databaseTransaction(database, () => {
    const folderSetResult = cipherFolderSet(database, cipher.uuid, folderUuid)
    if (!folderSetResult.success) return folderSetResult
    const favoriteResult = cipherFavoriteSet(database, cipher.uuid, userUuid, data.favorite, revisionDate)
    if (!favoriteResult.success) return favoriteResult
    return { success: true as const, data: cipher }
  })
}

async function cipherDeleteResponse(
  context: Context<AuthenticationEnvironment>,
  options: CipherRouteOptions,
  soft: boolean,
  notification: ReturnType<typeof cipherNotificationAdapterCreate>,
): Promise<Response> {
  const requestContext = cipherRequestContextResolve(context, options)
  if (!requestContext.success) return apiErrorResponseCreate(requestContext)
  const pathResult = requestPathParse(context, cipherPathSchema)
  if (!pathResult.success) return apiErrorResponseCreate(pathResult)
  const result = cipherDelete(
    requestContext.data.database,
    pathResult.data.cipher_id,
    requestContext.data.userUuid,
    soft,
    options.clock,
    options.groupsEnabled,
  )
  if (!result.success) return apiErrorResponseCreate(result)
  cipherEventCreate(
    options,
    soft ? eventType.cipherSoftDeleted : eventType.cipherDeleted,
    result.data,
    requestContext.data,
  )
  if (!soft && options.attachmentStorage !== undefined) await options.attachmentStorage.delete(result.data.uuid)
  await cipherNotificationSend(
    notification,
    soft ? cipherUpdateType.update : cipherUpdateType.delete,
    result.data,
    requestContext.data.device,
  )
  return new Response(null, { status: 200 })
}

async function cipherRestoreResponse(
  context: Context<AuthenticationEnvironment>,
  options: CipherRouteOptions,
  notification: ReturnType<typeof cipherNotificationAdapterCreate>,
): Promise<Response> {
  const requestContext = cipherRequestContextResolve(context, options)
  if (!requestContext.success) return apiErrorResponseCreate(requestContext)
  const pathResult = requestPathParse(context, cipherPathSchema)
  if (!pathResult.success) return apiErrorResponseCreate(pathResult)
  const result = cipherRestore(
    requestContext.data.database,
    pathResult.data.cipher_id,
    requestContext.data.userUuid,
    options.clock,
    options.groupsEnabled,
  )
  if (!result.success) return apiErrorResponseCreate(result)
  cipherEventCreate(options, eventType.cipherRestored, result.data, requestContext.data)
  await cipherNotificationSend(notification, cipherUpdateType.update, result.data, requestContext.data.device)
  return cipherJsonResponse(context, requestContext.data.database, result.data, requestContext.data.userUuid, options)
}

async function cipherArchiveResponse(
  context: Context<AuthenticationEnvironment>,
  options: CipherRouteOptions,
  archived: boolean,
  notification: ReturnType<typeof cipherNotificationAdapterCreate>,
): Promise<Response> {
  const requestContext = cipherRequestContextResolve(context, options)
  if (!requestContext.success) return apiErrorResponseCreate(requestContext)
  const pathResult = requestPathParse(context, cipherPathSchema)
  if (!pathResult.success) return apiErrorResponseCreate(pathResult)
  const result = cipherArchive(
    requestContext.data.database,
    pathResult.data.cipher_id,
    requestContext.data.userUuid,
    archived,
    options.clock,
    options.groupsEnabled,
  )
  if (!result.success) return apiErrorResponseCreate(result)
  await cipherNotificationSend(notification, cipherUpdateType.update, result.data, requestContext.data.device)
  return cipherJsonResponse(context, requestContext.data.database, result.data, requestContext.data.userUuid, options)
}

async function cipherBulkArchiveResponse(
  context: Context<AuthenticationEnvironment>,
  options: CipherRouteOptions,
  archived: boolean,
  notification: ReturnType<typeof cipherNotificationAdapterCreate>,
): Promise<Response> {
  const requestContext = cipherRequestContextResolve(context, options)
  if (!requestContext.success) return apiErrorResponseCreate(requestContext)
  const bodyResult = await requestBodyParse(context, cipherIdsDataSchema)
  if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
  const data: Record<string, unknown>[] = []
  for (const cipherId of bodyResult.data.ids) {
    const result = cipherArchive(
      requestContext.data.database,
      cipherId,
      requestContext.data.userUuid,
      archived,
      options.clock,
      options.groupsEnabled,
    )
    if (!result.success) return apiErrorResponseCreate(result)
    const jsonResult = await cipherToJson(
      requestContext.data.database,
      result.data,
      requestContext.data.userUuid,
      cipherJsonOptions(context, options),
    )
    if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
    data.push(jsonResult.data)
  }
  await cipherUserNotificationSend(
    notification,
    cipherUpdateType.sync,
    requestContext.data.userUuid,
    options.clock.now().toISOString(),
    requestContext.data.device,
  )
  return context.json({ continuationToken: null, data, object: "list" })
}

function cipherRequestContextResolve(
  context: Context<AuthenticationEnvironment>,
  options: CipherRouteOptions,
): CipherRequestContextResult {
  const requestContext = authenticationDatabaseRequestContextResolve(context, {
    authenticationErrorCreate: () =>
      apiErrorCreate("cipherAuthentication", "platform.unauthorized", "Authentication is required."),
    databaseErrorCreate: () => apiErrorCreate("cipherDatabase", "platform.internal", "Database unavailable."),
    databaseOverride: options.database,
  })
  if (!requestContext.success) return requestContext
  const { authentication, database } = requestContext.data
  return {
    success: true,
    data: { database, device: authentication.device, ipAddress: authentication.ip, userUuid: authentication.user.uuid },
  }
}

function cipherEventCreate(
  options: CipherRouteOptions,
  event: number,
  cipher: Cipher,
  requestContext: CipherRequestContext,
): void {
  if (cipher.organizationUuid === null) return
  options.event?.cipherEventCreate(event, cipher.uuid, cipher.organizationUuid, requestContext.userUuid, {
    deviceType: requestContext.device.type,
    ipAddress: requestContext.ipAddress,
  })
}

type CipherRequestContext = {
  database: NonNullable<CipherRouteOptions["database"]>
  device: NonNullable<AuthenticationContext>["device"]
  ipAddress: string
  userUuid: string
}

type CipherRequestContextResult = { success: true; data: CipherRequestContext } | ResultErr
