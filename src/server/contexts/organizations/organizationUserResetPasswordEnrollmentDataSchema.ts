import * as v from "valibot"
import { identityAccountPasswordOrOtpDataSchema } from "../identity/identityAccountPasswordOrOtpDataSchema.js"

export const organizationUserResetPasswordEnrollmentDataSchema = v.object({
  ...identityAccountPasswordOrOtpDataSchema.entries,
  resetPasswordKey: v.nullish(v.string()),
})

export type OrganizationUserResetPasswordEnrollmentData = v.InferOutput<
  typeof organizationUserResetPasswordEnrollmentDataSchema
>
