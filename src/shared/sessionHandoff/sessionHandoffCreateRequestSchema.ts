import * as v from "valibot"
import { sessionHandoffEncryptedUserKeySchema } from "./sessionHandoffEncryptedUserKeySchema.js"

const cipherIdSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(128))

export const sessionHandoffCreateRequestSchema = v.variant("operation", [
  v.strictObject({
    operation: v.literal("create"),
    cipherId: v.null(),
    encryptedUserKey: sessionHandoffEncryptedUserKeySchema,
  }),
  v.strictObject({
    operation: v.literal("edit"),
    cipherId: cipherIdSchema,
    encryptedUserKey: sessionHandoffEncryptedUserKeySchema,
  }),
])

export type SessionHandoffCreateRequest = v.InferOutput<typeof sessionHandoffCreateRequestSchema>
