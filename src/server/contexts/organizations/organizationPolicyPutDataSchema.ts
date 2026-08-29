import * as v from "valibot"
import { organizationPolicyDataSchema } from "./organizationPolicyDataSchema.js"

export const organizationPolicyPutDataSchema = v.object({
  policy: organizationPolicyDataSchema,
})

export type OrganizationPolicyPutData = v.InferOutput<typeof organizationPolicyPutDataSchema>
