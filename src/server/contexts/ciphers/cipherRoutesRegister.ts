import type { Context, Hono } from "hono"
import * as v from "valibot"
import { type ResultErr } from "#result"
import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import { requestPathParse } from "../../../shared/validation/requestPathParse.js"
import type { AuthenticationContext } from "../authentication/authenticationContext.js"
import { authenticationContextGet } from "../authentication/authenticationContextGet.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationMiddleware } from "../authentication/authenticationMiddleware.js"
import { cipherArchive } from "./cipherArchive.js"
import type { Cipher } from "./cipher.js"
import { cipherCreate } from "./cipherCreate.js"
import { cipherCreateRequestSchema } from "./cipherCreateRequestSchema.js"
import type { CipherData } from "./cipherDataSchema.js"
import { cipherDataSchema } from "./cipherDataSchema.js"
import { cipherDelete } from "./cipherDelete.js"
import { cipherIdsDataSchema } from "./cipherIdsDataSchema.js"
import { cipherErrorCreate } from "./cipherErrorCreate.js"
import { cipherFindByUser } from "./cipherFindByUser.js"
import { cipherFindByUuid } from "./cipherFindByUuid.js"
import { cipherImport } from "./cipherImport.js"
import { cipherImportDataSchema } from "./cipherImportDataSchema.js"
import { cipherMove } from "./cipherMove.js"
import { cipherMoveDataSchema } from "./cipherMoveDataSchema.js"
import { cipherNotificationAdapterCreate } from "./cipherNotificationAdapterCreate.js"
import { cipherNotificationSend } from "./cipherNotificationSend.js"
import { cipherFavoriteSet } from "./cipherFavoriteSet.js"
import { cipherFolderSet } from "./cipherFolderSet.js"
import type { CipherRouteOptions } from "./cipherRouteOptions.js"
import type { CipherPartialData } from "./cipherPartialDataSchema.js"
import { cipherPartialDataSchema } from "./cipherPartialDataSchema.js"
import { cipherRestore } from "./cipherRestore.js"
import { cipherToJson } from "./cipherToJson.js"
import { cipherUpdate } from "./cipherUpdate.js"
import { cipherUpdateType } from "./cipherUpdateType.js"
import { cipherUserNotificationSend } from "./cipherUserNotificationSend.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { folderFindByUuidAndUser } from "../folders/folderFindByUuidAndUser.js"

const cipherPathSchema = v.object({ cipher_id: v.string() })

export function cipherRoutesRegister(app: Hono<AuthenticationEnvironment>, options: CipherRouteOptions): void {
  const notification = options.notification ?? cipherNotificationAdapterCreate()
  const authenticate = (routeName: string) =>
    authenticationMiddleware({
      clock: options.clock,
      database: options.database,
      publicKey: options.publicKey,
      publicOrigin: options.publicOrigin,
      routeName,
    })

  const list = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = cipherRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const ciphersResult = cipherFindByUser(requestContext.data.database, requestContext.data.userUuid)
    if (!ciphersResult.success) return apiErrorResponseCreate(ciphersResult)
    const data: Record<string, unknown>[] = []
    for (const cipher of ciphersResult.data) {
      const jsonResult = cipherToJson(requestContext.data.database, cipher, requestContext.data.userUuid)
      if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
      data.push(jsonResult.data)
    }
    return context.json({ continuationToken: null, data, object: "list" })
  }

  const get = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = cipherRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const pathResult = requestPathParse(context, cipherPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const cipherResult = cipherFindByUuid(requestContext.data.database, pathResult.data.cipher_id)
    if (!cipherResult.success) return apiErrorResponseCreate(cipherResult)
    if (cipherResult.data === null)
      return apiErrorResponseCreate(cipherErrorCreate("cipherRoutesGet", "Cipher doesn't exist"))
    if (cipherResult.data.userUuid !== requestContext.data.userUuid)
      return apiErrorResponseCreate(cipherErrorCreate("cipherRoutesGet", "Cipher is not owned by user"))
    const jsonResult = cipherToJson(requestContext.data.database, cipherResult.data, requestContext.data.userUuid)
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
    const data = "cipher" in body ? body.cipher : body
    return cipherCreateResponse(context, requestContext.data, data, options)
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
    )
    if (!cipherResult.success) return apiErrorResponseCreate(cipherResult)
    await cipherNotificationSend(notification, cipherUpdateType.update, cipherResult.data, requestContext.data.device)
    return cipherJsonResponse(context, requestContext.data.database, cipherResult.data, requestContext.data.userUuid)
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
    if (cipherResult.data.userUuid !== requestContext.data.userUuid)
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
    return cipherJsonResponse(context, requestContext.data.database, result.data, requestContext.data.userUuid)
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
      )
      if (!deleteResult.success) return apiErrorResponseCreate(deleteResult)
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
      )
      if (!restoreResult.success) return apiErrorResponseCreate(restoreResult)
      const jsonResult = cipherToJson(requestContext.data.database, restoreResult.data, requestContext.data.userUuid)
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
    let moved = 0
    let movedCipher: Cipher | undefined
    for (const cipherId of body.ids) {
      const moveResult = cipherMove(
        requestContext.data.database,
        cipherId,
        requestContext.data.userUuid,
        folderUuid,
        options.clock,
      )
      if (!moveResult.success) return apiErrorResponseCreate(moveResult)
      if (moveResult.data) {
        moved += 1
        if (body.ids.length === 1) {
          const cipherResult = cipherFindByUuid(requestContext.data.database, cipherId)
          if (!cipherResult.success) return apiErrorResponseCreate(cipherResult)
          movedCipher = cipherResult.data ?? undefined
        }
      }
    }
    if (body.ids.length === 1 && movedCipher !== undefined) {
      await cipherNotificationSend(notification, cipherUpdateType.update, movedCipher, requestContext.data.device)
    } else {
      await cipherUserNotificationSend(
        notification,
        cipherUpdateType.sync,
        requestContext.data.userUuid,
        options.clock.now().toISOString(),
        requestContext.data.device,
      )
    }
    if (moved !== body.ids.length)
      return apiErrorResponseCreate(
        cipherErrorCreate(
          "cipherRoutesMove",
          `Not all ciphers are moved! ${moved} of the selected ${body.ids.length} were moved.`,
        ),
      )
    return new Response(null, { status: 200 })
  }

  const archive = (context: Context<AuthenticationEnvironment>) =>
    cipherArchiveResponse(context, options, true, notification)
  const unarchive = (context: Context<AuthenticationEnvironment>) =>
    cipherArchiveResponse(context, options, false, notification)
  const bulkArchive = (context: Context<AuthenticationEnvironment>, archived: boolean) =>
    cipherBulkArchiveResponse(context, options, archived, notification)

  app.get("/api/ciphers", authenticate("get_ciphers"), list)
  app.get("/api/ciphers/:cipher_id", authenticate("get_cipher"), get)
  app.get("/api/ciphers/:cipher_id/admin", authenticate("get_cipher_admin"), get)
  app.get("/api/ciphers/:cipher_id/details", authenticate("get_cipher_details"), get)
  app.post("/api/ciphers", authenticate("post_ciphers"), create)
  app.post("/api/ciphers/create", authenticate("post_ciphers_create"), createWrapped)
  app.post("/api/ciphers/admin", authenticate("post_ciphers_admin"), createWrapped)
  app.post("/api/ciphers/import", authenticate("post_ciphers_import"), importCiphers)
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

