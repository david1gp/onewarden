import * as v from "valibot"
import { vaultCollectionSchema } from "./vaultCollectionSchema.js"
import { vaultFolderSchema } from "./vaultFolderSchema.js"

const syncCipherLoginSchema = v.object({
  username: v.optional(v.nullable(v.string())),
  password: v.optional(v.nullable(v.string())),
  passwordRevisionDate: v.optional(v.nullable(v.string())),
  uri: v.optional(v.nullable(v.string())),
  uris: v.optional(
    v.nullable(
      v.array(
        v.object({
          uri: v.optional(v.nullable(v.string())),
          match: v.optional(v.nullable(v.number())),
        }),
      ),
    ),
  ),
  totp: v.optional(v.nullable(v.string())),
  autofillOnPageLoad: v.optional(v.nullable(v.boolean())),
})

const syncCipherCardSchema = v.object({
  cardholderName: v.optional(v.nullable(v.string())),
  brand: v.optional(v.nullable(v.string())),
  number: v.optional(v.nullable(v.string())),
  expMonth: v.optional(v.nullable(v.string())),
  expYear: v.optional(v.nullable(v.string())),
  code: v.optional(v.nullable(v.string())),
})

const syncCipherSecureNoteSchema = v.object({
  type: v.optional(v.nullable(v.number())),
})

const syncCipherIdentitySchema = v.object({
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

const syncCipherFieldSchema = v.object({
  type: v.optional(v.number(), 0),
  name: v.optional(v.nullable(v.string())),
  value: v.optional(v.nullable(v.string())),
})

const syncCipherSchema = v.object({
  id: v.string(),
  organizationId: v.optional(v.nullable(v.string())),
  folderId: v.optional(v.nullable(v.string())),
  type: v.number(),
  name: v.string(),
  notes: v.optional(v.nullable(v.string())),
  favorite: v.optional(v.boolean(), false),
  login: v.optional(v.nullable(syncCipherLoginSchema)),
  card: v.optional(v.nullable(syncCipherCardSchema)),
  secureNote: v.optional(v.nullable(syncCipherSecureNoteSchema)),
  identity: v.optional(v.nullable(syncCipherIdentitySchema)),
  fields: v.optional(v.nullable(v.array(syncCipherFieldSchema))),
  collectionIds: v.optional(v.nullable(v.array(v.string()))),
  revisionDate: v.optional(v.string()),
  creationDate: v.optional(v.string()),
  deletedDate: v.optional(v.nullable(v.string())),
  object: v.optional(v.picklist(["cipher", "cipherDetails"])),
})

const syncProfileOrganizationSchema = v.object({
  id: v.string(),
  name: v.string(),
  status: v.optional(v.number()),
  type: v.optional(v.number()),
  enabled: v.optional(v.boolean()),
})

const syncProfileSchema = v.object({
  id: v.string(),
  name: v.optional(v.nullable(v.string())),
  email: v.string(),
  organizations: v.optional(v.array(syncProfileOrganizationSchema), []),
})

export const vaultSyncResponseSchema = v.object({
  profile: syncProfileSchema,
  folders: v.optional(v.array(vaultFolderSchema), []),
  collections: v.optional(v.array(vaultCollectionSchema), []),
  ciphers: v.optional(v.array(syncCipherSchema), []),
  object: v.optional(v.literal("sync")),
})

export type VaultSyncResponse = v.InferOutput<typeof vaultSyncResponseSchema>
