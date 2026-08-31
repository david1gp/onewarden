import * as v from "valibot"

export const extensionPasskeyRegistrationResponseSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1)),
  rawId: v.pipe(v.string(), v.minLength(1)),
  response: v.strictObject({
    clientDataJSON: v.pipe(v.string(), v.minLength(1)),
    authenticatorData: v.pipe(v.string(), v.minLength(1)),
    attestationObject: v.pipe(v.string(), v.minLength(1)),
    transports: v.array(v.literal("internal")),
    publicKey: v.pipe(v.string(), v.minLength(1)),
    publicKeyAlgorithm: v.literal(-7),
  }),
  authenticatorAttachment: v.literal("platform"),
  clientExtensionResults: v.strictObject({}),
  type: v.literal("public-key"),
})

export type ExtensionPasskeyRegistrationResponse = v.InferOutput<typeof extensionPasskeyRegistrationResponseSchema>
