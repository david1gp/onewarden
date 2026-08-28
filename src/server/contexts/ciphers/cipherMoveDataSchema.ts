import * as v from "valibot"

export const cipherMoveDataSchema = v.object({
  folderId: v.optional(v.nullable(v.string())),
  ids: v.array(v.string()),
})

export type CipherMoveData = v.InferOutput<typeof cipherMoveDataSchema>
