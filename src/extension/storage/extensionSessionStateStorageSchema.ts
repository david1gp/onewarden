import * as v from "valibot"
import { extensionStorageSchemaVersion } from "./extensionStorageSchemaVersion.js"

const extensionSessionStateStorageDataSchema = v.strictObject({
  status: v.literal("unlocked"),
  unlockedAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
})

export const extensionSessionStateStorageSchema = v.strictObject({
  schemaVersion: v.literal(extensionStorageSchemaVersion),
  ...extensionSessionStateStorageDataSchema.entries,
})

export type ExtensionSessionState = v.InferOutput<typeof extensionSessionStateStorageDataSchema>