async function cipherCreateResponse(
  context: Context<AuthenticationEnvironment>,
  requestContext: CipherRequestContext,
  data: CipherData,
  options: CipherRouteOptions,
): Promise<Response> {
  const cipherResult = cipherCreate(
    requestContext.database,
    requestContext.userUuid,
    data,
    options.clock,
    options.identifier,
  )
  if (!cipherResult.success) return apiErrorResponseCreate(cipherResult)
  const notification = options.notification ?? cipherNotificationAdapterCreate()
  await cipherNotificationSend(notification, cipherUpdateType.create, cipherResult.data, requestContext.device)
  return cipherJsonResponse(context, requestContext.database, cipherResult.data, requestContext.userUuid)
}

function cipherJsonResponse(
  context: Context<AuthenticationEnvironment>,
  database: NonNullable<CipherRouteOptions["database"]>,
  cipher: Cipher,
  userUuid: string,
): Response {
  const jsonResult = cipherToJson(database, cipher, userUuid)
  if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
  return context.json(jsonResult.data)
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
  )
  if (!result.success) return apiErrorResponseCreate(result)
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
  )
  if (!result.success) return apiErrorResponseCreate(result)
  await cipherNotificationSend(notification, cipherUpdateType.update, result.data, requestContext.data.device)
  return cipherJsonResponse(context, requestContext.data.database, result.data, requestContext.data.userUuid)
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
  )
  if (!result.success) return apiErrorResponseCreate(result)
  await cipherNotificationSend(notification, cipherUpdateType.update, result.data, requestContext.data.device)
  return cipherJsonResponse(context, requestContext.data.database, result.data, requestContext.data.userUuid)
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
    )
    if (!result.success) return apiErrorResponseCreate(result)
    const jsonResult = cipherToJson(requestContext.data.database, result.data, requestContext.data.userUuid)
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
  const authentication = authenticationContextGet(context)
  if (authentication === undefined)
    return apiErrorCreate("cipherAuthentication", "platform.unauthorized", "Authentication is required.")
  const database = options.database ?? context.get("database")
  if (database === undefined) return apiErrorCreate("cipherDatabase", "platform.internal", "Database unavailable.")
  return { success: true, data: { database, device: authentication.device, userUuid: authentication.user.uuid } }
}

type CipherRequestContext = {
  database: NonNullable<CipherRouteOptions["database"]>
  device: NonNullable<AuthenticationContext>["device"]
  userUuid: string
}

type CipherRequestContextResult = { success: true; data: CipherRequestContext } | ResultErr
