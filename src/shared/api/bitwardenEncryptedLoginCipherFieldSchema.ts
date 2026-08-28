import * as v from "valibot"

export const bitwardenEncryptedLoginCipherFieldSchema = v.looseObject({
  name: v.nullable(v.string()),
  value: v.nullable(v.string()),
  type: v.number(),
  linkedId: v.nullable(v.number()),
})

export type BitwardenEncryptedLoginCipherField = v.InferOutput<typeof bitwardenEncryptedLoginCipherFieldSchema>
