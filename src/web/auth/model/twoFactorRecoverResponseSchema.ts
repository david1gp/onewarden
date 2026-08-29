import * as v from "valibot"

export const twoFactorRecoverResponseSchema = v.object({
  code: v.string(),
  object: v.literal("twoFactorRecover"),
})

export type TwoFactorRecoverResponse = v.InferOutput<typeof twoFactorRecoverResponseSchema>
