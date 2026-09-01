import * as v from "valibot"

const extensionCipherMoveRequestDataSchema = v.strictObject({
  ids: v.pipe(
    v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(128))),
    v.minLength(1),
    v.check((ids) => new Set(ids).size === ids.length, "Cipher IDs must be unique."),
  ),
  folderId: v.optional(v.nullable(v.pipe(v.string(), v.minLength(1), v.maxLength(128))), null),
})

export const extensionCipherMoveRequestSchema = extensionCipherMoveRequestDataSchema

export type ExtensionCipherMoveRequest = v.InferOutput<typeof extensionCipherMoveRequestSchema>
