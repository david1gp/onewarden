import * as v from "valibot"
import { groupIdSchema } from "./groupIdSchema.js"

export const organizationGroupIdsDataSchema = v.object({ ids: v.array(groupIdSchema) })

export type OrganizationGroupIdsData = v.InferOutput<typeof organizationGroupIdsDataSchema>
