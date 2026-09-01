import * as v from "valibot"
import { bitwardenEncryptedCipherSchema } from "./bitwardenEncryptedCipherSchema.js"
import { bitwardenEncryptedCollectionSchema } from "./bitwardenEncryptedCollectionSchema.js"
import { bitwardenEncryptedFolderSchema } from "./bitwardenEncryptedFolderSchema.js"

const bitwardenSyncResourceSchema = v.looseObject({})

export const bitwardenSyncEnvelopeSchema = v.looseObject({
  profile: bitwardenSyncResourceSchema,
  folders: v.array(bitwardenEncryptedFolderSchema),
  collections: v.array(bitwardenEncryptedCollectionSchema),
  policies: v.array(bitwardenSyncResourceSchema),
  ciphers: v.array(bitwardenEncryptedCipherSchema),
  domains: v.nullish(bitwardenSyncResourceSchema),
  sends: v.array(bitwardenSyncResourceSchema),
  userDecryption: v.optional(bitwardenSyncResourceSchema),
  object: v.literal("sync"),
  continuationToken: v.nullish(v.string()),
})

export type BitwardenSyncEnvelope = v.InferOutput<typeof bitwardenSyncEnvelopeSchema>
