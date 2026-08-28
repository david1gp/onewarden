import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { SendFileStorageAdapter } from "./sendFileStorageAdapter.js"

export function sendFileStorageAdapterCreate(options?: { directory?: string }): SendFileStorageAdapter {
  const directory = options?.directory
  const files = new Map<string, Uint8Array>()

  const pathResolve = (sendUuid: string, fileId?: string): string | undefined => {
    if (!sendFileStorageSegmentIsSafe(sendUuid) || (fileId !== undefined && !sendFileStorageSegmentIsSafe(fileId)))
      return undefined
    return fileId === undefined ? join(directory ?? "", sendUuid) : join(directory ?? "", sendUuid, fileId)
  }

  return {
    async delete(sendUuid) {
      const path = pathResolve(sendUuid)
      if (path === undefined) return resultErrorCreate("sendFileStorageDelete", "Invalid send file path.")
      if (directory === undefined) {
        const prefix = `${sendUuid}/`
        for (const key of files.keys()) if (key.startsWith(prefix)) files.delete(key)
        return resultCreate(undefined)
      }
      try {
        await rm(path, { force: true, recursive: true })
        return resultCreate(undefined)
      } catch {
        return resultErrorCreate("sendFileStorageDelete", "Send file deletion failed.")
      }
    },
    async read(sendUuid, fileId) {
      const path = pathResolve(sendUuid, fileId)
      if (path === undefined) return resultErrorCreate("sendFileStorageRead", "Invalid send file path.")
      if (directory === undefined) return resultCreate(files.get(`${sendUuid}/${fileId}`) ?? null)
      try {
        return resultCreate(Uint8Array.from(await readFile(path)))
      } catch {
        return resultCreate(null)
      }
    },
    async write(sendUuid, fileId, bytes) {
      const path = pathResolve(sendUuid, fileId)
      if (path === undefined) return resultErrorCreate("sendFileStorageWrite", "Invalid send file path.")
      if (directory === undefined) {
        files.set(`${sendUuid}/${fileId}`, Uint8Array.from(bytes))
        return resultCreate(undefined)
      }
      try {
        await mkdir(dirname(path), { recursive: true })
        await writeFile(path, bytes)
        return resultCreate(undefined)
      } catch {
        return resultErrorCreate("sendFileStorageWrite", "Send file save failed.")
      }
    },
  }
}

function sendFileStorageSegmentIsSafe(value: string): boolean {
  return value.length > 0 && value !== "." && value !== ".." && !value.includes("/") && !value.includes("\\")
}
