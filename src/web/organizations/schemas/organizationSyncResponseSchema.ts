import * as v from "valibot"
import { organizationSchema } from "./organizationSchema.js"

const organizationSyncOrganizationSchema = v.object({
  ...organizationSchema.entries,
  billingEmail: v.optional(organizationSchema.entries.billingEmail),
})

export const organizationSyncResponseSchema = v.object({
  profile: v.optional(
    v.nullable(
      v.object({
        organizations: v.optional(v.nullable(v.array(organizationSyncOrganizationSchema))),
      }),
    ),
  ),
})

export type OrganizationSyncResponse = v.InferOutput<typeof organizationSyncResponseSchema>
