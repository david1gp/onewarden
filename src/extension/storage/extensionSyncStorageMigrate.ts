import * as v from "valibot"
import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { extensionEncryptedPayloadSchema } from "./extensionEncryptedPayloadSchema.js"
import { extensionSyncStorageSchema, type ExtensionSyncStorage } from "./extensionSyncStorageSchema.js"

const extensionSyncStorageLegacySchema = v.strictObject({
  schemaVersion: v.literal(1),
  snapshot: v.nullable(extensionEncryptedPayloadSchema),
  ciphers: v.array(
    v.strictObject({
      id: v.pipe(v.string(), v.minLength(1)),
      revisionDate: v.pipe(v.string(), v.minLength(1)),
      payload: extensionEncryptedPayloadSchema,
    }),
  ),
  lastRevisionDate: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
  lastSyncedAt: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
})

function extensionSyncStorageError(message: string, errorData?: string): Result<ExtensionSyncStorage> {
  return resultErrorCreate("extensionSyncStorageMigrate", message, {
    code: "platform.internal",
    statusCode: 500,
    errorData,
  })
}

export function extensionSyncStorageMigrate(value: unknown): Result<ExtensionSyncStorage> {
  const current = v.safeParse(extensionSyncStorageSchema, value)
  if (current.success) return resultCreate(current.output)

  const legacy = v.safeParse(extensionSyncStorageLegacySchema, value)
  if (!legacy.success) {
    return extensionSyncStorageError(
      "Stored extension sync cache is invalid or uses an unsupported schema version.",
      v.summarize(current.issues),
    )
  }

  const { schemaVersion: _schemaVersion, ...legacyData } = legacy.output
  return resultCreate({
    ...legacyData,
    ciphers: legacyData.ciphers.map((cipher) => ({ ...cipher, type: 1 as const })),
  })
}
