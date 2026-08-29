import * as v from "valibot"
import { organizationCollectionAccessDataSchema } from "./organizationCollectionAccessDataSchema.js"

export const organizationGroupRequestDataSchema = v.object({
  accessAll: v.optional(v.boolean(), false),
  collections: v.array(organizationCollectionAccessDataSchema),
  externalId: v.optional(v.nullable(v.string())),
  name: v.string(),
  users: v.array(v.pipe(v.string(), v.uuid())),
})

export type OrganizationGroupRequestData = v.InferOutput<typeof organizationGroupRequestDataSchema>
