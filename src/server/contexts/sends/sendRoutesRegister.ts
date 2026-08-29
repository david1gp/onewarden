import type { Context, Hono } from "hono"
import * as v from "valibot"
import type { Result } from "#result"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import { requestPathParse } from "../../../shared/validation/requestPathParse.js"
import type { AuthenticationContext } from "../authentication/authenticationContext.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationDatabaseRequestContextResolve } from "../authentication/authenticationDatabaseRequestContextResolve.js"
import { authenticationMiddlewareCreate } from "../authentication/authenticationMiddlewareCreate.js"
import type { IdentityDevice } from "../identity/identityDevice.js"
import { pushRelaySendUpdate } from "../push/pushRelaySendUpdate.js"
import { sendAccessTokenIdResolve } from "./sendAccessTokenIdResolve.js"
import { sendCreate } from "./sendCreate.js"
import type { Send } from "./send.js"
import type { SendData } from "./sendDataSchema.js"
import { sendDataNumberResolve } from "./sendDataNumberResolve.js"
import { sendDataSchema } from "./sendDataSchema.js"
import { sendDelete } from "./sendDelete.js"
import { sendFindByAccessId } from "./sendFindByAccessId.js"
import { sendFileStorageAdapterCreate } from "./sendFileStorageAdapterCreate.js"
import type { SendNotificationAdapter } from "./sendNotificationAdapter.js"
import { sendNotificationAdapterCreate } from "./sendNotificationAdapterCreate.js"
import { sendNotificationSend } from "./sendNotificationSend.js"
import type { SendRouteOptions } from "./sendRouteOptions.js"
import { sendErrorCreate } from "./sendErrorCreate.js"
import { sendFindByUuid } from "./sendFindByUuid.js"
import { sendFindByUuidAndUser } from "./sendFindByUuidAndUser.js"
import { sendFindByUser } from "./sendFindByUser.js"
import { sendIsAccessible } from "./sendIsAccessible.js"
import { sendRegisterAccess } from "./sendRegisterAccess.js"
import { sendSizeByUser } from "./sendSizeByUser.js"
import { sendPasswordVerify } from "./sendPasswordVerify.js"
import { sendSave } from "./sendSave.js"
import { sendToAccessJson } from "./sendToAccessJson.js"
import { sendToJson } from "./sendToJson.js"
import { organizationPolicyIsApplicableToUser } from "../organizations/organizationPolicyIsApplicableToUser.js"
import { organizationPolicyIsHideEmailDisabled } from "../organizations/organizationPolicyIsHideEmailDisabled.js"
import { organizationPolicyType } from "../organizations/organizationPolicyType.js"
import { sendDownloadTokenCreate } from "./sendDownloadTokenCreate.js"
import { sendDownloadTokenVerify } from "./sendDownloadTokenVerify.js"
import { sendUpdate } from "./sendUpdate.js"
import { sendUpdateType } from "./sendUpdateType.js"
import { sendUserRevisionUpdate } from "./sendUserRevisionUpdate.js"

const sendPathSchema = v.object({ send_id: v.string() })
const sendFilePathSchema = v.object({ send_id: v.string(), file_id: v.string() })
const sendAccessFilePathSchema = v.object({ file_id: v.string() })
const sendDownloadQuerySchema = v.object({ t: v.string() })
const sendAccessDataSchema = v.object({ password: v.optional(v.nullable(v.string())) })
const sendMaxFileSizeBytes = 550_502_400
const sendInaccessibleMessage = "Send does not exist or is no longer available"
const anonymousDevice: IdentityDevice = {
  uuid: "00000000-0000-0000-0000-000000000000",
  createdAt: "1970-01-01T00:00:00.000Z",
  updatedAt: "1970-01-01T00:00:00.000Z",
  userUuid: "00000000-0000-0000-0000-000000000000",
  name: "",
  type: 14,
  pushUuid: "00000000-0000-0000-0000-000000000000",
  pushToken: null,
  refreshToken: "",
  twoFactorRemember: null,
}

