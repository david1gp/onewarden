import * as v from "valibot"
import { bitwardenEncryptedAttachmentSchema } from "./bitwardenEncryptedAttachmentSchema.js"
import { bitwardenEncryptedCardSchema } from "./bitwardenEncryptedCardSchema.js"
import { bitwardenEncryptedIdentitySchema } from "./bitwardenEncryptedIdentitySchema.js"
import { bitwardenEncryptedLoginCipherFieldSchema } from "./bitwardenEncryptedLoginCipherFieldSchema.js"
import { bitwardenEncryptedLoginSchema } from "./bitwardenEncryptedLoginSchema.js"
import { bitwardenEncryptedPasswordHistoryEntrySchema } from "./bitwardenEncryptedPasswordHistoryEntrySchema.js"
import { bitwardenEncryptedSecureNoteSchema } from "./bitwardenEncryptedSecureNoteSchema.js"
import { bitwardenEncryptedSshKeySchema } from "./bitwardenEncryptedSshKeySchema.js"

const bitwardenEncryptedCipherObjectSchema = v.picklist(["cipher", "cipherDetails", "cipherMini"])
const bitwardenEncryptedCipherTypeSchema = v.picklist([1, 2, 3, 4, 5])

const bitwardenEncryptedCipherRecordSchema = v.looseObject({
  object: v.optional(bitwardenEncryptedCipherObjectSchema),
  id: v.pipe(v.string(), v.minLength(1)),
  type: bitwardenEncryptedCipherTypeSchema,
  creationDate: v.optional(v.nullable(v.string())),
  revisionDate: v.optional(v.nullable(v.string())),
  deletedDate: v.optional(v.nullable(v.string())),
  archivedDate: v.optional(v.nullable(v.string())),
  organizationId: v.optional(v.nullable(v.string())),
  folderId: v.optional(v.nullable(v.string())),
  name: v.string(),
  notes: v.optional(v.nullable(v.string())),
  favorite: v.optional(v.nullable(v.boolean())),
  reprompt: v.optional(v.nullable(v.number())),
  key: v.optional(v.nullable(v.string())),
  collectionIds: v.optional(v.nullable(v.array(v.string()))),
  edit: v.optional(v.nullable(v.boolean())),
  viewPassword: v.optional(v.nullable(v.boolean())),
  permissions: v.optional(v.nullable(v.record(v.string(), v.unknown()))),
  fields: v.optional(v.nullable(v.array(bitwardenEncryptedLoginCipherFieldSchema))),
  attachments: v.optional(v.nullable(v.array(bitwardenEncryptedAttachmentSchema))),
  passwordHistory: v.optional(v.nullable(v.array(bitwardenEncryptedPasswordHistoryEntrySchema))),
  login: v.optional(v.nullable(bitwardenEncryptedLoginSchema)),
  secureNote: v.optional(v.nullable(bitwardenEncryptedSecureNoteSchema)),
  card: v.optional(v.nullable(bitwardenEncryptedCardSchema)),
  identity: v.optional(v.nullable(bitwardenEncryptedIdentitySchema)),
  sshKey: v.optional(v.nullable(bitwardenEncryptedSshKeySchema)),
})

export const bitwardenEncryptedCipherSchema = v.pipe(
  bitwardenEncryptedCipherRecordSchema,
  v.check(
    (value) => {
      const record = value as {
        type: number
        login?: unknown
        secureNote?: unknown
        card?: unknown
        identity?: unknown
        sshKey?: unknown
      }
      if (record.type === 1) return record.login !== undefined && record.login !== null
      if (record.type === 2) return record.secureNote !== undefined && record.secureNote !== null
      if (record.type === 3) return record.card !== undefined && record.card !== null
      if (record.type === 4) return record.identity !== undefined && record.identity !== null
      if (record.type === 5) return record.sshKey !== undefined && record.sshKey !== null
      return false
    },
    "Encrypted cipher payload must match its cipher type.",
  ),
)

export type BitwardenEncryptedCipher = v.InferOutput<typeof bitwardenEncryptedCipherSchema>
