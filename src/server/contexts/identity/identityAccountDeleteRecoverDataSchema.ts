import * as v from "valibot"

export const identityAccountDeleteRecoverDataSchema = v.object({
  email: v.string(),
})

export type IdentityAccountDeleteRecoverData = v.InferOutput<typeof identityAccountDeleteRecoverDataSchema>
