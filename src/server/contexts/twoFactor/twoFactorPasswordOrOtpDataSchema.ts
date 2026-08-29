import * as v from "valibot"

const twoFactorPasswordOrOtpOptionalStringSchema = v.nullish(v.string())

export const twoFactorPasswordOrOtpDataSchema = v.object({
  masterPasswordHash: twoFactorPasswordOrOtpOptionalStringSchema,
  otp: twoFactorPasswordOrOtpOptionalStringSchema,
})

export type TwoFactorPasswordOrOtpData = v.InferOutput<typeof twoFactorPasswordOrOtpDataSchema>
