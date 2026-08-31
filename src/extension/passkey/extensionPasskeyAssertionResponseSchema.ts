import * as v from "valibot"

export const extensionPasskeyAssertionResponseSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  rawId: v.pipe(v.string(), v.minLength(1)),
  response: v.strictObject({
    clientDataJSON: v.pipe(v.string(), v.minLength(1)),
    authenticatorData: v.pipe(v.string(), v.minLength(1)),
    signature: v.pipe(v.string(), v.minLength(1)),
    userHandle: v.nullable(v.string()),
  }),
  authenticatorAttachment: v.literal("platform"),
  clientExtensionResults: v.strictObject({}),
  type: v.literal("public-key"),
})

export type ExtensionPasskeyAssertionResponse = v.InferOutput<typeof extensionPasskeyAssertionResponseSchema>
