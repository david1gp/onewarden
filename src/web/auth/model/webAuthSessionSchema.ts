import * as v from "valibot"

export const webAuthSessionSchema = v.object({
  email: v.pipe(v.string(), v.minLength(1)),
  accessToken: v.pipe(v.string(), v.minLength(1)),
  refreshToken: v.pipe(v.string(), v.minLength(1)),
  tokenType: v.literal("Bearer"),
  expiresAt: v.number(),
  userId: v.pipe(v.string(), v.minLength(1)),
  kdf: v.number(),
  kdfIterations: v.number(),
  kdfMemory: v.nullable(v.number()),
  kdfParallelism: v.nullable(v.number()),
  encryptedUserKey: v.pipe(v.string(), v.minLength(1)),
})

export type WebAuthSession = v.InferOutput<typeof webAuthSessionSchema>
