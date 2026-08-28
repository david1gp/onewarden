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
import { folderCreate } from "./folderCreate.js"
import { folderDataSchema } from "./folderDataSchema.js"
import { folderDelete } from "./folderDelete.js"
import { folderErrorCreate } from "./folderErrorCreate.js"
import { folderFindByUser } from "./folderFindByUser.js"
import { folderFindByUuidAndUser } from "./folderFindByUuidAndUser.js"
import { folderNotificationAdapterCreate } from "./folderNotificationAdapterCreate.js"
import { folderNotificationSend } from "./folderNotificationSend.js"
import type { FolderRouteOptions } from "./folderRouteOptions.js"
import { folderToJson } from "./folderToJson.js"
import { folderUpdate } from "./folderUpdate.js"
import { folderUpdateType } from "./folderUpdateType.js"

const folderPathSchema = v.object({ folder_id: v.string() })

export function folderRoutesRegister(app: Hono<AuthenticationEnvironment>, options: FolderRouteOptions): void {
  const notification = options.notification ?? folderNotificationAdapterCreate()
  const authenticate = (routeName: string) =>
    authenticationMiddleware({
      clock: options.clock,
      database: options.database,
      publicKey: options.publicKey,
      publicOrigin: options.publicOrigin,
      routeName,
    })

  const list = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = folderRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const result = folderFindByUser(requestContext.data.database, requestContext.data.userUuid)
    if (!result.success) return apiErrorResponseCreate(result)
    return context.json({ data: result.data.map(folderToJson), object: "list", continuationToken: null })
  }

  const get = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = folderRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const pathResult = requestPathParse(context, folderPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const folderId = pathResult.data.folder_id
    const result = folderFindByUuidAndUser(requestContext.data.database, folderId, requestContext.data.userUuid)
    if (!result.success) return apiErrorResponseCreate(result)
    if (result.data === null) return apiErrorResponseCreate(folderErrorCreate("folderRoutesGet"))
    return context.json(folderToJson(result.data))
  }

  const create = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = folderRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, folderDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const result = folderCreate(
      requestContext.data.database,
      requestContext.data.userUuid,
      bodyResult.data.name,
      options.clock,
      options.identifier,
    )
    if (!result.success) return apiErrorResponseCreate(result)
    await folderNotificationSend(notification, folderUpdateType.create, result.data, requestContext.data.device)
    return context.json(folderToJson(result.data))
  }

  const update = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = folderRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, folderDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const pathResult = requestPathParse(context, folderPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const result = folderUpdate(
      requestContext.data.database,
      pathResult.data.folder_id,
      requestContext.data.userUuid,
      bodyResult.data.name,
      options.clock,
    )
    if (!result.success) return apiErrorResponseCreate(result)
    await folderNotificationSend(notification, folderUpdateType.update, result.data, requestContext.data.device)
    return context.json(folderToJson(result.data))
  }

  const remove = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = folderRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const pathResult = requestPathParse(context, folderPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const result = folderDelete(
      requestContext.data.database,
      pathResult.data.folder_id,
      requestContext.data.userUuid,
      options.clock,
    )
    if (!result.success) return apiErrorResponseCreate(result)
    await folderNotificationSend(notification, folderUpdateType.delete, result.data, requestContext.data.device)
    return new Response(null, { status: 200 })
  }

  app.get("/api/folders", authenticate("get_folders"), list)
  app.get("/api/folders/:folder_id", authenticate("get_folder"), get)
  app.post("/api/folders", authenticate("post_folders"), create)
  app.post("/api/folders/:folder_id", authenticate("post_folder"), update)
  app.put("/api/folders/:folder_id", authenticate("put_folder"), update)
  app.post("/api/folders/:folder_id/delete", authenticate("delete_folder_post"), remove)
  app.delete("/api/folders/:folder_id", authenticate("delete_folder"), remove)
}

function folderRequestContextResolve(
  context: Context<AuthenticationEnvironment>,
  options: FolderRouteOptions,
): FolderRequestContextResult {
  const authentication = authenticationContextGet(context)
  if (authentication === undefined)
    return apiErrorCreate("folderAuthentication", "platform.unauthorized", "Authentication is required.")
  const database = options.database ?? context.get("database")
  if (database === undefined) return apiErrorCreate("folderDatabase", "platform.internal", "Database unavailable.")
  return { success: true, data: { database, device: authentication.device, userUuid: authentication.user.uuid } }
}

type FolderRequestContextResult =
  | {
      success: true
      data: {
        database: NonNullable<FolderRouteOptions["database"]>
        device: NonNullable<AuthenticationContext>["device"]
        userUuid: string
      }
    }
  | ResultErr
