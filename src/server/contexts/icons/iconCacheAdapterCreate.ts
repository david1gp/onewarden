import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import type { Clock } from "../../../shared/clock/clock.js"
import type { IconCacheAdapter } from "./iconCacheAdapter.js"

type IconCacheEntry = {
  bytes: Uint8Array
  modifiedAt: number
}

export function iconCacheAdapterCreate(options?: { clock?: Clock; directory?: string }): IconCacheAdapter {
  const directory = options?.directory
  const clock = options?.clock
  const entries = new Map<string, IconCacheEntry>()
  const modifiedAt = (): number => clock?.now().getTime() ?? Date.now()
  const pathResolve = (path: string): string => (directory === undefined ? path : join(directory, path))

  return {
    async delete(path) {
      if (directory === undefined) {
        entries.delete(path)
        return
      }
      await rm(pathResolve(path), { force: true })
    },
    async read(path) {
      if (directory === undefined) {
        const entry = entries.get(path)
        return entry === undefined ? undefined : Uint8Array.from(entry.bytes)
      }
      try {
        return Uint8Array.from(await readFile(pathResolve(path)))
      } catch {
        return undefined
      }
    },
    async stat(path) {
      if (directory === undefined) return entries.get(path)?.modifiedAt
      try {
        return (await stat(pathResolve(path))).mtimeMs
      } catch {
        return undefined
      }
    },
    async write(path, bytes) {
      if (directory === undefined) {
        entries.set(path, { bytes: Uint8Array.from(bytes), modifiedAt: modifiedAt() })
        return
      }
      const target = pathResolve(path)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, bytes)
    },
  }
}
