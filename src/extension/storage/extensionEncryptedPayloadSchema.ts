import * as v from "valibot"

const encryptedStringSchema = v.pipe(v.string(), v.minLength(1))

export const extensionEncryptedPayloadSchema = v.strictObject({
  algorithm: encryptedStringSchema,
  iv: encryptedStringSchema,
  ciphertext: encryptedStringSchema,
})

export type ExtensionEncryptedPayload = v.InferOutput<typeof extensionEncryptedPayloadSchema>
