import * as v from "valibot"
import { bitwardenEncryptedFido2CredentialSchema } from "./bitwardenEncryptedFido2CredentialSchema.js"
import { bitwardenEncryptedLoginCipherUriSchema } from "./bitwardenEncryptedLoginCipherUriSchema.js"

export const bitwardenEncryptedLoginSchema = v.looseObject({
  username: v.nullable(v.string()),
  password: v.nullable(v.string()),
  uris: v.array(bitwardenEncryptedLoginCipherUriSchema),
  uri: v.optional(v.nullable(v.string())),
  totp: v.nullable(v.string()),
  fido2Credentials: v.optional(v.nullable(v.array(bitwardenEncryptedFido2CredentialSchema))),
})

export type BitwardenEncryptedLogin = v.InferOutput<typeof bitwardenEncryptedLoginSchema>
