import * as v from "valibot"
import { organizationCollectionAccessSchema } from "./organizationCollectionAccessSchema.js"

export const organizationCollectionSchema = v.object({
  externalId: v.optional(v.nullable(v.string())),
  groups: v.optional(v.array(organizationCollectionAccessSchema)),
  hidePasswords: v.optional(v.boolean()),
  id: v.string(),
  manage: v.optional(v.boolean()),
  manageAll: v.optional(v.boolean()),
  name: v.string(),
  organizationId: v.string(),
  readOnly: v.optional(v.boolean()),
  users: v.optional(v.array(organizationCollectionAccessSchema)),
})

export type OrganizationCollection = v.InferOutput<typeof organizationCollectionSchema>
