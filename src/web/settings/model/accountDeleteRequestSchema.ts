import * as v from "valibot"

export const accountDeleteRequestSchema = v.object({
  masterPasswordHash: v.string(),
  otp: v.optional(v.nullable(v.string())),
})

export type AccountDeleteRequest = v.InferOutput<typeof accountDeleteRequestSchema>
