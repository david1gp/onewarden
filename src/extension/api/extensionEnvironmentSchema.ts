import * as v from "valibot"
import { bitwardenEnvironmentSchema } from "../../shared/api/bitwardenEnvironmentSchema.js"

export const extensionEnvironmentSchema = v.object({
  ...bitwardenEnvironmentSchema.entries,
  events: v.pipe(v.string(), v.url()),
})

export type ExtensionEnvironment = v.InferOutput<typeof extensionEnvironmentSchema>
