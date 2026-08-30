import * as v from "valibot"
import { adminUserOrganizationMembershipSchema } from "./adminUserOrganizationMembershipSchema.js"

export const adminUserSchema = v.object({
  id: v.string(),
  name: v.string(),
  email: v.pipe(v.string(), v.email()),
  status: v.picklist(["active", "disabled", "invited"]),
  role: v.picklist(["owner", "admin", "user"]),
  twoFactorEnabled: v.boolean(),
  organizationCount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  organizations: v.optional(v.array(adminUserOrganizationMembershipSchema)),
  ssoIdentifier: v.optional(v.nullable(v.string())),
  emailVerified: v.optional(v.boolean()),
  cipherCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  attachmentCount: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  attachmentSizeBytes: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  lastActiveAt: v.nullable(v.string()),
  createdAt: v.string(),
  sessionsDeauthorizedAt: v.optional(v.nullable(v.string())),
  invitationSentAt: v.optional(v.nullable(v.string())),
  overridden: v.boolean(),
})

export type AdminUser = v.InferOutput<typeof adminUserSchema>
