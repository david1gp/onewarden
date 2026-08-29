import type { Context, Hono } from "hono"
import * as v from "valibot"
import { type Result, type ResultErr } from "#result"
import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import { requestPathParse } from "../../../shared/validation/requestPathParse.js"
import { requestQueryParse } from "../../../shared/validation/requestQueryParse.js"
import type { AuthenticationContext } from "../authentication/authenticationContext.js"
import { authenticationDatabaseRequestContextResolve } from "../authentication/authenticationDatabaseRequestContextResolve.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationMiddlewareCreate } from "../authentication/authenticationMiddlewareCreate.js"
import type { Attachment } from "./attachment.js"
import type { Cipher } from "../ciphers/cipher.js"
import { cipherAccessFindByUser } from "../ciphers/cipherAccessFindByUser.js"
import { cipherFindByUuid } from "../ciphers/cipherFindByUuid.js"
import { cipherNotificationAdapterCreate } from "../ciphers/cipherNotificationAdapterCreate.js"
import { cipherNotificationSend } from "../ciphers/cipherNotificationSend.js"
import { cipherToJson } from "../ciphers/cipherToJson.js"
import { cipherUpdateType } from "../ciphers/cipherUpdateType.js"
import { cipherUserRevisionUpdate } from "../ciphers/cipherUserRevisionUpdate.js"
import { cipherUserUuidsFind } from "../ciphers/cipherUserUuidsFind.js"
import { pushRelayCipherUpdate } from "../push/pushRelayCipherUpdate.js"
import { attachmentDelete } from "./attachmentDelete.js"
import { attachmentDownloadTokenVerify } from "./attachmentDownloadTokenVerify.js"
import { attachmentFindById } from "./attachmentFindById.js"
import { attachmentFileStorageAdapterCreate } from "./attachmentFileStorageAdapterCreate.js"
import type { AttachmentRouteOptions } from "./attachmentRouteOptions.js"
import { attachmentSave } from "./attachmentSave.js"
import { attachmentSizeByOrganization } from "./attachmentSizeByOrganization.js"
import { attachmentSizeByUser } from "./attachmentSizeByUser.js"
import { attachmentToJson } from "./attachmentToJson.js"
import { eventType } from "../events/eventType.js"

const attachmentCipherPathSchema = v.object({ cipher_id: v.string() })
const attachmentPathSchema = v.object({ cipher_id: v.string(), attachment_id: v.string() })
const attachmentDownloadPathSchema = v.object({ cipher_id: v.string(), file_id: v.string() })
const attachmentDownloadQuerySchema = v.object({ token: v.string() })
const attachmentRequestSchema = v.object({
  adminRequest: v.optional(v.boolean()),
  fileName: v.string(),
  fileSize: v.union([v.number(), v.string()]),
  key: v.string(),
})
const attachmentMaxFileSizeBytes = 550_502_400
const attachmentSizeLeeway = 1024 * 1024

