import * as v from "valibot"
import { adminUserOrganizationRoleSchema } from "./adminUserOrganizationRoleSchema.js"

export const adminUserOrganizationMembershipSchema = v.object({
  id: v.string(),
  name: v.string(),
  role: adminUserOrganizationRoleSchema,
})

export type AdminUserOrganizationMembership = v.InferOutput<typeof adminUserOrganizationMembershipSchema>
