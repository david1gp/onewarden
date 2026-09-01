import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { AttachmentFileStorageAdapter } from "./attachmentFileStorageAdapter.js"

export function s3AttachmentFileStorageAdapterCreate(options: {
  client?: S3Client
  endpoint?: string
  forcePathStyle?: boolean
  location: string
}): AttachmentFileStorageAdapter {
  const locationPath = options.location.slice("s3://".length)
  const prefixSeparatorIndex = locationPath.indexOf("/")
  const bucket = prefixSeparatorIndex === -1 ? locationPath : locationPath.slice(0, prefixSeparatorIndex)
  const prefix = prefixSeparatorIndex === -1 ? "" : locationPath.slice(prefixSeparatorIndex + 1).replace(/\/+$/, "")
  const keyPrefix = prefix === "" ? "" : `${prefix}/`
  const client = options.client ?? new S3Client({ endpoint: options.endpoint, forcePathStyle: options.forcePathStyle })

  const keyResolve = (cipherUuid: string, attachmentId?: string): string | undefined => {
    if (!s3AttachmentStorageSegmentIsSafe(cipherUuid)) return undefined
    if (attachmentId !== undefined && !s3AttachmentStorageSegmentIsSafe(attachmentId)) return undefined
    return attachmentId === undefined ? `${keyPrefix}${cipherUuid}` : `${keyPrefix}${cipherUuid}/${attachmentId}`
  }

  const objectDelete = async (cipherUuid: string, attachmentId: string) => {
    const op = "attachmentFileStorageDelete"
    const key = keyResolve(cipherUuid, attachmentId)
    if (key === undefined) return resultErrorCreate(op, "Invalid attachment file path.")
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
      return resultCreate(undefined)
    } catch (error) {
      if (s3AttachmentObjectIsMissing(error)) return resultCreate(undefined)
      return resultErrorCreate(op, "Attachment file deletion failed.")
    }
  }

  const objectsDelete = async (cipherUuid: string) => {
    const op = "attachmentFileStorageDelete"
    const key = keyResolve(cipherUuid)
    if (key === undefined) return resultErrorCreate(op, "Invalid attachment file path.")
    const objectPrefix = `${key}/`
    let continuationToken: string | undefined
    try {
      while (true) {
        const response = await client.send(
          new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken, Prefix: objectPrefix }),
        )
        const objects = (response.Contents ?? []).flatMap((object) =>
          object.Key === undefined ? [] : [{ Key: object.Key }],
        )
        if (objects.length > 0) {
          const deleteResponse = await client.send(
            new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects, Quiet: true } }),
          )
          if ((deleteResponse.Errors?.length ?? 0) > 0) return resultErrorCreate(op, "Attachment file deletion failed.")
        }
        if (!response.IsTruncated) return resultCreate(undefined)
        if (response.NextContinuationToken === undefined)
          return resultErrorCreate(op, "Attachment file deletion failed.")
        continuationToken = response.NextContinuationToken
      }
    } catch {
      return resultErrorCreate(op, "Attachment file deletion failed.")
    }
  }

  return {
    delete: (cipherUuid, attachmentId) =>
      attachmentId === undefined ? objectsDelete(cipherUuid) : objectDelete(cipherUuid, attachmentId),
    deleteAll: objectsDelete,
    async read(cipherUuid, attachmentId) {
      const op = "attachmentFileStorageRead"
      const key = keyResolve(cipherUuid, attachmentId)
      if (key === undefined) return resultErrorCreate(op, "Invalid attachment file path.")
      try {
        const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
        if (response.Body === undefined) return resultErrorCreate(op, "Attachment file read failed.")
        return resultCreate(await response.Body.transformToByteArray())
      } catch (error) {
        if (s3AttachmentObjectIsMissing(error)) return resultCreate(null)
        return resultErrorCreate(op, "Attachment file read failed.")
      }
    },
    async write(cipherUuid, attachmentId, bytes) {
      const op = "attachmentFileStorageWrite"
      const key = keyResolve(cipherUuid, attachmentId)
      if (key === undefined) return resultErrorCreate(op, "Invalid attachment file path.")
      try {
        await client.send(new PutObjectCommand({ Body: bytes, Bucket: bucket, Key: key }))
        return resultCreate(undefined)
      } catch {
        return resultErrorCreate(op, "Attachment file save failed.")
      }
    },
  }
}

function s3AttachmentObjectIsMissing(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false
  const candidate = error as { $metadata?: { httpStatusCode?: unknown }; name?: unknown }
  if (candidate.name === "NoSuchBucket") return false
  return candidate.name === "NoSuchKey" || candidate.name === "NotFound" || candidate.$metadata?.httpStatusCode === 404
}

function s3AttachmentStorageSegmentIsSafe(value: string): boolean {
  return value.length > 0 && value !== "." && value !== ".." && !value.includes("/") && !value.includes("\\")
}
