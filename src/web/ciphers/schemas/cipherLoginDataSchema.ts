import * as v from "valibot"
import { bitwardenFido2CredentialSchema } from "../../../shared/api/bitwardenFido2CredentialSchema.js"

export const cipherLoginDataSchema = v.object({
  username: v.optional(v.nullable(v.string())),
  password: v.optional(v.nullable(v.string())),
  totp: v.optional(v.nullable(v.string())),
  uris: v.optional(
    v.nullable(
      v.array(
        v.object({
          uri: v.string(),
          match: v.optional(v.nullable(v.number())),
        }),
      ),
    ),
  ),
  passwordRevisionDate: v.optional(v.nullable(v.string())),
  fido2Credentials: v.optional(v.nullable(v.array(bitwardenFido2CredentialSchema))),
})

export type CipherLoginData = v.InferOutput<typeof cipherLoginDataSchema>
