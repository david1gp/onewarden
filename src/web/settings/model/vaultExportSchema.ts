import * as v from "valibot"

export const vaultExportFormatSchema = v.union([
  v.literal("json-decrypted"),
  v.literal("csv-decrypted"),
  v.literal("json-encrypted"),
  v.literal("json-account-encrypted"),
  v.literal("zip"),
])

export type VaultExportFormat = v.InferOutput<typeof vaultExportFormatSchema>
