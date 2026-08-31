import * as v from "valibot"

const commonFields = {
  version: v.literal(1),
  token: v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{43}$/u)),
  transferKey: v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{43}$/u)),
}

export const sessionHandoffFragmentSchema = v.variant("operation", [
  v.strictObject({ ...commonFields, operation: v.literal("create"), cipherId: v.null() }),
  v.strictObject({
    ...commonFields,
    operation: v.literal("edit"),
    cipherId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  }),
])

export type SessionHandoffFragment = v.InferOutput<typeof sessionHandoffFragmentSchema>
