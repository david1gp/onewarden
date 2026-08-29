import * as v from "valibot"
import { organizationCollectionAccessSchema } from "./organizationCollectionAccessSchema.js"

export const organizationMemberInviteInputSchema = v.object({
  accessAll: v.boolean(),
  collections: v.optional(v.array(organizationCollectionAccessSchema)),
  emails: v.pipe(v.array(v.pipe(v.string(), v.email())), v.minLength(1, "At least one email is required")),
  groups: v.optional(v.array(v.string())),
  type: v.number(),
})

export type OrganizationMemberInviteInput = v.InferOutput<typeof organizationMemberInviteInputSchema>
