import * as v from "valibot"

export const organizationWorkspaceIdentifierSchema = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128))

export type OrganizationWorkspaceIdentifier = v.InferOutput<typeof organizationWorkspaceIdentifierSchema>
