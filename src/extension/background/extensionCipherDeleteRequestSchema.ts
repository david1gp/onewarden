import * as v from "valibot"

export const extensionCipherDeleteRequestSchema = v.strictObject({
  cipherId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  hard: v.optional(v.boolean(), false),
})

export type ExtensionCipherDeleteRequest = v.InferOutput<typeof extensionCipherDeleteRequestSchema>
