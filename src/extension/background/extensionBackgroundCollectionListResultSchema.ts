import * as v from "valibot"
import { extensionBackgroundCollectionDtoSchema } from "./extensionBackgroundCollectionDtoSchema.js"

export const extensionBackgroundCollectionListResultSchema = v.array(extensionBackgroundCollectionDtoSchema)

export type ExtensionBackgroundCollectionListResult = v.InferOutput<
  typeof extensionBackgroundCollectionListResultSchema
>
