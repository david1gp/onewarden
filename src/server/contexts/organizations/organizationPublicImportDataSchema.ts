import * as v from "valibot"

const organizationPublicImportGroupSchema = v.object({
  name: v.string(),
  externalId: v.string(),
  memberExternalIds: v.array(v.string()),
})

const organizationPublicImportMemberSchema = v.object({
  email: v.string(),
  externalId: v.string(),
  deleted: v.boolean(),
})

export const organizationPublicImportDataSchema = v.object({
  groups: v.array(organizationPublicImportGroupSchema),
  largeImport: v.optional(v.boolean()),
  members: v.array(organizationPublicImportMemberSchema),
  overwriteExisting: v.boolean(),
})

export type OrganizationPublicImportData = v.InferOutput<typeof organizationPublicImportDataSchema>
