import * as v from "valibot"

export const extensionAccountRegisterRequestSchema = v.strictObject({
  email: v.pipe(v.string(), v.trim(), v.toLowerCase(), v.email("Enter a valid email address.")),
  masterPassword: v.pipe(
    v.string(),
    v.minLength(8, "Master password must be at least 8 characters."),
    v.maxLength(1_000),
  ),
  masterPasswordHint: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(100))), null),
  name: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(100))), null),
})

export type ExtensionAccountRegisterRequest = v.InferOutput<typeof extensionAccountRegisterRequestSchema>
