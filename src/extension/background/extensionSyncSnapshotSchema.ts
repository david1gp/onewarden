import * as v from "valibot"
import { bitwardenSyncEnvelopeSchema } from "../../shared/api/bitwardenSyncEnvelopeSchema.js"
import { extensionPersonalLoginCipherSchema } from "../crypto/extensionPersonalLoginCipherSchema.js"
import { extensionProfileSchema } from "../crypto/extensionProfileSchema.js"

const extensionSyncSnapshotDataSchema = v.looseObject({
  ...bitwardenSyncEnvelopeSchema.entries,
  profile: extensionProfileSchema,
  ciphers: v.array(extensionPersonalLoginCipherSchema),
})

export const extensionSyncSnapshotSchema = extensionSyncSnapshotDataSchema

export type ExtensionSyncSnapshot = v.InferOutput<typeof extensionSyncSnapshotSchema>
