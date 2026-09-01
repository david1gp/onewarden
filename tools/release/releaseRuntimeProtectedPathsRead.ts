import { isAbsolute, relative, resolve, sep } from "node:path"
import { type Result } from "#result"
import { resultCreate } from "../../src/shared/result/resultCreate.js"
import { releaseEnvironmentRead } from "./releaseEnvironmentRead.js"

export async function releaseRuntimeProtectedPathsRead(runtimeDirectory: string): Promise<Result<ReadonlySet<string>>> {
  const environmentResult = await releaseEnvironmentRead(resolve(runtimeDirectory, ".env"))
  if (!environmentResult.success) return environmentResult
  const environment = environmentResult.data
  const protectedPaths = new Set(["data"])
  const configuredPaths = [
    environment.DATABASE_PATH ?? "./data/onewarden.sqlite3",
    environment.SENDS_FOLDER ?? "./data/sends",
    environment.ATTACHMENTS_FOLDER ?? "./data/attachments",
    environment.BACKUP_FOLDER ?? "./data/backups",
    environment.ICON_CACHE_FOLDER ?? "./data/icon_cache",
  ]
  for (const configuredPath of configuredPaths) {
    if (configuredPath.startsWith("s3://")) continue
    const absolutePath = isAbsolute(configuredPath)
      ? resolve(configuredPath)
      : resolve(runtimeDirectory, configuredPath)
    const relativePath = relative(runtimeDirectory, absolutePath)
    if (
      relativePath.length === 0 ||
      relativePath === ".." ||
      relativePath.startsWith(`..${sep}`) ||
      isAbsolute(relativePath)
    )
      continue
    const normalizedPath = relativePath.split(sep).join("/")
    protectedPaths.add(normalizedPath)
    if (configuredPath === (environment.DATABASE_PATH ?? "./data/onewarden.sqlite3")) {
      protectedPaths.add(`${normalizedPath}-wal`)
      protectedPaths.add(`${normalizedPath}-shm`)
    }
  }
  return resultCreate(protectedPaths)
}
