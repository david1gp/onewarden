import * as v from "valibot"

export const extensionCipherRestoreRequestSchema = v.strictObject({
  cipherId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
})

export type ExtensionCipherRestoreRequest = v.InferOutput<typeof extensionCipherRestoreRequestSchema>
