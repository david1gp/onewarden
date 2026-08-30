import * as v from "valibot"

export const identityAuthRequestDataSchema = v.object({
  accessCode: v.string(),
  deviceIdentifier: v.string(),
  email: v.string(),
  publicKey: v.string(),
})

export type IdentityAuthRequestData = v.InferOutput<typeof identityAuthRequestDataSchema>
