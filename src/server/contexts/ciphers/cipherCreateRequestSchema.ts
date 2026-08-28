import * as v from "valibot"
import { cipherDataSchema } from "./cipherDataSchema.js"

export const cipherCreateRequestSchema = v.union([cipherDataSchema, v.object({ cipher: cipherDataSchema })])

export type CipherCreateRequest = v.InferOutput<typeof cipherCreateRequestSchema>
