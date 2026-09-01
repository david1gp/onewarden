import * as v from "valibot"

export const extensionCipherFillRequestSchema = v.strictObject({
  cipherId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  cipherType: v.picklist([3, 4]),
  frameId: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
})

export type ExtensionCipherFillRequest = v.InferOutput<typeof extensionCipherFillRequestSchema>
