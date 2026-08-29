import * as v from "valibot"

export const twoFactorDisableDataSchema = v.object({
  masterPasswordHash: v.nullish(v.string()),
  otp: v.nullish(v.string()),
  type: v.union([v.number(), v.string()]),
})

export type TwoFactorDisableData = v.InferOutput<typeof twoFactorDisableDataSchema>
