import * as v from "valibot"

export const vaultImportFolderSchema = v.object({
  id: v.optional(v.nullable(v.string())),
  name: v.string(),
})

export const vaultImportItemFieldSchema = v.object({
  name: v.optional(v.nullable(v.string())),
  value: v.optional(v.nullable(v.string())),
  type: v.optional(v.nullable(v.number())),
})

export const vaultImportItemUriSchema = v.object({
  uri: v.optional(v.nullable(v.string())),
  match: v.optional(v.nullable(v.number())),
})

export const vaultImportItemLoginSchema = v.object({
  uris: v.optional(v.nullable(v.array(vaultImportItemUriSchema))),
  username: v.optional(v.nullable(v.string())),
  password: v.optional(v.nullable(v.string())),
  totp: v.optional(v.nullable(v.string())),
})

export const vaultImportItemCardSchema = v.object({
  cardholderName: v.optional(v.nullable(v.string())),
  brand: v.optional(v.nullable(v.string())),
  number: v.optional(v.nullable(v.string())),
  expMonth: v.optional(v.nullable(v.string())),
  expYear: v.optional(v.nullable(v.string())),
  code: v.optional(v.nullable(v.string())),
})

export const vaultImportItemIdentitySchema = v.object({
  title: v.optional(v.nullable(v.string())),
  firstName: v.optional(v.nullable(v.string())),
  middleName: v.optional(v.nullable(v.string())),
  lastName: v.optional(v.nullable(v.string())),
  address1: v.optional(v.nullable(v.string())),
  address2: v.optional(v.nullable(v.string())),
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

export const vaultImportItemSchema = v.object({
  id: v.optional(v.nullable(v.string())),
  folderId: v.optional(v.nullable(v.string())),
  type: v.number(),
  name: v.string(),
  notes: v.optional(v.nullable(v.string())),
  favorite: v.optional(v.nullable(v.boolean())),
  login: v.optional(v.nullable(vaultImportItemLoginSchema)),
  card: v.optional(v.nullable(vaultImportItemCardSchema)),
  identity: v.optional(v.nullable(vaultImportItemIdentitySchema)),
  fields: v.optional(v.nullable(v.array(vaultImportItemFieldSchema))),
})

export const vaultImportPayloadSchema = v.object({
  folders: v.optional(v.array(vaultImportFolderSchema)),
  items: v.optional(v.array(vaultImportItemSchema)),
})

export type VaultImportFolder = v.InferOutput<typeof vaultImportFolderSchema>
export type VaultImportItem = v.InferOutput<typeof vaultImportItemSchema>
export type VaultImportPayload = v.InferOutput<typeof vaultImportPayloadSchema>
