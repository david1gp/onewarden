import * as v from "valibot"
import { organizationIdSchema } from "./organizationIdSchema.js"

export const organizationMembershipBulkIdsDataSchema = v.object({ ids: v.array(organizationIdSchema) })

export type OrganizationMembershipBulkIdsData = v.InferOutput<typeof organizationMembershipBulkIdsDataSchema>
