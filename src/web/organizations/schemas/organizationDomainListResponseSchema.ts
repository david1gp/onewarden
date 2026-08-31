import * as v from "valibot"
import { organizationDomainSchema } from "./organizationDomainSchema.js"

export const organizationDomainListResponseSchema = v.object({
  data: v.optional(v.nullable(v.array(organizationDomainSchema))),
})

export type OrganizationDomainListResponse = v.InferOutput<typeof organizationDomainListResponseSchema>
