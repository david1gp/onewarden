import * as v from "valibot"

const extensionProfileOrganizationSchema = v.looseObject({
  id: v.string(),
  key: v.optional(v.nullable(v.string())),
  status: v.optional(v.number()),
})

export const extensionProfileSchema = v.looseObject({
  organizations: v.optional(v.array(extensionProfileOrganizationSchema), []),
})

export type ExtensionProfile = v.InferOutput<typeof extensionProfileSchema>
