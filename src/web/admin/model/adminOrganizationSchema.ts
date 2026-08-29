import * as v from "valibot"

export const adminOrganizationSchema = v.object({
  id: v.string(),
  name: v.string(),
  user_count: v.optional(v.number()),
  cipher_count: v.optional(v.number()),
  collection_count: v.optional(v.number()),
  group_count: v.optional(v.number()),
  event_count: v.optional(v.number()),
  storage_bytes: v.optional(v.number()),
  attachment_count: v.optional(v.number()),
})

export type AdminOrganization = v.InferOutput<typeof adminOrganizationSchema>
