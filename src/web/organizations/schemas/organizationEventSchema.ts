import * as v from "valibot"

export const organizationEventSchema = v.object({
  actingUserId: v.optional(v.nullable(v.string())),
  cipherId: v.optional(v.nullable(v.string())),
  collectionId: v.optional(v.nullable(v.string())),
  date: v.string(),
  deviceType: v.optional(v.nullable(v.number())),
  groupId: v.optional(v.nullable(v.string())),
  ipAddress: v.optional(v.nullable(v.string())),
  organizationId: v.optional(v.nullable(v.string())),
  organizationUserId: v.optional(v.nullable(v.string())),
  policyId: v.optional(v.nullable(v.string())),
  providerId: v.optional(v.nullable(v.string())),
  providerOrganizationId: v.optional(v.nullable(v.string())),
  providerUserId: v.optional(v.nullable(v.string())),
  type: v.number(),
  userId: v.optional(v.nullable(v.string())),
})

export type OrganizationEvent = v.InferOutput<typeof organizationEventSchema>
