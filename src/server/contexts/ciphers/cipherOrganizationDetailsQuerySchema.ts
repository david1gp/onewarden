import * as v from "valibot"
import { organizationIdSchema } from "../organizations/organizationIdSchema.js"

export const cipherOrganizationDetailsQuerySchema = v.object({
  organizationId: organizationIdSchema,
})

export type CipherOrganizationDetailsQuery = v.InferOutput<typeof cipherOrganizationDetailsQuerySchema>
