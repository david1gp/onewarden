import * as v from "valibot"

const organizationDeleteOptionalStringSchema = v.nullish(v.string())

export const organizationDeleteDataSchema = v.object({
  masterPasswordHash: organizationDeleteOptionalStringSchema,
  MasterPasswordHash: organizationDeleteOptionalStringSchema,
  otp: organizationDeleteOptionalStringSchema,
})

export type OrganizationDeleteData = v.InferOutput<typeof organizationDeleteDataSchema>
