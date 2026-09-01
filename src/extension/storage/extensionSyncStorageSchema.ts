import * as v from "valibot"
import { extensionEncryptedPayloadSchema } from "./extensionEncryptedPayloadSchema.js"
import { extensionSyncStorageSchemaVersion } from "./extensionSyncStorageSchemaVersion.js"

const encryptedCipherIdSchema = v.pipe(v.string(), v.minLength(1))
const encryptedCipherTypeSchema = v.picklist([1, 2, 3, 4, 5])

const extensionEncryptedSyncCipherSchema = v.strictObject({
  id: encryptedCipherIdSchema,
  revisionDate: v.pipe(v.string(), v.minLength(1)),
  type: encryptedCipherTypeSchema,
  payload: extensionEncryptedPayloadSchema,
})

const extensionSyncStorageDataSchema = v.strictObject({
  snapshot: v.nullable(extensionEncryptedPayloadSchema),
  ciphers: v.array(extensionEncryptedSyncCipherSchema),
  lastRevisionDate: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
  lastSyncedAt: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
})

export const extensionSyncStorageSchema = v.strictObject({
  schemaVersion: v.literal(extensionSyncStorageSchemaVersion),
  ...extensionSyncStorageDataSchema.entries,
})

export type ExtensionEncryptedSyncCipher = v.InferOutput<typeof extensionEncryptedSyncCipherSchema>
export type ExtensionSyncStorage = v.InferOutput<typeof extensionSyncStorageDataSchema>
