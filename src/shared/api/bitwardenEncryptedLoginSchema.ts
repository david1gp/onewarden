import * as v from "valibot"
import { bitwardenEncryptedLoginCipherUriSchema } from "./bitwardenEncryptedLoginCipherUriSchema.js"

export const bitwardenEncryptedLoginSchema = v.looseObject({
  username: v.nullable(v.string()),
  password: v.nullable(v.string()),
  uris: v.array(bitwardenEncryptedLoginCipherUriSchema),
  uri: v.optional(v.nullable(v.string())),
  totp: v.nullable(v.string()),
})

export type BitwardenEncryptedLogin = v.InferOutput<typeof bitwardenEncryptedLoginSchema>
