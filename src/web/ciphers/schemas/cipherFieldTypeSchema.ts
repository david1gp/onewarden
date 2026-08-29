import * as v from "valibot"

export const cipherFieldTypeSchema = v.picklist([0, 1, 2, 3])

export type CipherFieldType = v.InferOutput<typeof cipherFieldTypeSchema>
