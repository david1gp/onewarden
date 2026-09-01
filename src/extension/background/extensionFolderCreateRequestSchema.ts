import * as v from "valibot"
import { extensionFolderSchema } from "../crypto/extensionFolderSchema.js"

export const extensionFolderCreateRequestSchema = v.strictObject({
  folder: extensionFolderSchema,
})

export type ExtensionFolderCreateRequest = v.InferOutput<typeof extensionFolderCreateRequestSchema>
