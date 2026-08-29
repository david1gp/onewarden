import * as v from "valibot"

export const accountPasswordChangeRequestSchema = v.object({
  masterPasswordHash: v.string(),
  newMasterPasswordHash: v.string(),
  key: v.string(),
  masterPasswordHint: v.optional(v.nullable(v.string())),
})

export type AccountPasswordChangeRequest = v.InferOutput<typeof accountPasswordChangeRequestSchema>
