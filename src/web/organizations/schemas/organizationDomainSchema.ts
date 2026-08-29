import * as v from "valibot"

export const organizationDomainSchema = v.object({
  creationDate: v.string(),
  domainName: v.string(),
  id: v.string(),
  jobRunCount: v.optional(v.number()),
  lastCheckedDate: v.optional(v.nullable(v.string())),
  nextRunDate: v.optional(v.nullable(v.string())),
  organizationId: v.string(),
  txt: v.string(),
  verifiedDate: v.optional(v.nullable(v.string())),
})

export type OrganizationDomain = v.InferOutput<typeof organizationDomainSchema>
