import * as v from "valibot"

const organizationExportValueSchema = v.record(v.string(), v.unknown())

export const organizationExportResponseSchema = v.strictObject({
  ciphers: v.array(organizationExportValueSchema),
  collections: v.array(organizationExportValueSchema),
})

export type OrganizationExportResponse = v.InferOutput<typeof organizationExportResponseSchema>
