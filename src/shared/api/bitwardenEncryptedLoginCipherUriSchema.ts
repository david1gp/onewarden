import * as v from "valibot"

export const bitwardenEncryptedLoginCipherUriSchema = v.looseObject({
  uri: v.nullable(v.string()),
  match: v.nullish(v.number()),
})

export type BitwardenEncryptedLoginCipherUri = v.InferOutput<typeof bitwardenEncryptedLoginCipherUriSchema>
