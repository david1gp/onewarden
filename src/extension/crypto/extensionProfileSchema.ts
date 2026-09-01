import * as v from "valibot"

const extensionProfileOrganizationSchema = v.looseObject({
  accessAll: v.optional(v.boolean()),
  id: v.string(),
  key: v.optional(v.nullable(v.string())),
  name: v.optional(v.string()),
  permissions: v.optional(
    v.looseObject({
      createNewCollections: v.optional(v.boolean()),
      deleteAnyCollection: v.optional(v.boolean()),
      editAnyCollection: v.optional(v.boolean()),
    }),
  ),
  status: v.optional(v.number()),
  type: v.optional(v.number()),
})

export const extensionProfileSchema = v.looseObject({
  organizations: v.optional(v.array(extensionProfileOrganizationSchema), []),
})

export type ExtensionProfile = v.InferOutput<typeof extensionProfileSchema>
