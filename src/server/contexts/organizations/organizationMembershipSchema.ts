import * as v from "valibot"
import { organizationIdSchema } from "./organizationIdSchema.js"

export const organizationMembershipSchema = v.object({
  accessAll: v.boolean(),
  akey: v.string(),
  externalId: v.nullable(v.string()),
  invitedByEmail: v.nullable(v.string()),
  organizationUuid: organizationIdSchema,
  resetPasswordKey: v.nullable(v.string()),
  status: v.number(),
  type: v.number(),
  userUuid: v.pipe(v.string(), v.uuid()),
  uuid: v.pipe(v.string(), v.uuid()),
})

export type OrganizationMembership = v.InferOutput<typeof organizationMembershipSchema>
