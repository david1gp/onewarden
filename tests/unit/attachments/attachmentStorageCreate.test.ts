import { expect, test } from "bun:test"
import type { AttachmentFileStorageAdapter } from "../../../src/server/contexts/attachments/attachmentFileStorageAdapter.js"
import { attachmentFileStorageAdapterCreate } from "../../../src/server/contexts/attachments/attachmentFileStorageAdapterCreate.js"
import { attachmentStorageCreate } from "../../../src/server/contexts/attachments/attachmentStorageCreate.js"

test("attachmentStorageCreate selects local storage for filesystem locations", () => {
  const expectedStorage = attachmentFileStorageAdapterCreate()
  let localOptions: unknown

  const storage = attachmentStorageCreate(
    {
      ATTACHMENTS_FOLDER: "/var/lib/onewarden/attachments",
      S3_ENDPOINT: undefined,
      S3_FORCE_PATH_STYLE: false,
    },
    {
      localCreate: (options) => {
        localOptions = options
        return expectedStorage
      },
      s3Create: () => unexpectedStorageCreate(),
    },
  )

  expect(storage).toBe(expectedStorage)
  expect(localOptions).toEqual({ directory: "/var/lib/onewarden/attachments" })
})

test("attachmentStorageCreate selects S3 storage with compatible client settings", () => {
  const expectedStorage = attachmentFileStorageAdapterCreate()
  let s3Options: unknown

  const storage = attachmentStorageCreate(
    {
      ATTACHMENTS_FOLDER: "s3://attachments/onewarden",
      S3_ENDPOINT: "http://minio.internal:9000",
      S3_FORCE_PATH_STYLE: true,
    },
    {
      localCreate: () => unexpectedStorageCreate(),
      s3Create: (options) => {
        s3Options = options
        return expectedStorage
      },
    },
  )

  expect(storage).toBe(expectedStorage)
  expect(s3Options).toEqual({
    endpoint: "http://minio.internal:9000",
    forcePathStyle: true,
    location: "s3://attachments/onewarden",
  })
})

function unexpectedStorageCreate(): AttachmentFileStorageAdapter {
  throw new Error("Unexpected attachment storage backend selected.")
}
