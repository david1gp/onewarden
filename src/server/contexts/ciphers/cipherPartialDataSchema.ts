import * as v from "valibot"

export const cipherPartialDataSchema = v.object({
  folderId: v.optional(v.nullable(v.string())),
  favorite: v.boolean(),
})

export type CipherPartialData = v.InferOutput<typeof cipherPartialDataSchema>
