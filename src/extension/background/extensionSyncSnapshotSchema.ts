import * as v from "valibot"
import type { BitwardenSyncEnvelope } from "../../shared/api/bitwardenSyncEnvelopeSchema.js"
import { extensionPersonalLoginCipherSchema } from "../crypto/extensionPersonalLoginCipherSchema.js"

const extensionSyncSnapshotDataSchema = v.looseObject({
  profile: v.unknown(),
  folders: v.array(v.unknown()),
  collections: v.array(v.unknown()),
  policies: v.array(v.unknown()),
  domains: v.nullish(v.unknown()),
  sends: v.array(v.unknown()),
  userDecryption: v.optional(v.unknown()),
  object: v.literal("sync"),
  continuationToken: v.nullish(v.string()),
  ciphers: v.array(extensionPersonalLoginCipherSchema),
})

export const extensionSyncSnapshotSchema = extensionSyncSnapshotDataSchema

export type ExtensionSyncSnapshot = Omit<BitwardenSyncEnvelope, "ciphers"> & {
  ciphers: v.InferOutput<typeof extensionPersonalLoginCipherSchema>[]
}
