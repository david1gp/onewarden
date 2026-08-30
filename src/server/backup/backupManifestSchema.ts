import * as v from "valibot"

const backupManifestFileSchema = v.strictObject({
  path: v.pipe(v.string(), v.minLength(1)),
  size: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(Number.MAX_SAFE_INTEGER)),
  sha256: v.pipe(v.string(), v.regex(/^[0-9a-f]{64}$/)),
})

export const backupManifestSchema = v.strictObject({
  format: v.literal("onewarden-backup"),
  version: v.literal(1),
  schemaVersion: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(Number.MAX_SAFE_INTEGER)),
  files: v.array(backupManifestFileSchema),
})

export type BackupManifest = v.InferOutput<typeof backupManifestSchema>
