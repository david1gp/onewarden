import { afterEach, expect, test } from "bun:test"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { attachmentFileStorageAdapterCreate } from "../../../src/server/contexts/attachments/attachmentFileStorageAdapterCreate.js"

const temporaryDirectories: string[] = []

function attachmentStorageTestDirectoryCreate(): string {
  const directory = mkdtempSync(join(tmpdir(), "onewarden-attachments-"))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { force: true, recursive: true })
})

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

test("filesystem attachment storage persists bytes across adapter instances", async () => {
  const directory = attachmentStorageTestDirectoryCreate()
  const bytes = new TextEncoder().encode("persistent attachment contents")
  const firstStorage = attachmentFileStorageAdapterCreate({ directory })

  expect(await firstStorage.write("cipher-one", "attachment-one", bytes)).toEqual({ success: true, data: undefined })

  const secondStorage = attachmentFileStorageAdapterCreate({ directory })
  expect(await secondStorage.read("cipher-one", "attachment-one")).toEqual({ success: true, data: bytes })
  expect((await secondStorage.deleteAll("cipher-one")).success).toBe(true)
  expect(await secondStorage.read("cipher-one", "attachment-one")).toEqual({ success: true, data: null })
})
