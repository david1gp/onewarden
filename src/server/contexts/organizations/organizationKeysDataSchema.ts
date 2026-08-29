import * as v from "valibot"

export const organizationKeysDataSchema = v.object({
  encryptedPrivateKey: v.string(),
  publicKey: v.string(),
})

export type OrganizationKeysData = v.InferOutput<typeof organizationKeysDataSchema>
