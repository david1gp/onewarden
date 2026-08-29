import * as v from "valibot"

export const cipherSecureNoteDataSchema = v.object({
  type: v.optional(v.nullable(v.number())),
})

export type CipherSecureNoteData = v.InferOutput<typeof cipherSecureNoteDataSchema>
