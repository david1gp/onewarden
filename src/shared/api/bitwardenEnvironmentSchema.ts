import * as v from "valibot"

const bitwardenEnvironmentLocationSchema = v.pipe(v.string(), v.url())

export const bitwardenEnvironmentSchema = v.object({
  api: bitwardenEnvironmentLocationSchema,
  identity: bitwardenEnvironmentLocationSchema,
  icons: bitwardenEnvironmentLocationSchema,
  notifications: bitwardenEnvironmentLocationSchema,
  webVault: bitwardenEnvironmentLocationSchema,
})

export type BitwardenEnvironment = v.InferOutput<typeof bitwardenEnvironmentSchema>
