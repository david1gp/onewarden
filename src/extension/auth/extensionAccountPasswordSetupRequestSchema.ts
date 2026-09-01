import * as v from "valibot"

export const extensionAccountPasswordSetupRequestSchema = v.strictObject({
  accessToken: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(16_384)),
  email: v.pipe(v.string(), v.trim(), v.toLowerCase(), v.email("Enter a valid email address.")),
  masterPassword: v.pipe(
    v.string(),
    v.minLength(8, "Master password must be at least 8 characters."),
    v.maxLength(1_000),
  ),
  masterPasswordHint: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(100))), null),
  kdf: v.optional(v.literal(0), 0),
  kdfIterations: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1)), 600_000),
  kdfMemory: v.optional(v.null(), null),
  kdfParallelism: v.optional(v.null(), null),
})

export type ExtensionAccountPasswordSetupRequest = v.InferOutput<typeof extensionAccountPasswordSetupRequestSchema>
