import * as v from "valibot"
import { extensionCipherSchema } from "../crypto/extensionCipherSchema.js"

export const extensionCipherUpdateRequestSchema = v.strictObject({
  cipherId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  cipher: extensionCipherSchema,
})

export type ExtensionCipherUpdateRequest = v.InferOutput<typeof extensionCipherUpdateRequestSchema>
