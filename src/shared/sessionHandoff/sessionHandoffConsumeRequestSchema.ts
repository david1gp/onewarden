import * as v from "valibot"

const cipherIdSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(128))
const deviceIdentifierSchema = v.pipe(v.string(), v.minLength(1), v.maxLength(128))

export const sessionHandoffConsumeRequestSchema = v.variant("operation", [
  v.strictObject({
    operation: v.literal("create"),
    cipherId: v.null(),
    deviceIdentifier: deviceIdentifierSchema,
  }),
  v.strictObject({
    operation: v.literal("edit"),
    cipherId: cipherIdSchema,
    deviceIdentifier: deviceIdentifierSchema,
  }),
])

export type SessionHandoffConsumeRequest = v.InferOutput<typeof sessionHandoffConsumeRequestSchema>
