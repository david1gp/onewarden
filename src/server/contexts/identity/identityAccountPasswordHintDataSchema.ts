import * as v from "valibot"

export const identityAccountPasswordHintDataSchema = v.object({
  email: v.string(),
})

export type IdentityAccountPasswordHintData = v.InferOutput<typeof identityAccountPasswordHintDataSchema>
