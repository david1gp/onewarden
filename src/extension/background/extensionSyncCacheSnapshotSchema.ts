import * as v from "valibot"
import { extensionSyncSnapshotSchema } from "./extensionSyncSnapshotSchema.js"

export const extensionSyncCacheSnapshotSchema = v.omit(extensionSyncSnapshotSchema, ["ciphers"])

export type ExtensionSyncCacheSnapshot = v.InferOutput<typeof extensionSyncCacheSnapshotSchema>