export function attachmentRoutesRegister(app: Hono<AuthenticationEnvironment>, options: AttachmentRouteOptions): void {
  const notification = options.notification ?? cipherNotificationAdapterCreate()
  const storage = options.storage ?? attachmentFileStorageAdapterCreate()
  const authenticate = authenticationMiddlewareCreate({
    clock: options.clock,
    database: options.database,
    publicKey: options.publicKey,
    publicOrigin: options.publicOrigin,
  })

  const get = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = attachmentRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const pathResult = requestPathParse(context, attachmentPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const cipherResult = await attachmentCipherResolve(
      requestContext.data.database,
      pathResult.data.cipher_id,
      requestContext.data.userUuid,
      false,
      "attachmentRoutesGet",
      options.groupsEnabled,
    )
    if (!cipherResult.success) return apiErrorResponseCreate(cipherResult)
    const attachmentResult = attachmentFindById(requestContext.data.database, pathResult.data.attachment_id)
    if (!attachmentResult.success) return apiErrorResponseCreate(attachmentResult)
    if (attachmentResult.data === null)
      return apiErrorResponseCreate(attachmentErrorCreate("attachmentRoutesGet", "Attachment doesn't exist"))
    if (attachmentResult.data.cipherUuid !== cipherResult.data.uuid)
      return apiErrorResponseCreate(attachmentErrorCreate("attachmentRoutesGet", "Attachment doesn't belong to cipher"))
    const jsonResult = await attachmentToJson(attachmentResult.data, attachmentJsonOptions(context, options))
    if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
    return context.json(jsonResult.data)
  }

  const createV2 = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = attachmentRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const pathResult = requestPathParse(context, attachmentCipherPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const bodyResult = await requestBodyParse(context, attachmentRequestSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const cipherResult = await attachmentCipherResolve(
      requestContext.data.database,
      pathResult.data.cipher_id,
      requestContext.data.userUuid,
      true,
      "attachmentRoutesCreateV2",
      options.groupsEnabled,
    )
    if (!cipherResult.success) return apiErrorResponseCreate(cipherResult)
    const fileSizeResult = attachmentNumberResolve(bodyResult.data.fileSize)
    if (!fileSizeResult.success) return apiErrorResponseCreate(fileSizeResult)
    if (fileSizeResult.data < 0)
      return apiErrorResponseCreate(
        attachmentErrorCreate("attachmentRoutesCreateV2", "Attachment size can't be negative"),
      )
    const attachment: Attachment = {
      cipherUuid: cipherResult.data.uuid,
      fileName: bodyResult.data.fileName,
      fileSize: fileSizeResult.data,
      id: options.identifier.uuid(),
      key: bodyResult.data.key,
    }
    const saveResult = attachmentSave(requestContext.data.database, attachment)
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    const cipherJsonResult = await cipherJsonResponse(context, cipherResult.data, requestContext.data.userUuid, options)
    if (!cipherJsonResult.success) return apiErrorResponseCreate(cipherJsonResult)
    const responseKey = bodyResult.data.adminRequest === true ? "cipherMiniResponse" : "cipherResponse"
    return context.json({
      attachmentId: attachment.id,
      fileUploadType: 0,
      object: "attachment-fileUpload",
      url: `/ciphers/${attachment.cipherUuid}/attachment/${attachment.id}`,
      [responseKey]: cipherJsonResult.data,
    })
  }

  const uploadV2 = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = attachmentRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const pathResult = requestPathParse(context, attachmentPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const attachmentResult = attachmentFindById(requestContext.data.database, pathResult.data.attachment_id)
    if (!attachmentResult.success) return apiErrorResponseCreate(attachmentResult)
    if (attachmentResult.data === null)
      return apiErrorResponseCreate(attachmentErrorCreate("attachmentRoutesUploadV2", "Attachment doesn't exist"))
    if (attachmentResult.data.cipherUuid !== pathResult.data.cipher_id)
      return apiErrorResponseCreate(
        attachmentErrorCreate("attachmentRoutesUploadV2", "Attachment doesn't belong to cipher"),
      )
    const cipherResult = await attachmentCipherResolve(
      requestContext.data.database,
      pathResult.data.cipher_id,
      requestContext.data.userUuid,
      true,
      "attachmentRoutesUploadV2",
      options.groupsEnabled,
    )
    if (!cipherResult.success) return apiErrorResponseCreate(cipherResult)
    const multipartResult = await attachmentMultipartParse(context)
    if (!multipartResult.success) return apiErrorResponseCreate(multipartResult)
    const bytesResult = await attachmentFileRead(multipartResult.data.file)
    if (!bytesResult.success) return apiErrorResponseCreate(bytesResult)
    const size = bytesResult.data.bytes.byteLength
    const maxSizeResult = attachmentMaxSizeValidate(size, options, "attachmentRoutesUploadV2")
    if (!maxSizeResult.success) return apiErrorResponseCreate(maxSizeResult)
    const quotaResult = attachmentQuotaCheck(
      requestContext.data.database,
      cipherResult.data,
      size,
      attachmentResult.data.fileSize,
      options,
    )
    if (!quotaResult.success) return apiErrorResponseCreate(quotaResult)
    const minSize = attachmentResult.data.fileSize - attachmentSizeLeeway
    const maxSize = attachmentResult.data.fileSize + attachmentSizeLeeway
    if (size < minSize || size > maxSize) {
      await attachmentDelete(requestContext.data.database, attachmentResult.data.id, storage)
      return apiErrorResponseCreate(
        attachmentErrorCreate(
          "attachmentRoutesUploadV2",
          `Attachment size mismatch (expected within [${minSize}, ${maxSize}], got ${size})`,
        ),
      )
    }
    const original = attachmentResult.data
    const updated = size === original.fileSize ? original : { ...original, fileSize: size }
    if (updated !== original) {
      const saveResult = attachmentSave(requestContext.data.database, updated)
      if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    }
    const writeResult = await storage.write(updated.cipherUuid, updated.id, bytesResult.data.bytes)
    if (!writeResult.success) {
      if (updated !== original) attachmentSave(requestContext.data.database, original)
      return apiErrorResponseCreate(writeResult)
    }
    const mutationResult = await attachmentMutationNotify(
      requestContext.data.database,
      cipherResult.data,
      requestContext.data.userUuid,
      requestContext.data.device,
      options,
      notification,
    )
    if (!mutationResult.success) return apiErrorResponseCreate(mutationResult)
    attachmentEventCreate(options, eventType.cipherAttachmentCreated, cipherResult.data, requestContext.data)
    return new Response(null, { status: 200 })
  }

  const uploadLegacy = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = attachmentRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const pathResult = requestPathParse(context, attachmentCipherPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const cipherResult = await attachmentCipherResolve(
      requestContext.data.database,
      pathResult.data.cipher_id,
      requestContext.data.userUuid,
      true,
      "attachmentRoutesUploadLegacy",
      options.groupsEnabled,
    )
    if (!cipherResult.success) return apiErrorResponseCreate(cipherResult)
    const multipartResult = await attachmentMultipartParse(context)
    if (!multipartResult.success) return apiErrorResponseCreate(multipartResult)
    const uploadResult = await attachmentLegacyUpload(
      requestContext.data.database,
      cipherResult.data,
      requestContext.data.userUuid,
      multipartResult.data,
      options,
      storage,
      notification,
      requestContext.data.device,
    )
    if (!uploadResult.success) return apiErrorResponseCreate(uploadResult)
    attachmentEventCreate(options, eventType.cipherAttachmentCreated, cipherResult.data, requestContext.data)
    const cipherJsonResult = await cipherJsonResponse(context, cipherResult.data, requestContext.data.userUuid, options)
    if (!cipherJsonResult.success) return apiErrorResponseCreate(cipherJsonResult)
    return context.json(cipherJsonResult.data)
  }

  const replace = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = attachmentRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const pathResult = requestPathParse(context, attachmentPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const attachmentResult = attachmentFindById(requestContext.data.database, pathResult.data.attachment_id)
    if (!attachmentResult.success) return apiErrorResponseCreate(attachmentResult)
    if (attachmentResult.data === null)
      return apiErrorResponseCreate(attachmentErrorCreate("attachmentRoutesReplace", "Attachment doesn't exist"))
    if (attachmentResult.data.cipherUuid !== pathResult.data.cipher_id)
      return apiErrorResponseCreate(
        attachmentErrorCreate("attachmentRoutesReplace", "Attachment doesn't belong to cipher"),
      )
    const cipherResult = await attachmentCipherResolve(
      requestContext.data.database,
      pathResult.data.cipher_id,
      requestContext.data.userUuid,
      true,
      "attachmentRoutesReplace",
      options.groupsEnabled,
    )
    if (!cipherResult.success) return apiErrorResponseCreate(cipherResult)
    const multipartResult = await attachmentMultipartParse(context)
    if (!multipartResult.success) return apiErrorResponseCreate(multipartResult)
    const deleteResult = await attachmentDelete(requestContext.data.database, attachmentResult.data.id, storage)
    if (!deleteResult.success) return apiErrorResponseCreate(deleteResult)
    const deleteNotificationResult = await attachmentMutationNotify(
      requestContext.data.database,
      cipherResult.data,
      requestContext.data.userUuid,
      requestContext.data.device,
      options,
      notification,
    )
    if (!deleteNotificationResult.success) return apiErrorResponseCreate(deleteNotificationResult)
    const uploadResult = await attachmentLegacyUpload(
      requestContext.data.database,
      cipherResult.data,
      requestContext.data.userUuid,
      multipartResult.data,
      options,
      storage,
      notification,
      requestContext.data.device,
    )
    if (!uploadResult.success) return apiErrorResponseCreate(uploadResult)
    attachmentEventCreate(options, eventType.cipherAttachmentCreated, cipherResult.data, requestContext.data)
    const cipherJsonResult = await cipherJsonResponse(context, cipherResult.data, requestContext.data.userUuid, options)
    if (!cipherJsonResult.success) return apiErrorResponseCreate(cipherJsonResult)
    return context.json(cipherJsonResult.data)
  }

  const remove = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = attachmentRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const pathResult = requestPathParse(context, attachmentPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const cipherResult = await attachmentCipherResolve(
      requestContext.data.database,
      pathResult.data.cipher_id,
      requestContext.data.userUuid,
      true,
      "attachmentRoutesRemove",
      options.groupsEnabled,
    )
    if (!cipherResult.success) return apiErrorResponseCreate(cipherResult)
    const attachmentResult = attachmentFindById(requestContext.data.database, pathResult.data.attachment_id)
    if (!attachmentResult.success) return apiErrorResponseCreate(attachmentResult)
    if (attachmentResult.data === null)
      return apiErrorResponseCreate(attachmentErrorCreate("attachmentRoutesRemove", "Attachment doesn't exist"))
    if (attachmentResult.data.cipherUuid !== cipherResult.data.uuid)
      return apiErrorResponseCreate(attachmentErrorCreate("attachmentRoutesRemove", "Attachment from other cipher"))
    const deleteResult = await attachmentDelete(requestContext.data.database, attachmentResult.data.id, storage)
    if (!deleteResult.success) return apiErrorResponseCreate(deleteResult)
    const mutationResult = await attachmentMutationNotify(
      requestContext.data.database,
      cipherResult.data,
      requestContext.data.userUuid,
      requestContext.data.device,
      options,
      notification,
    )
    if (!mutationResult.success) return apiErrorResponseCreate(mutationResult)
    attachmentEventCreate(options, eventType.cipherAttachmentDeleted, cipherResult.data, requestContext.data)
    const cipherJsonResult = await cipherJsonResponse(context, cipherResult.data, requestContext.data.userUuid, options)
    if (!cipherJsonResult.success) return apiErrorResponseCreate(cipherJsonResult)
    return context.json({ cipher: cipherJsonResult.data })
  }

  const download = async (context: Context<AuthenticationEnvironment>) => {
    const pathResult = requestPathParse(context, attachmentDownloadPathSchema)
    if (!pathResult.success) return new Response(null, { status: 404 })
    const queryResult = requestQueryParse(context, attachmentDownloadQuerySchema)
    if (!queryResult.success) return new Response(null, { status: 404 })
    const verifiedResult = await attachmentDownloadTokenVerify(
      queryResult.data.token,
      pathResult.data.cipher_id,
      pathResult.data.file_id,
      options.publicKey,
      attachmentOriginResolve(context, options),
      options.clock,
    )
    if (!verifiedResult.success || !verifiedResult.data) return new Response(null, { status: 404 })
    const fileResult = await storage.read(pathResult.data.cipher_id, pathResult.data.file_id)
    if (!fileResult.success || fileResult.data === null) return new Response(null, { status: 404 })
    return new Response(fileResult.data as unknown as BodyInit, {
      headers: { "content-type": "application/octet-stream" },
      status: 200,
    })
  }

  app.get("/api/ciphers/:cipher_id/attachment/:attachment_id", authenticate("get_attachment"), get)
  app.post("/api/ciphers/:cipher_id/attachment/v2", authenticate("post_attachment_v2"), createV2)
  app.post("/api/ciphers/:cipher_id/attachment/:attachment_id", authenticate("post_attachment_v2_data"), uploadV2)
  app.post("/api/ciphers/:cipher_id/attachment", authenticate("post_attachment"), uploadLegacy)
  app.post("/api/ciphers/:cipher_id/attachment-admin", authenticate("post_attachment_admin"), uploadLegacy)
  app.post("/api/ciphers/:cipher_id/attachment/:attachment_id/share", authenticate("post_attachment_share"), replace)
  app.post(
    "/api/ciphers/:cipher_id/attachment/:attachment_id/delete-admin",
    authenticate("delete_attachment_post_admin"),
    remove,
  )
  app.post("/api/ciphers/:cipher_id/attachment/:attachment_id/delete", authenticate("delete_attachment_post"), remove)
  app.delete("/api/ciphers/:cipher_id/attachment/:attachment_id", authenticate("delete_attachment"), remove)
  app.delete("/api/ciphers/:cipher_id/attachment/:attachment_id/admin", authenticate("delete_attachment_admin"), remove)
  app.get("/attachments/:cipher_id/:file_id", download)
}

function attachmentRequestContextResolve(
  context: Context<AuthenticationEnvironment>,
  options: AttachmentRouteOptions,
): Result<AttachmentRequestContext> {
  const requestContext = authenticationDatabaseRequestContextResolve(context, {
    authenticationErrorCreate: () =>
      apiErrorCreate("attachmentAuthentication", "platform.unauthorized", "Authentication is required."),
    databaseErrorCreate: () => apiErrorCreate("attachmentDatabase", "platform.internal", "Database unavailable."),
    databaseOverride: options.database,
  })
  if (!requestContext.success) return requestContext
  const { authentication, database } = requestContext.data
  return resultCreate({
    database,
    device: authentication.device,
    ipAddress: authentication.ip,
    userUuid: authentication.user.uuid,
  })
}

function attachmentEventCreate(
  options: AttachmentRouteOptions,
  event: number,
  cipher: Cipher,
  requestContext: AttachmentRequestContext,
): void {
  if (cipher.organizationUuid === null) return
  options.event?.cipherEventCreate(event, cipher.uuid, cipher.organizationUuid, requestContext.userUuid, {
    deviceType: requestContext.device.type,
    ipAddress: requestContext.ipAddress,
  })
}

async function attachmentCipherResolve(
  database: NonNullable<AttachmentRouteOptions["database"]>,
  cipherUuid: string,
  userUuid: string,
  write: boolean,
  op: string,
  groupsEnabled = false,
): Promise<Result<Cipher>> {
  const cipherResult = cipherFindByUuid(database, cipherUuid)
  if (!cipherResult.success) return cipherResult
  if (cipherResult.data === null) return attachmentErrorCreate(op, "Cipher doesn't exist")
  const accessResult = cipherAccessFindByUser(database, cipherResult.data, userUuid, groupsEnabled)
  if (!accessResult.success) return accessResult
  if (accessResult.data === null || (write && accessResult.data.readOnly && !accessResult.data.manage))
    return attachmentErrorCreate(op, write ? "Cipher is not write accessible" : "Cipher is not accessible")
  return resultCreate(cipherResult.data)
}

function attachmentNumberResolve(value: number | string): Result<number> {
  const number = typeof value === "number" ? value : Number(value)
  if (!Number.isSafeInteger(number)) return resultErrorCreate("attachmentNumberResolve", "Attachment size is invalid.")
  return resultCreate(number)
}

function attachmentMaxSizeValidate(size: number, options: AttachmentRouteOptions, op: string): Result<void> {
  const maxSize = options.maxFileSizeBytes ?? attachmentMaxFileSizeBytes
  if (!Number.isSafeInteger(maxSize) || maxSize < 0) return resultErrorCreate(op, "Attachment maximum size is invalid.")
  if (size > maxSize) return attachmentErrorCreate(op, "Attachment size exceeds the maximum allowed size")
  return resultCreate(undefined)
}

function attachmentQuotaCheck(
  database: NonNullable<AttachmentRouteOptions["database"]>,
  cipher: Cipher,
  size: number,
  sizeAdjust: number,
  options: AttachmentRouteOptions,
): Result<void> {
  const configuredLimit =
    cipher.userUuid !== null
      ? (options.userQuotaBytes ?? options.quotaBytes)
      : cipher.organizationUuid !== null
        ? options.organizationQuotaBytes
        : undefined
  if (configuredLimit === undefined || configuredLimit === null) return resultCreate(undefined)
  if (!Number.isSafeInteger(configuredLimit) || configuredLimit < 0)
    return resultErrorCreate("attachmentQuotaCheck", "Attachment quota is invalid.")
  if (configuredLimit === 0) return attachmentErrorCreate("attachmentQuotaCheck", "Attachments are disabled")
  const usedResult =
    cipher.userUuid !== null
      ? attachmentSizeByUser(database, cipher.userUuid)
      : cipher.organizationUuid === null
        ? resultErrorCreate("attachmentQuotaCheck", "Cipher is neither owned by a user nor an organization")
        : attachmentSizeByOrganization(database, cipher.organizationUuid)
  if (!usedResult.success) return usedResult
  const available = configuredLimit - usedResult.data + sizeAdjust
  if (!Number.isSafeInteger(available)) return resultErrorCreate("attachmentQuotaCheck", "Attachment size overflow.")
  if (available <= 0)
    return attachmentErrorCreate(
      "attachmentQuotaCheck",
      "Attachment storage limit reached! Delete some attachments to free up space",
    )
  if (size > available)
    return attachmentErrorCreate("attachmentQuotaCheck", "Attachment storage limit exceeded with this file")
  return resultCreate(undefined)
}

async function attachmentLegacyUpload(
  database: NonNullable<AttachmentRouteOptions["database"]>,
  cipher: Cipher,
  userUuid: string,
  multipart: { file: unknown; key: string | undefined },
  options: AttachmentRouteOptions,
  storage: NonNullable<AttachmentRouteOptions["storage"]>,
  notification: ReturnType<typeof cipherNotificationAdapterCreate>,
  device: AuthenticationContext["device"],
): Promise<Result<Attachment>> {
  if (multipart.key === undefined) return attachmentErrorCreate("attachmentLegacyUpload", "No attachment key provided")
  const bytesResult = await attachmentFileRead(multipart.file)
  if (!bytesResult.success) return bytesResult
  if (bytesResult.data.name.length === 0) return attachmentErrorCreate("attachmentLegacyUpload", "No filename provided")
  const size = bytesResult.data.bytes.byteLength
  const maxSizeResult = attachmentMaxSizeValidate(size, options, "attachmentLegacyUpload")
  if (!maxSizeResult.success) return maxSizeResult
  const quotaResult = attachmentQuotaCheck(database, cipher, size, 0, options)
  if (!quotaResult.success) return quotaResult
  const attachment: Attachment = {
    cipherUuid: cipher.uuid,
    fileName: bytesResult.data.name,
    fileSize: size,
    id: options.identifier.uuid(),
    key: multipart.key,
  }
  const saveResult = attachmentSave(database, attachment)
  if (!saveResult.success) return saveResult
  const writeResult = await storage.write(attachment.cipherUuid, attachment.id, bytesResult.data.bytes)
  if (!writeResult.success) {
    await attachmentDelete(database, attachment.id, storage)
    return writeResult
  }
  const mutationResult = await attachmentMutationNotify(database, cipher, userUuid, device, options, notification)
  if (!mutationResult.success) return mutationResult
  return resultCreate(attachment)
}

async function attachmentMultipartParse(
  context: Context<AuthenticationEnvironment>,
): Promise<Result<{ file: unknown; key: string | undefined }>> {
  let body: FormData
  try {
    body = await context.req.raw.formData()
  } catch {
    return attachmentErrorCreate("attachmentMultipartParse", "Invalid multipart request.")
  }
  const file = body.get("data")
  if (file === null) return attachmentErrorCreate("attachmentMultipartParse", "Multipart data is not provided.")
  const key = body.get("key")
  return resultCreate({ file, key: typeof key === "string" ? key : undefined })
}

async function attachmentFileRead(value: unknown): Promise<Result<{ bytes: Uint8Array; name: string }>> {
  if (typeof value !== "object" || value === null || !("arrayBuffer" in value))
    return attachmentErrorCreate("attachmentFileRead", "Attachment file is not provided.")
  const file = value as { arrayBuffer?: () => Promise<ArrayBuffer>; name?: unknown }
  if (typeof file.arrayBuffer !== "function" || typeof file.name !== "string")
    return attachmentErrorCreate("attachmentFileRead", "Attachment file is not provided.")
  try {
    return resultCreate({ bytes: new Uint8Array(await file.arrayBuffer()), name: file.name })
  } catch {
    return resultErrorCreate("attachmentFileRead", "Attachment file could not be read.")
  }
}

async function attachmentMutationNotify(
  database: NonNullable<AttachmentRouteOptions["database"]>,
  cipher: Cipher,
  userUuid: string,
  device: AuthenticationContext["device"],
  options: AttachmentRouteOptions,
  notification: ReturnType<typeof cipherNotificationAdapterCreate>,
): Promise<Result<void>> {
  const revisionDate = options.clock.now().toISOString()
  const usersResult = cipherUserUuidsFind(database, cipher, options.groupsEnabled)
  if (!usersResult.success) return usersResult
  const userUuids = new Set(usersResult.data)
  userUuids.add(userUuid)
  for (const affectedUserUuid of userUuids) {
    const revisionResult = cipherUserRevisionUpdate(database, affectedUserUuid, revisionDate)
    if (!revisionResult.success) return revisionResult
  }
  const revisionCipher = { ...cipher, updatedAt: revisionDate }
  await cipherNotificationSend(notification, cipherUpdateType.update, revisionCipher, device, null, [...userUuids])
  if (options.push !== undefined)
    await pushRelayCipherUpdate(options.push, cipherUpdateType.update, revisionCipher, device, database)
  return resultCreate(undefined)
}

async function cipherJsonResponse(
  context: Context<AuthenticationEnvironment>,
  cipher: Cipher,
  userUuid: string,
  options: AttachmentRouteOptions,
): Promise<Result<Record<string, unknown>>> {
  return cipherToJson(
    options.database ?? context.get("database")!,
    cipher,
    userUuid,
    attachmentJsonOptions(context, options),
  )
}

function attachmentJsonOptions(
  context: Context<AuthenticationEnvironment>,
  options: AttachmentRouteOptions,
): {
  clock: AttachmentRouteOptions["clock"]
  groupsEnabled?: boolean
  origin: string
  privateKey: AttachmentRouteOptions["privateKey"]
} {
  return {
    clock: options.clock,
    groupsEnabled: options.groupsEnabled,
    origin: attachmentOriginResolve(context, options),
    privateKey: options.privateKey,
  }
}

function attachmentOriginResolve(context: Context<AuthenticationEnvironment>, options: AttachmentRouteOptions): string {
  return new URL(options.publicOrigin ?? context.req.url).origin
}

function attachmentErrorCreate(op: string, message: string): ResultErr {
  return apiErrorCreate(op, "platform.invalid-request", message)
}

type AttachmentRequestContext = {
  database: NonNullable<AttachmentRouteOptions["database"]>
  device: AuthenticationContext["device"]
  ipAddress: string
  userUuid: string
}
