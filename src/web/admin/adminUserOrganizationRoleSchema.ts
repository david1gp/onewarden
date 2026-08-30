import * as v from "valibot"

export const adminUserOrganizationRoleSchema = v.picklist(["user", "manager", "admin", "owner"])

export type AdminUserOrganizationRole = v.InferOutput<typeof adminUserOrganizationRoleSchema>
