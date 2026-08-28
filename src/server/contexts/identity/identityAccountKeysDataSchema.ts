import * as v from "valibot"

export const identityAccountKeysDataSchema = v.object({
  encryptedPrivateKey: v.string(),
  publicKey: v.string(),
})

export type IdentityAccountKeysData = v.InferOutput<typeof identityAccountKeysDataSchema>
