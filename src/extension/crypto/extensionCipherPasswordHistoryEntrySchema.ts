import * as v from "valibot"

export const extensionCipherPasswordHistoryEntrySchema = v.looseObject({
  password: v.string(),
  lastUsedDate: v.string(),
})

export type ExtensionCipherPasswordHistoryEntry = v.InferOutput<typeof extensionCipherPasswordHistoryEntrySchema>
