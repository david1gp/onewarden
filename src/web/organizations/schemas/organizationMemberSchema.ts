import * as v from "valibot"
import { organizationCollectionAccessSchema } from "./organizationCollectionAccessSchema.js"

export const organizationMemberSchema = v.object({
  accessAll: v.boolean(),
  collections: v.optional(v.array(organizationCollectionAccessSchema)),
  email: v.string(),
  externalId: v.optional(v.nullable(v.string())),
  groups: v.optional(v.array(v.string())),
  id: v.string(),
  name: v.optional(v.nullable(v.string())),
  status: v.number(),
  twoFactorEnabled: v.optional(v.boolean()),
  type: v.number(),
  userId: v.optional(v.nullable(v.string())),
})

export type OrganizationMember = v.InferOutput<typeof organizationMemberSchema>
