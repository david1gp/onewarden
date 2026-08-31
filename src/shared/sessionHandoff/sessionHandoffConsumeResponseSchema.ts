import * as v from "valibot"
import { sessionHandoffEncryptedUserKeySchema } from "./sessionHandoffEncryptedUserKeySchema.js"

const sessionFields = {
  accessToken: v.pipe(v.string(), v.minLength(1)),
  refreshToken: v.pipe(v.string(), v.minLength(1)),
  expiresIn: v.pipe(v.number(), v.integer(), v.minValue(1)),
  email: v.pipe(v.string(), v.minLength(1)),
  userId: v.pipe(v.string(), v.minLength(1)),
  kdf: v.number(),
  kdfIterations: v.number(),
  kdfMemory: v.nullable(v.number()),
  kdfParallelism: v.nullable(v.number()),
  encryptedUserKey: v.pipe(v.string(), v.minLength(1)),
  userKeyTransfer: sessionHandoffEncryptedUserKeySchema,
}

export const sessionHandoffConsumeResponseSchema = v.variant("operation", [
  v.strictObject({ ...sessionFields, operation: v.literal("create"), cipherId: v.null() }),
  v.strictObject({
    ...sessionFields,
    operation: v.literal("edit"),
    cipherId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  }),
])

export type SessionHandoffConsumeResponse = v.InferOutput<typeof sessionHandoffConsumeResponseSchema>
