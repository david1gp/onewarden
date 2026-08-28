import * as v from "valibot"

export const organizationIdSchema = v.pipe(v.string(), v.uuid())

export type OrganizationId = v.InferOutput<typeof organizationIdSchema>
