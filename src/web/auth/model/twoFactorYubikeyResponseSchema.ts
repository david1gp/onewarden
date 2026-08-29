import * as v from "valibot"

export const twoFactorYubikeyResponseSchema = v.object({
  enabled: v.boolean(),
  Key1: v.optional(v.nullable(v.string())),
  Key2: v.optional(v.nullable(v.string())),
  Key3: v.optional(v.nullable(v.string())),
  Key4: v.optional(v.nullable(v.string())),
  Key5: v.optional(v.nullable(v.string())),
  nfc: v.optional(v.boolean()),
  object: v.literal("twoFactorU2f"),
})

export type TwoFactorYubikeyResponse = v.InferOutput<typeof twoFactorYubikeyResponseSchema>
