import * as v from "valibot"

export const accountEmailChangeCompleteRequestSchema = v.object({
  masterPasswordHash: v.string(),
  newEmail: v.pipe(v.string(), v.email()),
  token: v.string(),
  key: v.optional(v.string()),
  masterPasswordHint: v.optional(v.nullable(v.string())),
})

export type AccountEmailChangeCompleteRequest = v.InferOutput<typeof accountEmailChangeCompleteRequestSchema>
