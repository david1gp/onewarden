import * as v from "valibot"
import { bitwardenEncryptedLoginCipherFieldSchema } from "../../../shared/api/bitwardenEncryptedLoginCipherFieldSchema.js"
import { bitwardenEncryptedLoginSchema } from "../../../shared/api/bitwardenEncryptedLoginSchema.js"

const bitwardenEncryptedCardSchema = v.object({
  cardholderName: v.optional(v.nullable(v.string())),
  brand: v.optional(v.nullable(v.string())),
  number: v.optional(v.nullable(v.string())),
  expMonth: v.optional(v.nullable(v.string())),
  expYear: v.optional(v.nullable(v.string())),
  code: v.optional(v.nullable(v.string())),
})

const bitwardenEncryptedIdentitySchema = v.object({
  title: v.optional(v.nullable(v.string())),
  firstName: v.optional(v.nullable(v.string())),
  middleName: v.optional(v.nullable(v.string())),
  lastName: v.optional(v.nullable(v.string())),
  address1: v.optional(v.nullable(v.string())),
  address2: v.optional(v.nullable(v.string())),
  address3: v.optional(v.nullable(v.string())),
  city: v.optional(v.nullable(v.string())),
  state: v.optional(v.nullable(v.string())),
  postalCode: v.optional(v.nullable(v.string())),
  country: v.optional(v.nullable(v.string())),
  company: v.optional(v.nullable(v.string())),
  email: v.optional(v.nullable(v.string())),
  phone: v.optional(v.nullable(v.string())),
  ssn: v.optional(v.nullable(v.string())),
  username: v.optional(v.nullable(v.string())),
  passportNumber: v.optional(v.nullable(v.string())),
  licenseNumber: v.optional(v.nullable(v.string())),
})

const bitwardenEncryptedSecureNoteSchema = v.object({
  type: v.optional(v.nullable(v.number())),
})

const bitwardenEncryptedPasswordHistoryEntrySchema = v.object({
  password: v.string(),
  lastUsedDate: v.string(),
})

const bitwardenEncryptedFolderSchema = v.looseObject({
  id: v.string(),
  name: v.string(),
  revisionDate: v.optional(v.string()),
  object: v.optional(v.literal("folder")),
})

const bitwardenEncryptedCipherSchema = v.looseObject({
  id: v.string(),
  organizationId: v.optional(v.nullable(v.string())),
  folderId: v.optional(v.nullable(v.string())),
  key: v.optional(v.nullable(v.string())),
  type: v.number(),
  reprompt: v.optional(v.nullable(v.number())),
  name: v.string(),
  notes: v.optional(v.nullable(v.string())),
  favorite: v.optional(v.nullable(v.boolean())),
  login: v.optional(v.nullable(bitwardenEncryptedLoginSchema)),
  secureNote: v.optional(v.nullable(bitwardenEncryptedSecureNoteSchema)),
  card: v.optional(v.nullable(bitwardenEncryptedCardSchema)),
  identity: v.optional(v.nullable(bitwardenEncryptedIdentitySchema)),
  fields: v.optional(v.nullable(v.array(bitwardenEncryptedLoginCipherFieldSchema))),
  passwordHistory: v.optional(v.nullable(v.array(bitwardenEncryptedPasswordHistoryEntrySchema))),
  collectionIds: v.optional(v.nullable(v.array(v.string()))),
  creationDate: v.optional(v.nullable(v.string())),
  revisionDate: v.optional(v.nullable(v.string())),
  deletedDate: v.optional(v.nullable(v.string())),
  archivedDate: v.optional(v.nullable(v.string())),
})

export const bitwardenEncryptedSyncSchema = v.object({
  folders: v.array(bitwardenEncryptedFolderSchema),
  ciphers: v.array(bitwardenEncryptedCipherSchema),
})

export type BitwardenEncryptedSync = v.InferOutput<typeof bitwardenEncryptedSyncSchema>
