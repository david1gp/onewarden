import * as v from "valibot"

export const identityAuthRequestResponsePathSchema = v.object({
  auth_request_id: v.pipe(v.string(), v.uuid()),
})

export type IdentityAuthRequestResponsePath = v.InferOutput<typeof identityAuthRequestResponsePathSchema>
