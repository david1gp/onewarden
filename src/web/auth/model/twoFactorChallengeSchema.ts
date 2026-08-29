import * as v from "valibot"

export const twoFactorChallengeSchema = v.object({
  error: v.literal("invalid_grant"),
  error_description: v.optional(v.string()),
  TwoFactorProviders: v.array(v.union([v.string(), v.number()])),
  TwoFactorProviders2: v.optional(v.record(v.string(), v.nullable(v.unknown()))),
  MasterPasswordPolicy: v.optional(v.unknown()),
})

export type TwoFactorChallenge = v.InferOutput<typeof twoFactorChallengeSchema>
