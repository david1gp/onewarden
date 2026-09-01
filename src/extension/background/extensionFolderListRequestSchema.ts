import * as v from "valibot"

export const extensionFolderListRequestSchema = v.strictObject({})

export type ExtensionFolderListRequest = v.InferOutput<typeof extensionFolderListRequestSchema>
