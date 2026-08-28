import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { AttachmentFileStorageAdapter } from "./attachmentFileStorageAdapter.js"

export function attachmentFileStorageAdapterCreate(options?: { directory?: string }): AttachmentFileStorageAdapter {
  const directory = options?.directory
  const files = new Map<string, Uint8Array>()

  const pathResolve = (cipherUuid: string, attachmentId?: string): string | undefined => {
    if (!attachmentStorageSegmentIsSafe(cipherUuid)) return undefined
    if (attachmentId !== undefined && !attachmentStorageSegmentIsSafe(attachmentId)) return undefined
    return attachmentId === undefined
      ? join(directory ?? "", cipherUuid)
      : join(directory ?? "", cipherUuid, attachmentId)
  }

  const remove = async (cipherUuid: string, attachmentId?: string) => {
    const path = pathResolve(cipherUuid, attachmentId)
    if (path === undefined) return resultErrorCreate("attachmentFileStorageDelete", "Invalid attachment file path.")
    if (directory === undefined) {
      if (attachmentId === undefined) {
        const prefix = `${cipherUuid}/`
        for (const key of files.keys()) if (key.startsWith(prefix)) files.delete(key)
      } else {
        files.delete(`${cipherUuid}/${attachmentId}`)
      }
      return resultCreate(undefined)
    }
    try {
      await rm(path, { force: true, recursive: true })
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate("attachmentFileStorageDelete", "Attachment file deletion failed.")
    }
  }

  return {
    delete: remove,
    deleteAll: (cipherUuid) => remove(cipherUuid),
    async read(cipherUuid, attachmentId) {
      const path = pathResolve(cipherUuid, attachmentId)
      if (path === undefined) return resultErrorCreate("attachmentFileStorageRead", "Invalid attachment file path.")
      if (directory === undefined) return resultCreate(files.get(`${cipherUuid}/${attachmentId}`) ?? null)
      try {
        return resultCreate(Uint8Array.from(await readFile(path)))
      } catch {
        return resultCreate(null)
      }
    },
    async write(cipherUuid, attachmentId, bytes) {
      const path = pathResolve(cipherUuid, attachmentId)
      if (path === undefined) return resultErrorCreate("attachmentFileStorageWrite", "Invalid attachment file path.")
      if (directory === undefined) {
        files.set(`${cipherUuid}/${attachmentId}`, Uint8Array.from(bytes))
        return resultCreate(undefined)
      }
      try {
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, bytes)
        return resultCreate(undefined)
      } catch {
        return resultErrorCreate("attachmentFileStorageWrite", "Attachment file save failed.")
      }
    },
  }
}

function attachmentStorageSegmentIsSafe(value: string): boolean {
  return value.length > 0 && value !== "." && value !== ".." && !value.includes("/") && !value.includes("\\")
}
