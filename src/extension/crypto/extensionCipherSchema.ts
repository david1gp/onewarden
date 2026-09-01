import * as v from "valibot"
import { extensionCipherAttachmentSchema } from "./extensionCipherAttachmentSchema.js"
import { extensionCipherCardSchema } from "./extensionCipherCardSchema.js"
import { extensionCipherFieldSchema } from "./extensionCipherFieldSchema.js"
import { extensionCipherIdentitySchema } from "./extensionCipherIdentitySchema.js"
import { extensionCipherPasswordHistoryEntrySchema } from "./extensionCipherPasswordHistoryEntrySchema.js"
import { extensionCipherSecureNoteSchema } from "./extensionCipherSecureNoteSchema.js"
import { extensionCipherSshKeySchema } from "./extensionCipherSshKeySchema.js"
import { extensionPersonalLoginCipherSchema } from "./extensionPersonalLoginCipherSchema.js"

const extensionCipherCommonEntries = {
  object: v.picklist(["cipher", "cipherDetails", "cipherMini"]),
  id: v.pipe(v.string(), v.minLength(1)),
  creationDate: v.optional(v.nullable(v.string())),
  revisionDate: v.string(),
  deletedDate: v.nullable(v.string()),
  archivedDate: v.optional(v.nullable(v.string())),
  organizationId: v.optional(v.nullable(v.string())),
  folderId: v.optional(v.nullable(v.string())),
  name: v.string(),
  notes: v.nullable(v.string()),
  favorite: v.optional(v.boolean()),
  key: v.optional(v.nullable(v.string())),
  collectionIds: v.optional(v.array(v.string())),
  edit: v.optional(v.boolean()),
  viewPassword: v.optional(v.boolean()),
  permissions: v.optional(
    v.nullable(
      v.looseObject({
        read: v.optional(v.boolean()),
        delete: v.optional(v.boolean()),
        restore: v.optional(v.boolean()),
      }),
    ),
  ),
  reprompt: v.optional(v.nullable(v.number())),
  fields: v.array(extensionCipherFieldSchema),
  attachments: v.optional(v.nullable(v.array(extensionCipherAttachmentSchema))),
  passwordHistory: v.optional(v.nullable(v.array(extensionCipherPasswordHistoryEntrySchema))),
}

const extensionSecureNoteCipherSchema = v.looseObject({
  ...extensionCipherCommonEntries,
  type: v.literal(2),
  secureNote: extensionCipherSecureNoteSchema,
})

const extensionCardCipherSchema = v.looseObject({
  ...extensionCipherCommonEntries,
  type: v.literal(3),
  card: extensionCipherCardSchema,
})

const extensionIdentityCipherSchema = v.looseObject({
  ...extensionCipherCommonEntries,
  type: v.literal(4),
  identity: extensionCipherIdentitySchema,
})

const extensionSshKeyCipherSchema = v.looseObject({
  ...extensionCipherCommonEntries,
  type: v.literal(5),
  sshKey: extensionCipherSshKeySchema,
})

export const extensionCipherSchema = v.pipe(
  v.variant("type", [
    extensionPersonalLoginCipherSchema,
    extensionSecureNoteCipherSchema,
    extensionCardCipherSchema,
    extensionIdentityCipherSchema,
    extensionSshKeyCipherSchema,
  ]),
  v.check((value) => {
    const record = value as {
      type: number
      login?: unknown
      secureNote?: unknown
      card?: unknown
      identity?: unknown
      sshKey?: unknown
    }
    const payloads = [record.login, record.secureNote, record.card, record.identity, record.sshKey]
    const payloadIndex = record.type - 1
    return (
      payloadIndex >= 0 &&
      payloadIndex < payloads.length &&
      payloads[payloadIndex] !== undefined &&
      payloads[payloadIndex] !== null &&
      payloads.every((payload, index) => index === payloadIndex || payload === undefined || payload === null)
    )
  }, "Extension cipher payload must match its cipher type."),
)

export type ExtensionCipher = v.InferOutput<typeof extensionCipherSchema>
