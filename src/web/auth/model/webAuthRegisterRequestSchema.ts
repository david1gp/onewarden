import * as v from "valibot"

export const webAuthRegisterRequestSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.toLowerCase()),
  masterPasswordHash: v.string(),
  userSymmetricKey: v.string(),
  masterPasswordHint: v.optional(v.nullable(v.string()), null),
  name: v.optional(v.nullable(v.string()), null),
  kdf: v.optional(v.number(), 0),
  kdfIterations: v.optional(v.number(), 600_000),
  kdfMemory: v.optional(v.nullable(v.number()), null),
  kdfParallelism: v.optional(v.nullable(v.number()), null),
  keys: v.optional(
    v.nullable(
      v.object({
        encryptedPrivateKey: v.string(),
        publicKey: v.string(),
      }),
    ),
    null,
  ),
})

export type WebAuthRegisterRequest = v.InferOutput<typeof webAuthRegisterRequestSchema>
export type WebAuthRegisterRequestInput = v.InferInput<typeof webAuthRegisterRequestSchema>
