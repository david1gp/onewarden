import * as v from "valibot"
import { bitwardenEncryptedLoginCipherSchema } from "./bitwardenEncryptedLoginCipherSchema.js"

export const bitwardenEncryptedLoginCipherResponseSchema = bitwardenEncryptedLoginCipherSchema

export type BitwardenEncryptedLoginCipherResponse = v.InferOutput<typeof bitwardenEncryptedLoginCipherResponseSchema>
