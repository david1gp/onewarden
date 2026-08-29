import * as v from "valibot"
import { organizationIdSchema } from "./organizationIdSchema.js"

export const organizationMembershipConfirmDataSchema = v.object({
  id: v.nullish(organizationIdSchema),
  key: v.nullish(v.string()),
})

export type OrganizationMembershipConfirmData = v.InferOutput<typeof organizationMembershipConfirmDataSchema>
