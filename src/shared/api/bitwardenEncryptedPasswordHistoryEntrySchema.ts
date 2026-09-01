import * as v from "valibot"

export const bitwardenEncryptedPasswordHistoryEntrySchema = v.looseObject({
  password: v.string(),
  lastUsedDate: v.string(),
})

export type BitwardenEncryptedPasswordHistoryEntry = v.InferOutput<
  typeof bitwardenEncryptedPasswordHistoryEntrySchema
>