export function sendRoutesRegister(app: Hono<AuthenticationEnvironment>, options: SendRouteOptions): void {
  const notification = options.notification ?? sendNotificationAdapterCreate()
  const storage = options.storage ?? sendFileStorageAdapterCreate()
  const authenticate = authenticationMiddlewareCreate({
    clock: options.clock,
    database: options.database,
    publicKey: options.publicKey,
    publicOrigin: options.publicOrigin,
  })

  const list = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = sendRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const sendsResult = sendFindByUser(requestContext.data.database, requestContext.data.userUuid)
    if (!sendsResult.success) return apiErrorResponseCreate(sendsResult)
    const data: Record<string, unknown>[] = []
    for (const send of sendsResult.data) {
      const jsonResult = sendToJson(send)
      if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
      data.push(jsonResult.data)
    }
    return context.json({ data, object: "list", continuationToken: null })
  }

  const get = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = sendRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const pathResult = requestPathParse(context, sendPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const sendResult = sendFindByUuidAndUser(
      requestContext.data.database,
      pathResult.data.send_id,
      requestContext.data.userUuid,
    )
    if (!sendResult.success) return apiErrorResponseCreate(sendResult)
    if (sendResult.data === null) return apiErrorResponseCreate(sendErrorCreate("sendRoutesGet", "Send not found."))
    const jsonResult = sendToJson(sendResult.data)
    if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
    return context.json(jsonResult.data)
  }

  const create = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = sendRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const enabledResult = await sendEnabledValidate(
      options,
      "sendRoutesCreate",
      requestContext.data.database,
      requestContext.data.userUuid,
    )
    if (!enabledResult.success) return apiErrorResponseCreate(enabledResult)
    const bodyResult = await requestBodyParse(context, sendDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    if (bodyResult.data.type === 1)
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesCreate", "File sends should use /api/sends/file"))
    const policyResult = await sendDataPolicyValidate(
      bodyResult.data,
      requestContext.data.database,
      requestContext.data.userUuid,
    )
    if (!policyResult.success) return apiErrorResponseCreate(policyResult)
    return sendCreateResponse(context, requestContext.data, bodyResult.data, options, notification)
  }

  const createFile = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = sendRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const enabledResult = await sendEnabledValidate(
      options,
      "sendRoutesCreateFile",
      requestContext.data.database,
      requestContext.data.userUuid,
    )
    if (!enabledResult.success) return apiErrorResponseCreate(enabledResult)
    const multipartResult = await sendMultipartParse(context, true)
    if (!multipartResult.success) return apiErrorResponseCreate(multipartResult)
    const { data, file } = multipartResult.data
    if (data.type !== 1)
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesCreateFile", "Send content is not a file"))
    const policyResult = await sendDataPolicyValidate(data, requestContext.data.database, requestContext.data.userUuid)
    if (!policyResult.success) return apiErrorResponseCreate(policyResult)
    const bytesResult = await sendFileBytesRead(file)
    if (!bytesResult.success) return apiErrorResponseCreate(bytesResult)
    const quotaResult = sendFileQuotaCheck(
      requestContext.data.database,
      requestContext.data.userUuid,
      bytesResult.data.bytes.byteLength,
      options,
    )
    if (!quotaResult.success) return apiErrorResponseCreate(quotaResult)
    const fileId = options.identifier.uuid()
    const createResult = await sendCreate(
      requestContext.data.database,
      requestContext.data.userUuid,
      data,
      options.clock,
      options.identifier,
      {
        id: fileId,
        size: bytesResult.data.bytes.byteLength,
        sizeName: sendFileSizeName(bytesResult.data.bytes.byteLength),
      },
    )
    if (!createResult.success) return apiErrorResponseCreate(createResult)
    const writeResult = await storage.write(createResult.data.uuid, fileId, bytesResult.data.bytes)
    if (!writeResult.success) {
      await sendDelete(
        requestContext.data.database,
        createResult.data.uuid,
        requestContext.data.userUuid,
        options.clock,
        storage,
      )
      return apiErrorResponseCreate(writeResult)
    }
    await sendMutationNotify(
      notification,
      options.push,
      sendUpdateType.create,
      createResult.data,
      requestContext.data.device,
      requestContext.data.database,
    )
    return sendJsonResponse(context, createResult.data)
  }

  const createFileV2 = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = sendRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const enabledResult = await sendEnabledValidate(
      options,
      "sendRoutesCreateFileV2",
      requestContext.data.database,
      requestContext.data.userUuid,
    )
    if (!enabledResult.success) return apiErrorResponseCreate(enabledResult)
    const bodyResult = await requestBodyParse(context, sendDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const data = bodyResult.data
    if (data.type !== 1)
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesCreateFileV2", "Send content is not a file"))
    const policyResult = await sendDataPolicyValidate(data, requestContext.data.database, requestContext.data.userUuid)
    if (!policyResult.success) return apiErrorResponseCreate(policyResult)
    const fileLengthResult = sendDataNumberResolve(data.fileLength)
    if (!fileLengthResult.success) return apiErrorResponseCreate(fileLengthResult)
    if (fileLengthResult.data === null)
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesCreateFileV2", "Invalid send length"))
    const quotaResult = sendFileQuotaCheck(
      requestContext.data.database,
      requestContext.data.userUuid,
      fileLengthResult.data,
      options,
    )
    if (!quotaResult.success) return apiErrorResponseCreate(quotaResult)
    const fileId = options.identifier.uuid()
    const createResult = await sendCreate(
      requestContext.data.database,
      requestContext.data.userUuid,
      data,
      options.clock,
      options.identifier,
      { id: fileId, size: fileLengthResult.data, sizeName: sendFileSizeName(fileLengthResult.data) },
    )
    if (!createResult.success) return apiErrorResponseCreate(createResult)
    const jsonResult = sendToJson(createResult.data)
    if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
    return context.json({
      fileUploadType: 0,
      object: "send-fileUpload",
      url: `/sends/${createResult.data.uuid}/file/${fileId}`,
      sendResponse: jsonResult.data,
    })
  }

  const createFileV2Data = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = sendRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const enabledResult = await sendEnabledValidate(
      options,
      "sendRoutesCreateFileV2Data",
      requestContext.data.database,
      requestContext.data.userUuid,
    )
    if (!enabledResult.success) return apiErrorResponseCreate(enabledResult)
    const pathResult = requestPathParse(context, sendFilePathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const multipartResult = await sendMultipartParse(context, false)
    if (!multipartResult.success) return apiErrorResponseCreate(multipartResult)
    const sendResult = sendFindByUuidAndUser(
      requestContext.data.database,
      pathResult.data.send_id,
      requestContext.data.userUuid,
    )
    if (!sendResult.success) return apiErrorResponseCreate(sendResult)
    if (sendResult.data === null)
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesCreateFileV2Data", "Send not found."))
    const send = sendResult.data
    if (send.type !== 1)
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesCreateFileV2Data", "Send is not a file type send."))
    const fileDataResult = sendFileDataRead(send.data)
    if (!fileDataResult.success) return apiErrorResponseCreate(fileDataResult)
    const bytesResult = await sendFileBytesRead(multipartResult.data.file)
    if (!bytesResult.success) return apiErrorResponseCreate(bytesResult)
    if (bytesResult.data.name !== fileDataResult.data.fileName)
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesCreateFileV2Data", "Send file name does not match."))
    if (pathResult.data.file_id !== fileDataResult.data.id)
      return apiErrorResponseCreate(
        sendErrorCreate("sendRoutesCreateFileV2Data", "Send file does not match send data."),
      )
    if (bytesResult.data.bytes.byteLength !== fileDataResult.data.size)
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesCreateFileV2Data", "Send file size does not match."))
    const writeResult = await storage.write(send.uuid, pathResult.data.file_id, bytesResult.data.bytes)
    if (!writeResult.success) return apiErrorResponseCreate(writeResult)
    await sendMutationNotify(
      notification,
      options.push,
      sendUpdateType.create,
      send,
      requestContext.data.device,
      requestContext.data.database,
    )
    return new Response(null, { status: 200 })
  }

  const update = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = sendRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const enabledResult = await sendEnabledValidate(
      options,
      "sendRoutesUpdate",
      requestContext.data.database,
      requestContext.data.userUuid,
    )
    if (!enabledResult.success) return apiErrorResponseCreate(enabledResult)
    const pathResult = requestPathParse(context, sendPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const bodyResult = await requestBodyParse(context, sendDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const policyResult = await sendDataPolicyValidate(
      bodyResult.data,
      requestContext.data.database,
      requestContext.data.userUuid,
    )
    if (!policyResult.success) return apiErrorResponseCreate(policyResult)
    const updateResult = await sendUpdate(
      requestContext.data.database,
      pathResult.data.send_id,
      requestContext.data.userUuid,
      bodyResult.data,
      options.clock,
    )
    if (!updateResult.success) return apiErrorResponseCreate(updateResult)
    await sendMutationNotify(
      notification,
      options.push,
      sendUpdateType.update,
      updateResult.data,
      requestContext.data.device,
      requestContext.data.database,
    )
    return sendJsonResponse(context, updateResult.data)
  }

  const removePassword = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = sendRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const enabledResult = await sendEnabledValidate(
      options,
      "sendRoutesRemovePassword",
      requestContext.data.database,
      requestContext.data.userUuid,
    )
    if (!enabledResult.success) return apiErrorResponseCreate(enabledResult)
    const pathResult = requestPathParse(context, sendPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const sendResult = sendFindByUuidAndUser(
      requestContext.data.database,
      pathResult.data.send_id,
      requestContext.data.userUuid,
    )
    if (!sendResult.success) return apiErrorResponseCreate(sendResult)
    if (sendResult.data === null)
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesRemovePassword", "Send not found."))
    const next = {
      ...sendResult.data,
      passwordHash: null,
      passwordSalt: null,
      passwordIterations: null,
      revisionDate: options.clock.now().toISOString(),
    }
    const saveResult = await sendUpdatePersist(requestContext.data.database, next, requestContext.data.userUuid)
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    await sendMutationNotify(
      notification,
      options.push,
      sendUpdateType.update,
      next,
      requestContext.data.device,
      requestContext.data.database,
    )
    return sendJsonResponse(context, next)
  }

  const remove = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = sendRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const pathResult = requestPathParse(context, sendPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const deleteResult = await sendDelete(
      requestContext.data.database,
      pathResult.data.send_id,
      requestContext.data.userUuid,
      options.clock,
      storage,
    )
    if (!deleteResult.success) return apiErrorResponseCreate(deleteResult)
    await sendMutationNotify(
      notification,
      options.push,
      sendUpdateType.delete,
      deleteResult.data,
      requestContext.data.device,
      requestContext.data.database,
    )
    return new Response(null, { status: 200 })
  }

  const access = async (context: Context<AuthenticationEnvironment>) => {
    const token = sendBearerTokenResolve(context.req.header("Authorization"))
    if (token === undefined)
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesAccess", "No access token provided", 401))
    const authorizationResult = await sendAccessTokenIdResolve(
      token,
      options.publicKey,
      sendIssuerResolve(context, options),
      options.clock,
    )
    if (!authorizationResult.success) return apiErrorResponseCreate(authorizationResult)
    const database = options.database ?? context.get("database")
    if (database === undefined)
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesAccess", "Database unavailable.", 500))
    const sendResult = sendFindByUuid(database, authorizationResult.data)
    if (!sendResult.success) return apiErrorResponseCreate(sendResult)
    if (sendResult.data === null || !sendIsAccessible(sendResult.data, options.clock))
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesAccess", sendInaccessibleMessage, 404))
    const jsonResult = sendToAccessJson(database, sendResult.data)
    if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
    await sendMutationNotify(
      notification,
      options.push,
      sendUpdateType.update,
      sendResult.data,
      anonymousDevice,
      database,
    )
    return context.json(jsonResult.data)
  }

  const accessLegacy = async (context: Context<AuthenticationEnvironment>) => {
    const database = options.database ?? context.get("database")
    if (database === undefined)
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesAccessLegacy", "Database unavailable.", 500))
    const rateLimitResult = sendRateLimit(context, options)
    if (!rateLimitResult.success) return apiErrorResponseCreate(rateLimitResult)
    const pathResult = requestPathParse(context, v.object({ access_id: v.string() }))
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const bodyResult = await sendAccessBodyParse(context)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const sendResult = sendFindByAccessId(database, pathResult.data.access_id)
    if (!sendResult.success) return apiErrorResponseCreate(sendResult)
    if (sendResult.data === null)
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesAccessLegacy", sendInaccessibleMessage, 404))
    const send = sendResult.data
    if (send.maxAccessCount !== null && send.accessCount >= send.maxAccessCount)
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesAccessLegacy", sendInaccessibleMessage, 404))
    if (!sendIsAccessible(send, options.clock))
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesAccessLegacy", sendInaccessibleMessage, 404))
    const passwordResult = await sendAccessPasswordValidate(send, bodyResult.data.password, "sendRoutesAccessLegacy")
    if (!passwordResult.success) return apiErrorResponseCreate(passwordResult)
    const registerResult = sendRegisterAccess(database, send, options.clock)
    if (!registerResult.success) return apiErrorResponseCreate(registerResult)
    if (!registerResult.data)
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesAccessLegacy", sendInaccessibleMessage, 404))
    const jsonResult = sendToAccessJson(database, send)
    if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
    await sendMutationNotify(notification, options.push, sendUpdateType.update, send, anonymousDevice, database)
    return context.json(jsonResult.data)
  }

  const accessFile = async (context: Context<AuthenticationEnvironment>) => {
    const token = sendBearerTokenResolve(context.req.header("Authorization"))
    if (token === undefined)
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesAccessFile", "No access token provided", 401))
    const pathResult = requestPathParse(context, sendAccessFilePathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const sendIdResult = await sendAccessTokenIdResolve(
      token,
      options.publicKey,
      sendIssuerResolve(context, options),
      options.clock,
    )
    if (!sendIdResult.success) return apiErrorResponseCreate(sendIdResult)
    const database = options.database ?? context.get("database")
    if (database === undefined)
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesAccessFile", "Database unavailable.", 500))
    const sendResult = sendFindByUuid(database, sendIdResult.data)
    if (!sendResult.success) return apiErrorResponseCreate(sendResult)
    if (sendResult.data === null || !sendIsAccessible(sendResult.data, options.clock))
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesAccessFile", sendInaccessibleMessage, 404))
    return sendFileDownloadResponse(context, sendResult.data, pathResult.data.file_id, options, notification, database)
  }

  const accessFileLegacy = async (context: Context<AuthenticationEnvironment>) => {
    const database = options.database ?? context.get("database")
    if (database === undefined)
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesAccessFileLegacy", "Database unavailable.", 500))
    const rateLimitResult = sendRateLimit(context, options)
    if (!rateLimitResult.success) return apiErrorResponseCreate(rateLimitResult)
    const pathResult = requestPathParse(context, sendFilePathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const bodyResult = await sendAccessBodyParse(context)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const sendResult = sendFindByUuid(database, pathResult.data.send_id)
    if (!sendResult.success) return apiErrorResponseCreate(sendResult)
    if (sendResult.data === null)
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesAccessFileLegacy", sendInaccessibleMessage, 404))
    const send = sendResult.data
    if (send.maxAccessCount !== null && send.accessCount >= send.maxAccessCount)
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesAccessFileLegacy", sendInaccessibleMessage, 404))
    if (!sendIsAccessible(send, options.clock))
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesAccessFileLegacy", sendInaccessibleMessage, 404))
    const passwordResult = await sendAccessPasswordValidate(
      send,
      bodyResult.data.password,
      "sendRoutesAccessFileLegacy",
    )
    if (!passwordResult.success) return apiErrorResponseCreate(passwordResult)
    const registerResult = sendRegisterAccess(database, send, options.clock)
    if (!registerResult.success) return apiErrorResponseCreate(registerResult)
    if (!registerResult.data)
      return apiErrorResponseCreate(sendErrorCreate("sendRoutesAccessFileLegacy", sendInaccessibleMessage, 404))
    return sendFileDownloadResponse(context, send, pathResult.data.file_id, options, notification, database)
  }

  const download = async (context: Context<AuthenticationEnvironment>) => {
    const pathResult = requestPathParse(context, sendFilePathSchema)
    if (!pathResult.success) return new Response(null, { status: 404 })
    const queryResult = requestQueryRead(context)
    if (!queryResult.success) return new Response(null, { status: 404 })
    const verifiedResult = await sendDownloadTokenVerify(
      queryResult.data.t,
      pathResult.data.send_id,
      pathResult.data.file_id,
      options.publicKey,
      sendIssuerResolve(context, options),
      options.clock,
    )
    if (!verifiedResult.success || !verifiedResult.data) return new Response(null, { status: 404 })
    const fileResult = await storage.read(pathResult.data.send_id, pathResult.data.file_id)
    if (!fileResult.success || fileResult.data === null) return new Response(null, { status: 404 })
    return new Response(fileResult.data as unknown as BodyInit, {
      headers: { "content-type": "application/octet-stream" },
      status: 200,
    })
  }

  app.get("/api/sends", authenticate("get_sends"), list)
  app.get("/api/sends/:send_id", authenticate("get_send"), get)
  app.post("/api/sends", authenticate("post_send"), create)
  app.post("/api/sends/file", authenticate("post_send_file"), createFile)
  app.post("/api/sends/file/v2", authenticate("post_send_file_v2"), createFileV2)
  app.post("/api/sends/access/file/:file_id", accessFile)
  app.post("/api/sends/access", access)
  app.post("/api/sends/:send_id/file/:file_id", authenticate("post_send_file_v2_data"), createFileV2Data)
  app.post("/api/sends/:send_id/access/file/:file_id", accessFileLegacy)
  app.post("/api/sends/access/:access_id", accessLegacy)
  app.get("/api/sends/:send_id/:file_id", download)
  app.put("/api/sends/:send_id", authenticate("put_send"), update)
  app.delete("/api/sends/:send_id", authenticate("delete_send"), remove)
  app.put("/api/sends/:send_id/remove-password", authenticate("put_remove_password"), removePassword)
}

async function sendCreateResponse(
  context: Context<AuthenticationEnvironment>,
  requestContext: SendRequestContext,
  data: SendData,
  options: SendRouteOptions,
  notification: SendNotificationAdapter,
): Promise<Response> {
  const createResult = await sendCreate(
    requestContext.database,
    requestContext.userUuid,
    data,
    options.clock,
    options.identifier,
  )
  if (!createResult.success) return apiErrorResponseCreate(createResult)
  await sendMutationNotify(
    notification,
    options.push,
    sendUpdateType.create,
    createResult.data,
    requestContext.device,
    requestContext.database,
  )
  return sendJsonResponse(context, createResult.data)
}

function sendJsonResponse(context: Context<AuthenticationEnvironment>, send: Send): Response {
  const jsonResult = sendToJson(send)
  if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
  return context.json(jsonResult.data)
}

async function sendMutationNotify(
  notification: SendNotificationAdapter,
  push: SendRouteOptions["push"],
  type: number,
  send: Send,
  device: IdentityDevice,
  database: SendRequestContext["database"],
): Promise<void> {
  await sendNotificationSend(notification, type, send, device)
  if (push !== undefined) await pushRelaySendUpdate(push, type as 12 | 13 | 14, send, device, database)
}

function sendRequestContextResolve(
  context: Context<AuthenticationEnvironment>,
  options: SendRouteOptions,
): Result<SendRequestContext> {
  const requestContext = authenticationDatabaseRequestContextResolve(context, {
    authenticationErrorCreate: () => sendErrorCreate("sendAuthentication", "Authentication is required.", 401),
    databaseErrorCreate: () => sendErrorCreate("sendDatabase", "Database unavailable.", 500),
    databaseOverride: options.database,
  })
  if (!requestContext.success) return requestContext
  const { authentication, database } = requestContext.data
  return resultCreate({ database, device: authentication.device, userUuid: authentication.user.uuid })
}

type SendRequestContext = {
  database: NonNullable<SendRouteOptions["database"]>
  device: AuthenticationContext["device"]
  userUuid: string
}

async function sendDataPolicyValidate(
  data: SendData,
  database: SendRequestContext["database"],
  userUuid: string,
): Promise<Result<void>> {
  if (data.emails !== undefined && data.emails !== null)
    return sendErrorCreate("sendPolicy", "Sends with email verification is not supported")
  if (data.hideEmail !== true) return resultCreate(undefined)
  const result = organizationPolicyIsHideEmailDisabled(database, userUuid)
  if (!result.success) return result
  if (result.data)
    return sendErrorCreate(
      "sendPolicy",
      "Due to an Enterprise Policy, you are not allowed to hide your email address from recipients when creating or editing a Send.",
    )
  return resultCreate(undefined)
}

async function sendEnabledValidate(
  options: SendRouteOptions,
  op: string,
  database: SendRequestContext["database"],
  userUuid: string,
): Promise<Result<void>> {
  if (options.sendsAllowed === false)
    return sendErrorCreate(op, "Due to an Enterprise Policy, you are only able to delete an existing Send.")
  const result = organizationPolicyIsApplicableToUser(database, userUuid, organizationPolicyType.disableSend)
  if (!result.success) return result
  if (result.data)
    return sendErrorCreate(op, "Due to an Enterprise Policy, you are only able to delete an existing Send.")
  return resultCreate(undefined)
}

function sendFileQuotaCheck(
  database: SendRequestContext["database"],
  userUuid: string,
  size: number,
  options: SendRouteOptions,
): Result<void> {
  const maxFileSize = options.maxFileSizeBytes ?? sendMaxFileSizeBytes
  if (!Number.isSafeInteger(size) || size < 0) return sendErrorCreate("sendFileQuota", "Invalid send size")
  if (size > maxFileSize) return sendErrorCreate("sendFileQuota", "Send file size exceeds the maximum allowed size")
  if (options.quotaBytes === undefined || options.quotaBytes === null) return resultCreate(undefined)
  const usedResult = sendSizeByUser(database, userUuid)
  if (!usedResult.success) return usedResult
  const available = options.quotaBytes - usedResult.data
  if (available <= 0)
    return sendErrorCreate("sendFileQuota", "Send storage limit reached! Delete some sends to free up space")
  if (size > available) return sendErrorCreate("sendFileQuota", "Send storage limit exceeded with this file")
  return resultCreate(undefined)
}

async function sendFileDownloadResponse(
  context: Context<AuthenticationEnvironment>,
  send: Send,
  fileId: string,
  options: SendRouteOptions,
  notification: SendNotificationAdapter,
  database: SendRequestContext["database"],
): Promise<Response> {
  const tokenResult = await sendDownloadTokenCreate(
    send.uuid,
    fileId,
    options.privateKey,
    sendIssuerResolve(context, options),
    options.clock,
  )
  if (!tokenResult.success) return apiErrorResponseCreate(tokenResult)
  await sendMutationNotify(notification, options.push, sendUpdateType.update, send, anonymousDevice, database)
  return context.json({
    object: "send-fileDownload",
    id: fileId,
    url: `${sendHostResolve(context, options)}/api/sends/${send.uuid}/${fileId}?t=${tokenResult.data}`,
  })
}

async function sendAccessBodyParse(
  context: Context<AuthenticationEnvironment>,
): Promise<Result<{ password?: string | null }>> {
  let body: unknown = {}
  try {
    body = await context.req.json()
  } catch {
    body = {}
  }
  const parsed = v.safeParse(sendAccessDataSchema, body)
  if (!parsed.success) return sendErrorCreate("sendAccessBodyParse", "Invalid request.")
  return resultCreate(parsed.output)
}

async function sendAccessPasswordValidate(
  send: Send,
  password: string | null | undefined,
  op: string,
): Promise<Result<void>> {
  if (send.passwordHash === null) return resultCreate(undefined)
  if (password === undefined || password === null) return sendErrorCreate(op, "Password not provided", 401)
  const result = await sendPasswordVerify(send, password)
  if (!result.success || !result.data) return sendErrorCreate(op, "Invalid password")
  return resultCreate(undefined)
}

async function sendFileBytesRead(file: unknown): Promise<Result<{ bytes: Uint8Array; name: string }>> {
  if (typeof file !== "object" || file === null || !("arrayBuffer" in file))
    return sendErrorCreate("sendFileBytesRead", "Send file is not provided.")
  const candidate = file as { arrayBuffer?: () => Promise<ArrayBuffer>; name?: unknown }
  if (typeof candidate.arrayBuffer !== "function" || typeof candidate.name !== "string")
    return sendErrorCreate("sendFileBytesRead", "Send file is not provided.")
  try {
    return resultCreate({ bytes: new Uint8Array(await candidate.arrayBuffer()), name: candidate.name })
  } catch {
    return sendErrorCreate("sendFileBytesRead", "Send file could not be read.", 500)
  }
}

async function sendMultipartParse(
  context: Context<AuthenticationEnvironment>,
  modelRequired: boolean,
): Promise<Result<{ data: SendData; file: unknown }>> {
  let body: FormData
  try {
    body = await context.req.raw.formData()
  } catch {
    return sendErrorCreate("sendMultipartParse", "Invalid multipart request.")
  }
  const file = body.get("data")
  if (file === null) return sendErrorCreate("sendMultipartParse", "Multipart data is not provided.")
  if (!modelRequired) return resultCreate({ data: {} as SendData, file })
  const model = body.get("model")
  if (typeof model !== "string") return sendErrorCreate("sendMultipartParse", "Send model is not provided.")
  let parsedModel: unknown
  try {
    parsedModel = JSON.parse(model)
  } catch {
    return sendErrorCreate("sendMultipartParse", "Send model is not valid JSON.")
  }
  const parsed = v.safeParse(sendDataSchema, parsedModel)
  if (!parsed.success) return sendErrorCreate("sendMultipartParse", "Send model is invalid.")
  return resultCreate({ data: parsed.output, file })
}

function sendFileDataRead(value: string): Result<{ fileName: string; id: string; size: number }> {
  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error()
    const data = parsed as Record<string, unknown>
    const size =
      typeof data.size === "number" ? data.size : typeof data.size === "string" ? Number(data.size) : Number.NaN
    if (typeof data.id !== "string" || typeof data.fileName !== "string" || !Number.isSafeInteger(size) || size < 0)
      throw new Error()
    return resultCreate({ fileName: data.fileName, id: data.id, size })
  } catch {
    return sendErrorCreate("sendFileDataRead", "Unable to decode send data as json.")
  }
}

async function sendUpdatePersist(
  database: SendRequestContext["database"],
  send: Send,
  userUuid: string,
): Promise<Result<void>> {
  const revisionResult = sendUserRevisionUpdate(database, userUuid, send.revisionDate)
  if (!revisionResult.success) return revisionResult
  return sendSave(database, send)
}

function sendRateLimit(context: Context<AuthenticationEnvironment>, options: SendRouteOptions): Result<void> {
  if (options.rateLimiter === undefined) return resultCreate(undefined)
  const ip =
    context.req.header("x-real-ip") ?? context.req.header("x-forwarded-for")?.split(",", 1)[0]?.trim() ?? "0.0.0.0"
  const result = options.rateLimiter.check(ip)
  if (!result.success) return sendErrorCreate("sendRateLimit", "Too many requests", 429)
  return resultCreate(undefined)
}

function sendBearerTokenResolve(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const marker = "Bearer "
  const index = value.lastIndexOf(marker)
  return index === -1 ? value : value.slice(index + marker.length)
}

function sendIssuerResolve(context: Context<AuthenticationEnvironment>, options: SendRouteOptions): string {
  return new URL(options.publicOrigin ?? context.req.url).origin
}

function sendHostResolve(context: Context<AuthenticationEnvironment>, options: SendRouteOptions): string {
  if (options.publicOrigin !== undefined) return new URL(options.publicOrigin).origin
  const protocol = context.req.header("x-forwarded-proto") ?? new URL(context.req.url).protocol.replace(":", "")
  const host = context.req.header("x-forwarded-host") ?? context.req.header("host") ?? new URL(context.req.url).host
  return `${protocol}://${host}`
}

function requestQueryRead(context: Context<AuthenticationEnvironment>): Result<{ t: string }> {
  const parsed = v.safeParse(sendDownloadQuerySchema, context.req.query())
  if (!parsed.success) return sendErrorCreate("sendRoutesDownload", "Invalid download token.", 404)
  return resultCreate(parsed.output)
}

function sendFileSizeName(size: number): string {
  const units = ["bytes", "KB", "MB", "GB", "TB", "PB"]
  let value = size
  let unit = 0
  while (value > 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(2)} ${units[unit]}`
}
