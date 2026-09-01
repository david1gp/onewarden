import * as v from "valibot"
import { bitwardenEncryptedAttachmentSchema } from "./bitwardenEncryptedAttachmentSchema.js"
import { bitwardenEncryptedCardSchema } from "./bitwardenEncryptedCardSchema.js"
import { bitwardenEncryptedIdentitySchema } from "./bitwardenEncryptedIdentitySchema.js"
import { bitwardenEncryptedLoginCipherFieldSchema } from "./bitwardenEncryptedLoginCipherFieldSchema.js"
import { bitwardenEncryptedLoginSchema } from "./bitwardenEncryptedLoginSchema.js"
import { bitwardenEncryptedPasswordHistoryEntrySchema } from "./bitwardenEncryptedPasswordHistoryEntrySchema.js"
import { bitwardenEncryptedSecureNoteSchema } from "./bitwardenEncryptedSecureNoteSchema.js"
import { bitwardenEncryptedSshKeySchema } from "./bitwardenEncryptedSshKeySchema.js"

export const bitwardenEncryptedCipherMutationRequestSchema = v.looseObject({
  id: v.optional(v.nullable(v.string())),
  folderId: v.optional(v.nullable(v.string())),
  organizationId: v.optional(v.nullable(v.string())),
  organizationID: v.optional(v.nullable(v.string())),
  key: v.optional(v.nullable(v.string())),
  type: v.picklist([1, 2, 3, 4, 5]),
  name: v.string(),
  notes: v.nullable(v.string()),
  fields: v.optional(v.nullable(v.array(bitwardenEncryptedLoginCipherFieldSchema))),
  login: v.optional(v.nullable(bitwardenEncryptedLoginSchema)),
  secureNote: v.optional(v.nullable(bitwardenEncryptedSecureNoteSchema)),
  card: v.optional(v.nullable(bitwardenEncryptedCardSchema)),
  identity: v.optional(v.nullable(bitwardenEncryptedIdentitySchema)),
  sshKey: v.optional(v.nullable(bitwardenEncryptedSshKeySchema)),
  favorite: v.optional(v.nullable(v.boolean())),
  reprompt: v.optional(v.nullable(v.number())),
  collectionIds: v.optional(v.nullable(v.array(v.string()))),
  passwordHistory: v.optional(v.nullable(v.array(bitwardenEncryptedPasswordHistoryEntrySchema))),
  attachments: v.optional(v.nullable(v.array(bitwardenEncryptedAttachmentSchema))),
  lastKnownRevisionDate: v.optional(v.nullable(v.string())),
  archivedDate: v.optional(v.nullable(v.string())),
})

export type BitwardenEncryptedCipherMutationRequest = v.InferOutput<
  typeof bitwardenEncryptedCipherMutationRequestSchema
>
