import { expect, test } from "bun:test"
import { attachmentFileStorageAdapterCreate } from "../../../src/server/contexts/attachments/attachmentFileStorageAdapterCreate.js"

test("deterministic attachment storage saves, reads, and deletes by cipher", async () => {
  const storage = attachmentFileStorageAdapterCreate()
  const bytes = new TextEncoder().encode("attachment contents")

  expect((await storage.write("cipher-one", "attachment-one", bytes)).success).toBe(true)
  expect(await storage.read("cipher-one", "attachment-one")).toEqual({ success: true, data: bytes })
  expect((await storage.delete("cipher-one", "attachment-one")).success).toBe(true)
  expect(await storage.read("cipher-one", "attachment-one")).toEqual({ success: true, data: null })

  await storage.write("cipher-one", "attachment-one", bytes)
  await storage.write("cipher-one", "attachment-two", bytes)
  expect((await storage.deleteAll("cipher-one")).success).toBe(true)
  expect(await storage.read("cipher-one", "attachment-one")).toEqual({ success: true, data: null })
  expect(await storage.read("cipher-one", "attachment-two")).toEqual({ success: true, data: null })
})

test("attachment storage rejects traversal paths", async () => {
  const storage = attachmentFileStorageAdapterCreate()
  const bytes = new Uint8Array([1])

  expect((await storage.write("../outside", "attachment-one", bytes)).success).toBe(false)
  expect((await storage.write("cipher-one", "../outside", bytes)).success).toBe(false)
  expect((await storage.read("cipher-one", "../outside")).success).toBe(false)
})
