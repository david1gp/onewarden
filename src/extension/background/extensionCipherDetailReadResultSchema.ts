import * as v from "valibot"
import { extensionCipherSchema } from "../crypto/extensionCipherSchema.js"

export const extensionCipherDetailReadResultSchema = v.pipe(
  extensionCipherSchema,
  v.check((value) => value.object === "cipherDetails", "Cipher detail response is required."),
)

export type ExtensionCipherDetailReadResult = v.InferOutput<typeof extensionCipherDetailReadResultSchema>
