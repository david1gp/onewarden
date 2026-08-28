import * as v from "valibot"

export const collectionIdSchema = v.pipe(v.string(), v.uuid())

export type CollectionId = v.InferOutput<typeof collectionIdSchema>
