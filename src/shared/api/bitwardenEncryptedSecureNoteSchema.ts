import * as v from "valibot"

export const bitwardenEncryptedSecureNoteSchema = v.looseObject({
  type: v.optional(v.nullable(v.number())),
})

export type BitwardenEncryptedSecureNote = v.InferOutput<typeof bitwardenEncryptedSecureNoteSchema>
