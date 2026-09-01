import * as v from "valibot"

export const extensionCipherSecureNoteSchema = v.looseObject({
  type: v.optional(v.nullable(v.number())),
})

export type ExtensionCipherSecureNote = v.InferOutput<typeof extensionCipherSecureNoteSchema>
