import type { ServerConfig } from "../../config/serverConfigSchema.js"
import type { AttachmentFileStorageAdapter } from "./attachmentFileStorageAdapter.js"
import { attachmentFileStorageAdapterCreate } from "./attachmentFileStorageAdapterCreate.js"
import { s3AttachmentFileStorageAdapterCreate } from "./s3AttachmentFileStorageAdapterCreate.js"

type AttachmentStorageConfiguration = Pick<ServerConfig, "ATTACHMENTS_FOLDER" | "S3_ENDPOINT" | "S3_FORCE_PATH_STYLE">

type AttachmentStorageCreateOptions = {
  localCreate?: typeof attachmentFileStorageAdapterCreate
  s3Create?: typeof s3AttachmentFileStorageAdapterCreate
}

export function attachmentStorageCreate(
  configuration: AttachmentStorageConfiguration,
  options?: AttachmentStorageCreateOptions,
): AttachmentFileStorageAdapter {
  if (!configuration.ATTACHMENTS_FOLDER.startsWith("s3://")) {
    const localCreate = options?.localCreate ?? attachmentFileStorageAdapterCreate
    return localCreate({ directory: configuration.ATTACHMENTS_FOLDER })
  }

  const s3Create = options?.s3Create ?? s3AttachmentFileStorageAdapterCreate
  return s3Create({
    endpoint: configuration.S3_ENDPOINT,
    forcePathStyle: configuration.S3_FORCE_PATH_STYLE,
    location: configuration.ATTACHMENTS_FOLDER,
  })
}
