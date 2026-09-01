import * as v from "valibot"

const extensionCipherPartialRequestDataSchema = v.strictObject({
  cipherId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  favorite: v.optional(v.boolean()),
  folderId: v.optional(v.nullable(v.pipe(v.string(), v.minLength(1), v.maxLength(128)))),
})

export const extensionCipherPartialRequestSchema = v.pipe(
  extensionCipherPartialRequestDataSchema,
  v.check(
    (request) => request.favorite !== undefined || request.folderId !== undefined,
    "At least one partial cipher field is required.",
  ),
)

export type ExtensionCipherPartialRequest = v.InferOutput<typeof extensionCipherPartialRequestSchema>
