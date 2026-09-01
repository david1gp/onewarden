import * as v from "valibot"
import { extensionBackgroundCipherSummarySchema } from "./extensionBackgroundCipherSummarySchema.js"
import { extensionBackgroundCollectionDtoSchema } from "./extensionBackgroundCollectionDtoSchema.js"
import { extensionBackgroundFolderDtoSchema } from "./extensionBackgroundFolderDtoSchema.js"

export const extensionVaultSearchResultSchema = v.strictObject({
  ciphers: v.array(extensionBackgroundCipherSummarySchema),
  folders: v.array(extensionBackgroundFolderDtoSchema),
  collections: v.array(extensionBackgroundCollectionDtoSchema),
})

export type ExtensionVaultSearchResult = v.InferOutput<typeof extensionVaultSearchResultSchema>
