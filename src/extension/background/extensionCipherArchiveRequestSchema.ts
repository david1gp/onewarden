import * as v from "valibot"

export const extensionCipherArchiveRequestSchema = v.strictObject({
  cipherId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  archived: v.optional(v.boolean(), true),
})

export type ExtensionCipherArchiveRequest = v.InferOutput<typeof extensionCipherArchiveRequestSchema>
