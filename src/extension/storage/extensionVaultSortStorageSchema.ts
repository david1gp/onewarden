import * as v from "valibot"
import { vaultSortSchema } from "../../shared/vault/vaultSortSchema.js"
import { extensionStorageSchemaVersion } from "./extensionStorageSchemaVersion.js"

const extensionVaultSortStorageDataSchema = v.strictObject({
  sort: vaultSortSchema,
})

export const extensionVaultSortStorageSchema = v.strictObject({
  schemaVersion: v.literal(extensionStorageSchemaVersion),
  ...extensionVaultSortStorageDataSchema.entries,
})

export type ExtensionVaultSortStorage = v.InferOutput<typeof extensionVaultSortStorageDataSchema>
