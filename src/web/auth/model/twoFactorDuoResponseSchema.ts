import * as v from "valibot"

export const twoFactorDuoResponseSchema = v.object({
  enabled: v.boolean(),
  host: v.nullable(v.string()),
  clientSecret: v.nullable(v.string()),
  clientId: v.nullable(v.string()),
  object: v.literal("twoFactorDuo"),
})

export type TwoFactorDuoResponse = v.InferOutput<typeof twoFactorDuoResponseSchema>
