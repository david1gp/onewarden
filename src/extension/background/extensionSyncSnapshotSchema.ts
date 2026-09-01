import * as v from "valibot"
import { bitwardenSyncEnvelopeSchema } from "../../shared/api/bitwardenSyncEnvelopeSchema.js"
import { extensionCipherSchema } from "../crypto/extensionCipherSchema.js"
import { extensionCollectionSchema } from "../crypto/extensionCollectionSchema.js"
import { extensionFolderSchema } from "../crypto/extensionFolderSchema.js"
import { extensionProfileSchema } from "../crypto/extensionProfileSchema.js"

const extensionSyncSnapshotDataSchema = v.looseObject({
  ...bitwardenSyncEnvelopeSchema.entries,
  profile: extensionProfileSchema,
  folders: v.array(extensionFolderSchema),
  collections: v.array(extensionCollectionSchema),
  ciphers: v.array(extensionCipherSchema),
})

export const extensionSyncSnapshotSchema = extensionSyncSnapshotDataSchema

export type ExtensionSyncSnapshot = v.InferOutput<typeof extensionSyncSnapshotSchema>
