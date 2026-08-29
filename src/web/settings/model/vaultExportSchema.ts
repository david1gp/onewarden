import * as v from "valibot"

export const vaultExportFormatSchema = v.union([
  v.literal("json-decrypted"),
  v.literal("csv-decrypted"),
  v.literal("json-encrypted"),
])

export type VaultExportFormat = v.InferOutput<typeof vaultExportFormatSchema>
