import * as v from "valibot"

export const extensionAccountVerificationEmailSendRequestSchema = v.strictObject({
  email: v.pipe(v.string(), v.trim(), v.toLowerCase(), v.email("Enter a valid email address.")),
  name: v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(100))), null),
})

export type ExtensionAccountVerificationEmailSendRequest = v.InferOutput<
  typeof extensionAccountVerificationEmailSendRequestSchema
>
