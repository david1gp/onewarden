import * as v from "valibot"

const base64UrlSchema = v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]+$/u))

export const sessionHandoffEncryptedUserKeySchema = v.strictObject({
  algorithm: v.literal("AES-GCM"),
  iv: v.pipe(base64UrlSchema, v.length(16)),
  ciphertext: v.pipe(base64UrlSchema, v.maxLength(256)),
})

export type SessionHandoffEncryptedUserKey = v.InferOutput<typeof sessionHandoffEncryptedUserKeySchema>
