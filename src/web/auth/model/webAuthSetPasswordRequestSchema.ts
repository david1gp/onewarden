import * as v from "valibot"

/**
 * Request body for `POST /api/accounts/set-password`, used for the SSO first-login master-password
 * setup. `orgIdentifier` is intentionally omitted: the browser flow never enrolls an organization.
 */
export const webAuthSetPasswordRequestSchema = v.object({
  accessToken: v.pipe(v.string(), v.minLength(1)),
  masterPasswordHash: v.pipe(v.string(), v.minLength(1)),
  userSymmetricKey: v.pipe(v.string(), v.minLength(1)),
  masterPasswordHint: v.optional(v.nullable(v.string()), null),
  kdf: v.pipe(v.number(), v.integer()),
  kdfIterations: v.pipe(v.number(), v.integer(), v.minValue(1)),
  kdfMemory: v.optional(v.nullable(v.pipe(v.number(), v.integer())), null),
  kdfParallelism: v.optional(v.nullable(v.pipe(v.number(), v.integer())), null),
  keys: v.object({
    encryptedPrivateKey: v.pipe(v.string(), v.minLength(1)),
    publicKey: v.pipe(v.string(), v.minLength(1)),
  }),
})

export type WebAuthSetPasswordRequestInput = v.InferInput<typeof webAuthSetPasswordRequestSchema>
export type WebAuthSetPasswordRequest = v.InferOutput<typeof webAuthSetPasswordRequestSchema>
