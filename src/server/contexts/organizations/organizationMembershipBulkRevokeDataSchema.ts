import * as v from "valibot"
import { organizationIdSchema } from "./organizationIdSchema.js"

export const organizationMembershipBulkRevokeDataSchema = v.object({ ids: v.optional(v.array(organizationIdSchema)) })

export type OrganizationMembershipBulkRevokeData = v.InferOutput<typeof organizationMembershipBulkRevokeDataSchema>
