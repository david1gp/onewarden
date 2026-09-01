import * as v from "valibot"

export const extensionCipherCollectionsUpdateRequestSchema = v.strictObject({
  cipherId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  collectionIds: v.pipe(
    v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(128))),
    v.check((ids) => new Set(ids).size === ids.length, "Collection IDs must be unique."),
  ),
})

export type ExtensionCipherCollectionsUpdateRequest = v.InferOutput<
  typeof extensionCipherCollectionsUpdateRequestSchema
>
