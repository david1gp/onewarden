import * as v from "valibot"
import { bitwardenEncryptedCipherSchema } from "./bitwardenEncryptedCipherSchema.js"

export const bitwardenEncryptedCipherResponseSchema = bitwardenEncryptedCipherSchema

export type BitwardenEncryptedCipherResponse = v.InferOutput<typeof bitwardenEncryptedCipherResponseSchema>
