import * as v from "valibot"

const organizationMembershipInvitePermissionSchema = v.record(v.string(), v.unknown())
const organizationMembershipInviteCollectionSchema = v.object({
  hidePasswords: v.boolean(),
  id: v.string(),
  manage: v.boolean(),
  readOnly: v.boolean(),
})

export const organizationMembershipInviteDataSchema = v.object({
  collections: v.nullish(v.array(organizationMembershipInviteCollectionSchema)),
  emails: v.array(v.string()),
  groups: v.array(v.string()),
  permissions: v.optional(organizationMembershipInvitePermissionSchema),
  type: v.union([v.number(), v.string()]),
})

export type OrganizationMembershipInviteData = v.InferOutput<typeof organizationMembershipInviteDataSchema>
