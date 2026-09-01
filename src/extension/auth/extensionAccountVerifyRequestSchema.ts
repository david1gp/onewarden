import * as v from "valibot"

export const extensionAccountVerifyRequestSchema = v.strictObject({
  userId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(128)),
  token: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(8_192)),
})

export type ExtensionAccountVerifyRequest = v.InferOutput<typeof extensionAccountVerifyRequestSchema>
