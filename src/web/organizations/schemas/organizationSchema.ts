import * as v from "valibot"

export const organizationSchema = v.object({
  billingEmail: v.nullable(v.string()),
  hasPublicAndPrivateKeys: v.optional(v.boolean()),
  id: v.string(),
  identifier: v.optional(v.nullable(v.string())),
  key: v.optional(v.nullable(v.string())),
  maxCollections: v.optional(v.nullable(v.number())),
  maxStorageGb: v.optional(v.nullable(v.number())),
  name: v.string(),
  planType: v.optional(v.number()),
  seats: v.optional(v.nullable(v.number())),
  status: v.optional(v.number()),
  type: v.optional(v.number()),
})

export type Organization = v.InferOutput<typeof organizationSchema>
