import * as v from "valibot"
import { bitwardenEncryptedAttachmentSchema } from "./bitwardenEncryptedAttachmentSchema.js"
import { bitwardenEncryptedCardSchema } from "./bitwardenEncryptedCardSchema.js"
import { bitwardenEncryptedFido2CredentialSchema } from "./bitwardenEncryptedFido2CredentialSchema.js"
import { bitwardenEncryptedIdentitySchema } from "./bitwardenEncryptedIdentitySchema.js"
import { bitwardenEncryptedLoginCipherFieldSchema } from "./bitwardenEncryptedLoginCipherFieldSchema.js"
import { bitwardenEncryptedLoginSchema } from "./bitwardenEncryptedLoginSchema.js"
import { bitwardenEncryptedPasswordHistoryEntrySchema } from "./bitwardenEncryptedPasswordHistoryEntrySchema.js"
import { bitwardenEncryptedSecureNoteSchema } from "./bitwardenEncryptedSecureNoteSchema.js"
import { bitwardenEncryptedSshKeySchema } from "./bitwardenEncryptedSshKeySchema.js"
import { bitwardenFido2CredentialSchema } from "./bitwardenFido2CredentialSchema.js"

const bitwardenEncryptedCipherObjectSchema = v.picklist(["cipher", "cipherDetails", "cipherMini"])
const bitwardenEncryptedCipherTypeSchema = v.picklist([1, 2, 3, 4, 5])
const bitwardenEncryptedSyncLoginSchema = v.looseObject({
  username: v.nullable(v.string()),
  password: v.nullable(v.string()),
  uris: v.array(v.looseObject({ uri: v.nullable(v.string()), match: v.nullish(v.number()) })),
  uri: v.optional(v.nullable(v.string())),
  totp: v.nullable(v.string()),
  fido2Credentials: v.optional(
    v.nullable(v.array(v.union([bitwardenEncryptedFido2CredentialSchema, bitwardenFido2CredentialSchema]))),
  ),
})

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
  login: v.optional(v.nullable(v.union([bitwardenEncryptedLoginSchema, bitwardenEncryptedSyncLoginSchema]))),
  secureNote: v.optional(v.nullable(bitwardenEncryptedSecureNoteSchema)),
  card: v.optional(v.nullable(bitwardenEncryptedCardSchema)),
  identity: v.optional(v.nullable(bitwardenEncryptedIdentitySchema)),
  sshKey: v.optional(v.nullable(bitwardenEncryptedSshKeySchema)),
})

export const bitwardenEncryptedCipherSchema = v.pipe(
  bitwardenEncryptedCipherRecordSchema,
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
  }, "Encrypted cipher payload must match its cipher type."),
)

export type BitwardenEncryptedCipher = v.InferOutput<typeof bitwardenEncryptedCipherSchema>
