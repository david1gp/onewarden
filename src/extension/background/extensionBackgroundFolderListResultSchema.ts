import * as v from "valibot"
import { extensionBackgroundFolderDtoSchema } from "./extensionBackgroundFolderDtoSchema.js"

export const extensionBackgroundFolderListResultSchema = v.array(extensionBackgroundFolderDtoSchema)

export type ExtensionBackgroundFolderListResult = v.InferOutput<typeof extensionBackgroundFolderListResultSchema>
