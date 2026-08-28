import { expect, test } from "bun:test"
import { sendFileStorageAdapterCreate } from "../../../src/server/contexts/sends/sendFileStorageAdapterCreate.js"

test("deterministic Send storage saves, reads, and recursively deletes files", async () => {
  const storage = sendFileStorageAdapterCreate()
  const bytes = new TextEncoder().encode("file contents")

  expect((await storage.write("send-one", "file-one", bytes)).success).toBe(true)
  expect(await storage.read("send-one", "file-one")).toEqual({ success: true, data: bytes })
  expect((await storage.delete("send-one")).success).toBe(true)
  expect(await storage.read("send-one", "file-one")).toEqual({ success: true, data: null })
})

test("Send storage rejects traversal paths", async () => {
  const storage = sendFileStorageAdapterCreate()
  const bytes = new Uint8Array([1])

  expect((await storage.write("../outside", "file-one", bytes)).success).toBe(false)
  expect((await storage.write("send-one", "../outside", bytes)).success).toBe(false)
  expect((await storage.read("send-one", "../outside")).success).toBe(false)
})
