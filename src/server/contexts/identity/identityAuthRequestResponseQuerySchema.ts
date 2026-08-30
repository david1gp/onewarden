import * as v from "valibot"

export const identityAuthRequestResponseQuerySchema = v.object({
  code: v.string(),
})

export type IdentityAuthRequestResponseQuery = v.InferOutput<typeof identityAuthRequestResponseQuerySchema>
