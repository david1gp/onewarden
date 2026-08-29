import * as v from "valibot"

const organizationMembershipUpdateCollectionSchema = v.object({
  hidePasswords: v.boolean(),
  id: v.string(),
  manage: v.boolean(),
  readOnly: v.boolean(),
})
const organizationMembershipUpdatePermissionSchema = v.record(v.string(), v.unknown())

export const organizationMembershipUpdateDataSchema = v.object({
  collections: v.nullish(v.array(organizationMembershipUpdateCollectionSchema)),
  groups: v.nullish(v.array(v.string())),
  permissions: v.optional(organizationMembershipUpdatePermissionSchema),
  type: v.union([v.number(), v.string()]),
})

export type OrganizationMembershipUpdateData = v.InferOutput<typeof organizationMembershipUpdateDataSchema>
