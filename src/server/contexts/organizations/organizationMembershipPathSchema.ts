import * as v from "valibot"
import { organizationIdSchema } from "./organizationIdSchema.js"

export const organizationMembershipPathSchema = v.object({
  member_id: v.pipe(v.string(), v.uuid()),
  org_id: organizationIdSchema,
})

export type OrganizationMembershipPath = v.InferOutput<typeof organizationMembershipPathSchema>
