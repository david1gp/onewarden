import * as v from "valibot"
import { cipherFieldTypeSchema } from "./cipherFieldTypeSchema.js"

export const cipherCustomFieldSchema = v.object({
  name: v.string(),
  value: v.string(),
  type: cipherFieldTypeSchema,
  linkedId: v.optional(v.nullable(v.number())),
})

export type CipherCustomField = v.InferOutput<typeof cipherCustomFieldSchema>
