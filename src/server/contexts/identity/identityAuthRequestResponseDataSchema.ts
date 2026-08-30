import * as v from "valibot"

export const identityAuthRequestResponseDataSchema = v.object({
  deviceIdentifier: v.string(),
  key: v.string(),
  masterPasswordHash: v.nullable(v.string()),
  requestApproved: v.boolean(),
})

export type IdentityAuthRequestResponseData = v.InferOutput<typeof identityAuthRequestResponseDataSchema>
