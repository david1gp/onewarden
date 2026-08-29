import * as v from "valibot"

export const organizationCollectionAccessSchema = v.object({
  hidePasswords: v.boolean(),
  id: v.string(),
  manage: v.boolean(),
  name: v.optional(v.string()),
  readOnly: v.boolean(),
})

export type OrganizationCollectionAccess = v.InferOutput<typeof organizationCollectionAccessSchema>
