import * as v from "valibot"

export const accountApiKeySchema = v.object({
  apiKey: v.string(),
  revisionDate: v.string(),
  object: v.literal("apiKey"),
})

export type AccountApiKey = v.InferOutput<typeof accountApiKeySchema>
