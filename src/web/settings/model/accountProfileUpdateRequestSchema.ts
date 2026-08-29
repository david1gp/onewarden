import * as v from "valibot"

export const accountProfileUpdateRequestSchema = v.object({
  name: v.pipe(v.string(), v.maxLength(50)),
  masterPasswordHint: v.optional(v.nullable(v.string())),
})

export type AccountProfileUpdateRequest = v.InferOutput<typeof accountProfileUpdateRequestSchema>
