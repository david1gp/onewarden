import * as v from "valibot"

export const cipherPasswordHistoryEntrySchema = v.object({
  password: v.string(),
  lastUsedDate: v.string(),
})

export type CipherPasswordHistoryEntry = v.InferOutput<typeof cipherPasswordHistoryEntrySchema>
