import * as v from "valibot"
import { bitwardenEncryptedLoginCipherFieldSchema } from "./bitwardenEncryptedLoginCipherFieldSchema.js"
import { bitwardenEncryptedLoginSchema } from "./bitwardenEncryptedLoginSchema.js"

const bitwardenSyncCipherSchema = v.looseObject({
  id: v.string(),
  type: v.number(),
  revisionDate: v.optional(v.string()),
  deletedDate: v.optional(v.nullable(v.string())),
  organizationId: v.optional(v.nullable(v.string())),
  folderId: v.optional(v.nullable(v.string())),
  name: v.string(),
  notes: v.nullable(v.string()),
  key: v.optional(v.nullable(v.string())),
  collectionIds: v.optional(v.array(v.string())),
  login: v.nullish(bitwardenEncryptedLoginSchema),
  fields: v.nullish(v.array(bitwardenEncryptedLoginCipherFieldSchema)),
})

const bitwardenSyncResourceSchema = v.looseObject({})

export const bitwardenSyncEnvelopeSchema = v.looseObject({
  profile: bitwardenSyncResourceSchema,
  folders: v.array(bitwardenSyncResourceSchema),
  collections: v.array(bitwardenSyncResourceSchema),
  policies: v.array(bitwardenSyncResourceSchema),
  ciphers: v.array(bitwardenSyncCipherSchema),
  domains: v.nullish(bitwardenSyncResourceSchema),
  sends: v.array(bitwardenSyncResourceSchema),
  userDecryption: v.optional(bitwardenSyncResourceSchema),
  object: v.literal("sync"),
  continuationToken: v.nullish(v.string()),
})

export type BitwardenSyncEnvelope = v.InferOutput<typeof bitwardenSyncEnvelopeSchema>
