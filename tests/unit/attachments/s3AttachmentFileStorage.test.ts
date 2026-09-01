import { expect, test } from "bun:test"
import {
  DeleteObjectCommand,
  type DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3"
import { s3AttachmentFileStorageAdapterCreate } from "../../../src/server/contexts/attachments/s3AttachmentFileStorageAdapterCreate.js"

test("S3 attachment storage writes, reads, and deletes prefixed object keys", async () => {
  const bytes = new TextEncoder().encode("attachment contents")
  const commands: unknown[] = []
  const client = {
    async send(command: unknown): Promise<unknown> {
      commands.push(command)
      if (command instanceof GetObjectCommand)
        return { Body: { transformToByteArray: async () => Uint8Array.from(bytes) } }
      return {}
    },
  } as unknown as S3Client
  const storage = s3AttachmentFileStorageAdapterCreate({
    client,
    location: "s3://attachments/onewarden/encrypted",
  })

  expect(await storage.write("cipher-one", "attachment-one", bytes)).toEqual({ success: true, data: undefined })
  expect(await storage.read("cipher-one", "attachment-one")).toEqual({ success: true, data: bytes })
  expect(await storage.delete("cipher-one", "attachment-one")).toEqual({ success: true, data: undefined })

  expect(commands).toHaveLength(3)
  expect(commands[0]).toBeInstanceOf(PutObjectCommand)
  expect((commands[0] as PutObjectCommand).input).toEqual({
    Body: bytes,
    Bucket: "attachments",
    Key: "onewarden/encrypted/cipher-one/attachment-one",
  })
  expect(commands[1]).toBeInstanceOf(GetObjectCommand)
  expect((commands[1] as GetObjectCommand).input).toEqual({
    Bucket: "attachments",
    Key: "onewarden/encrypted/cipher-one/attachment-one",
  })
  expect(commands[2]).toBeInstanceOf(DeleteObjectCommand)
  expect((commands[2] as DeleteObjectCommand).input).toEqual({
    Bucket: "attachments",
    Key: "onewarden/encrypted/cipher-one/attachment-one",
  })
})

test("S3 attachment storage returns null only for missing reads and keeps missing deletes idempotent", async () => {
  const missingError = Object.assign(new Error("missing"), {
    $metadata: { httpStatusCode: 404 },
    name: "NoSuchKey",
  })
  const client = {
    async send(command: unknown): Promise<unknown> {
      if (command instanceof GetObjectCommand || command instanceof DeleteObjectCommand) throw missingError
      return {}
    },
  } as unknown as S3Client
  const storage = s3AttachmentFileStorageAdapterCreate({ client, location: "s3://attachments" })

  expect(await storage.read("cipher-one", "attachment-one")).toEqual({ success: true, data: null })
  expect(await storage.delete("cipher-one", "attachment-one")).toEqual({ success: true, data: undefined })

  const failedStorage = s3AttachmentFileStorageAdapterCreate({
    client: { send: async () => Promise.reject(new Error("unavailable")) } as unknown as S3Client,
    location: "s3://attachments",
  })
  expect((await failedStorage.read("cipher-one", "attachment-one")).success).toBe(false)
})

test("S3 attachment storage deleteAll lists and deletes every page under the exact cipher prefix", async () => {
  const commands: unknown[] = []
  let listPage = 0
  const client = {
    async send(command: unknown): Promise<unknown> {
      commands.push(command)
      if (!(command instanceof ListObjectsV2Command)) return {}
      listPage += 1
      if (listPage === 1)
        return {
          Contents: [{ Key: "prefix/cipher-one/attachment-one" }],
          IsTruncated: true,
          NextContinuationToken: "next-page",
        }
      if (listPage > 2) return { IsTruncated: false }
      return { Contents: [{ Key: "prefix/cipher-one/attachment-two" }], IsTruncated: false }
    },
  } as unknown as S3Client
  const storage = s3AttachmentFileStorageAdapterCreate({ client, location: "s3://attachments/prefix/" })

  expect(await storage.deleteAll("cipher-one")).toEqual({ success: true, data: undefined })
  expect(commands).toHaveLength(4)
  expect((commands[0] as ListObjectsV2Command).input).toEqual({
    Bucket: "attachments",
    ContinuationToken: undefined,
    Prefix: "prefix/cipher-one/",
  })
  expect((commands[1] as DeleteObjectsCommand).input).toEqual({
    Bucket: "attachments",
    Delete: { Objects: [{ Key: "prefix/cipher-one/attachment-one" }], Quiet: true },
  })
  expect((commands[2] as ListObjectsV2Command).input).toEqual({
    Bucket: "attachments",
    ContinuationToken: "next-page",
    Prefix: "prefix/cipher-one/",
  })
  expect((commands[3] as DeleteObjectsCommand).input).toEqual({
    Bucket: "attachments",
    Delete: { Objects: [{ Key: "prefix/cipher-one/attachment-two" }], Quiet: true },
  })

  expect(await storage.delete("cipher-two")).toEqual({ success: true, data: undefined })
  expect((commands[4] as ListObjectsV2Command).input).toEqual({
    Bucket: "attachments",
    ContinuationToken: undefined,
    Prefix: "prefix/cipher-two/",
  })
})

test("S3 attachment storage reports partial deleteAll failures", async () => {
  const client = {
    async send(command: unknown): Promise<unknown> {
      if (command instanceof ListObjectsV2Command)
        return { Contents: [{ Key: "cipher-one/attachment-one" }], IsTruncated: false }
      return { Errors: [{ Code: "AccessDenied", Key: "cipher-one/attachment-one" }] }
    },
  } as unknown as S3Client
  const storage = s3AttachmentFileStorageAdapterCreate({ client, location: "s3://attachments" })

  expect((await storage.deleteAll("cipher-one")).success).toBe(false)
})

test("S3 attachment storage rejects traversal segments without sending commands", async () => {
  let commandsSent = 0
  const client = {
    async send(): Promise<unknown> {
      commandsSent += 1
      return {}
    },
  } as unknown as S3Client
  const storage = s3AttachmentFileStorageAdapterCreate({ client, location: "s3://attachments" })
  const bytes = new Uint8Array([1])

  expect((await storage.write("../outside", "attachment-one", bytes)).success).toBe(false)
  expect((await storage.read("cipher-one", "../outside")).success).toBe(false)
  expect((await storage.deleteAll("../outside")).success).toBe(false)
  expect(commandsSent).toBe(0)
})
