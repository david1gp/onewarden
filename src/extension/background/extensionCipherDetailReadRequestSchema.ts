import * as v from "valibot"

const extensionCipherDetailReadRequestSchemaData = v.strictObject({
  cipherId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
})

export const extensionCipherDetailReadRequestSchema = extensionCipherDetailReadRequestSchemaData

export type ExtensionCipherDetailReadRequest = v.InferOutput<typeof extensionCipherDetailReadRequestSchema>
