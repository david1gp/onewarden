import * as v from "valibot"
import { extensionCipherSchema } from "../crypto/extensionCipherSchema.js"

export const extensionCipherCreateRequestSchema = v.strictObject({
  cipher: extensionCipherSchema,
})

export type ExtensionCipherCreateRequest = v.InferOutput<typeof extensionCipherCreateRequestSchema>
