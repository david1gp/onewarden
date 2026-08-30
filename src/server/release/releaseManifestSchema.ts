import * as v from "valibot"

const releaseManifestFileSchema = v.strictObject({
  path: v.pipe(v.string(), v.minLength(1), v.regex(/^(?!\/)(?!.*(?:^|\/)(?:\.|\.\.)(?:\/|$))[^\\]+$/)),
  size: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(Number.MAX_SAFE_INTEGER)),
  sha256: v.pipe(v.string(), v.regex(/^[0-9a-f]{64}$/)),
})

export const releaseManifestSchema = v.strictObject({
  application: v.pipe(v.string(), v.minLength(1)),
  releaseVersion: v.pipe(v.string(), v.minLength(1)),
  gitHead: v.pipe(v.string(), v.regex(/^[0-9a-f]{40}$/)),
  gitTag: v.nullable(v.pipe(v.string(), v.minLength(1))),
  builtAt: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)),
  bunVersion: v.pipe(v.string(), v.minLength(1)),
  schemaVersion: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(Number.MAX_SAFE_INTEGER)),
  schemaIdentity: v.pipe(v.string(), v.minLength(1)),
  artifactFormat: v.literal(1),
  artifactSha256: v.pipe(v.string(), v.regex(/^[0-9a-f]{64}$/)),
  files: v.array(releaseManifestFileSchema),
})

export type ReleaseManifest = v.InferOutput<typeof releaseManifestSchema>
