import * as v from "valibot"

export const twoFactorEmailResponseSchema = v.object({
  email: v.nullable(v.string()),
  enabled: v.boolean(),
  object: v.literal("twoFactorEmail"),
})

export type TwoFactorEmailResponse = v.InferOutput<typeof twoFactorEmailResponseSchema>
