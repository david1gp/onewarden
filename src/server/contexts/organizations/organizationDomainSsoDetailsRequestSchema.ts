import * as v from "valibot"

export const organizationDomainSsoDetailsRequestSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.minLength(1)),
})

export type OrganizationDomainSsoDetailsRequest = v.InferOutput<typeof organizationDomainSsoDetailsRequestSchema>
