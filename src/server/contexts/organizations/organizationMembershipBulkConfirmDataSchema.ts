import * as v from "valibot"
import { organizationIdSchema } from "./organizationIdSchema.js"

const organizationMembershipBulkConfirmKeySchema = v.object({
  id: v.nullish(organizationIdSchema),
  key: v.nullish(v.string()),
})

export const organizationMembershipBulkConfirmDataSchema = v.object({
  keys: v.optional(v.array(organizationMembershipBulkConfirmKeySchema)),
})

export type OrganizationMembershipBulkConfirmData = v.InferOutput<typeof organizationMembershipBulkConfirmDataSchema>
