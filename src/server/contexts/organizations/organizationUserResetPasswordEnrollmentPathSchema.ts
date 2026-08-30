import * as v from "valibot"
import { organizationIdSchema } from "./organizationIdSchema.js"

export const organizationUserResetPasswordEnrollmentPathSchema = v.object({
  org_id: organizationIdSchema,
  user_id: v.pipe(v.string(), v.uuid()),
})

export type OrganizationUserResetPasswordEnrollmentPath = v.InferOutput<
  typeof organizationUserResetPasswordEnrollmentPathSchema
>
