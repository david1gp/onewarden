import * as v from "valibot"

export const twoFactorWebAuthnKeySchema = v.object({
  id: v.number(),
  name: v.string(),
  migrated: v.optional(v.boolean()),
})

export type TwoFactorWebAuthnKey = v.InferOutput<typeof twoFactorWebAuthnKeySchema>
