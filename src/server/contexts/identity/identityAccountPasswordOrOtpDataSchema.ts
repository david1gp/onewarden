import * as v from "valibot"

const identityAccountPasswordOrOtpOptionalStringSchema = v.nullish(v.string())

export const identityAccountPasswordOrOtpDataSchema = v.object({
  masterPasswordHash: identityAccountPasswordOrOtpOptionalStringSchema,
  MasterPasswordHash: identityAccountPasswordOrOtpOptionalStringSchema,
  otp: identityAccountPasswordOrOtpOptionalStringSchema,
})

export type IdentityAccountPasswordOrOtpData = v.InferOutput<typeof identityAccountPasswordOrOtpDataSchema>
