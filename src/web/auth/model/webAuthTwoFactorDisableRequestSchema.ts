import * as v from "valibot"

export const webAuthTwoFactorDisableRequestSchema = v.object({
  type: v.union([v.number(), v.string()]),
  masterPasswordHash: v.optional(v.nullable(v.string()), null),
})

export type WebAuthTwoFactorDisableRequest = v.InferOutput<typeof webAuthTwoFactorDisableRequestSchema>
export type WebAuthTwoFactorDisableRequestInput = v.InferInput<typeof webAuthTwoFactorDisableRequestSchema>
