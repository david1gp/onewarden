import { lstat, readFile } from "node:fs/promises"
import { join } from "node:path"
import * as v from "valibot"
import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { type ReleaseManifest, releaseManifestSchema } from "./releaseManifestSchema.js"

export async function releaseManifestRead(
  releasePath = join(process.cwd(), "release.json"),
): Promise<Result<ReleaseManifest | undefined>> {
  const op = "releaseManifestRead"
  let contents: string
  try {
    const stats = await lstat(releasePath)
    if (stats.isSymbolicLink() || !stats.isFile())
      return resultErrorCreate(op, "Release manifest must be a regular file.")
    contents = await readFile(releasePath, "utf8")
  } catch (error) {
    if (releaseManifestReadIsNotFound(error)) return resultCreate(undefined)
    return resultErrorCreate(op, "Release manifest could not be read.")
  }

  let value: unknown
  try {
    value = JSON.parse(contents)
  } catch {
    return resultErrorCreate(op, "Release manifest is not valid JSON.")
  }
  const result = v.safeParse(releaseManifestSchema, value)
  if (!result.success) return resultErrorCreate(op, "Release manifest is invalid.")
  return resultCreate(result.output)
}

function releaseManifestReadIsNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
}
