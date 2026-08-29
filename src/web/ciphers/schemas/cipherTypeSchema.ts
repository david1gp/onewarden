import * as v from "valibot"

export const cipherTypeSchema = v.picklist([1, 2, 3, 4, 5])

export type CipherType = v.InferOutput<typeof cipherTypeSchema>
