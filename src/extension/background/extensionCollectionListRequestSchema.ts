import * as v from "valibot"

export const extensionCollectionListRequestSchema = v.strictObject({
  organizationId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
})

export type ExtensionCollectionListRequest = v.InferOutput<typeof extensionCollectionListRequestSchema>
