import * as v from "valibot"
import { bitwardenFido2CredentialSchema } from "../../../shared/api/bitwardenFido2CredentialSchema.js"
import { isoTimestampSchema } from "../../../shared/validation/isoTimestampSchema.js"

const bitwardenJsonCipherTypeSchema = v.picklist([1, 2, 3, 4])
const bitwardenJsonFieldTypeSchema = v.picklist([0, 1, 2, 3])
const bitwardenJsonRepromptSchema = v.picklist([0, 1])
const bitwardenJsonUriMatchSchema = v.picklist([0, 1, 2, 3, 4, 5])

const bitwardenJsonFolderSchema = v.object({
  id: v.optional(v.nullable(v.string())),
  name: v.string(),
  revisionDate: v.optional(isoTimestampSchema),
  object: v.optional(v.literal("folder")),
})

const bitwardenJsonFieldSchema = v.object({
  name: v.nullable(v.string()),
  value: v.nullable(v.string()),
  type: bitwardenJsonFieldTypeSchema,
  linkedId: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))),
})

const bitwardenJsonUriSchema = v.object({
  uri: v.string(),
  match: v.optional(v.nullable(bitwardenJsonUriMatchSchema)),
})

const bitwardenJsonLoginSchema = v.object({
  uris: v.optional(v.nullable(v.array(bitwardenJsonUriSchema))),
  username: v.optional(v.nullable(v.string())),
  password: v.optional(v.nullable(v.string())),
  totp: v.optional(v.nullable(v.string())),
  passwordRevisionDate: v.optional(v.nullable(isoTimestampSchema)),
  fido2Credentials: v.optional(v.nullable(v.array(bitwardenFido2CredentialSchema))),
})

const bitwardenJsonCardSchema = v.object({
  cardholderName: v.optional(v.nullable(v.string())),
  brand: v.optional(v.nullable(v.string())),
  number: v.optional(v.nullable(v.string())),
  expMonth: v.optional(v.nullable(v.string())),
  expYear: v.optional(v.nullable(v.string())),
  code: v.optional(v.nullable(v.string())),
})

const bitwardenJsonIdentitySchema = v.object({
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

const bitwardenJsonSecureNoteSchema = v.object({
  type: v.optional(v.nullable(v.number())),
})

const bitwardenJsonPasswordHistoryEntrySchema = v.object({
  password: v.string(),
  lastUsedDate: isoTimestampSchema,
})

const bitwardenJsonItemSchema = v.pipe(
  v.object({
    id: v.optional(v.nullable(v.string())),
    organizationId: v.optional(v.nullable(v.string())),
    folderId: v.optional(v.nullable(v.string())),
    type: bitwardenJsonCipherTypeSchema,
    reprompt: v.optional(v.nullable(bitwardenJsonRepromptSchema)),
    name: v.string(),
    notes: v.optional(v.nullable(v.string())),
    favorite: v.optional(v.nullable(v.boolean())),
    login: v.optional(v.nullable(bitwardenJsonLoginSchema)),
    secureNote: v.optional(v.nullable(bitwardenJsonSecureNoteSchema)),
    card: v.optional(v.nullable(bitwardenJsonCardSchema)),
    identity: v.optional(v.nullable(bitwardenJsonIdentitySchema)),
    fields: v.optional(v.nullable(v.array(bitwardenJsonFieldSchema))),
    passwordHistory: v.optional(v.nullable(v.array(bitwardenJsonPasswordHistoryEntrySchema))),
    collectionIds: v.optional(v.nullable(v.array(v.string()))),
    creationDate: v.optional(v.nullable(isoTimestampSchema)),
    revisionDate: v.optional(v.nullable(isoTimestampSchema)),
    deletedDate: v.optional(v.nullable(isoTimestampSchema)),
    archivedDate: v.optional(v.nullable(isoTimestampSchema)),
  }),
  v.check(
    (item) =>
      (item.type === 1 &&
        item.login !== undefined &&
        item.login !== null &&
        (item.secureNote === undefined || item.secureNote === null) &&
        (item.card === undefined || item.card === null) &&
        (item.identity === undefined || item.identity === null)) ||
      (item.type === 2 &&
        item.secureNote !== undefined &&
        item.secureNote !== null &&
        (item.login === undefined || item.login === null) &&
        (item.card === undefined || item.card === null) &&
        (item.identity === undefined || item.identity === null)) ||
      (item.type === 3 &&
        item.card !== undefined &&
        item.card !== null &&
        (item.login === undefined || item.login === null) &&
        (item.secureNote === undefined || item.secureNote === null) &&
        (item.identity === undefined || item.identity === null)) ||
      (item.type === 4 &&
        item.identity !== undefined &&
        item.identity !== null &&
        (item.login === undefined || item.login === null) &&
        (item.secureNote === undefined || item.secureNote === null) &&
        (item.card === undefined || item.card === null)),
    "Item payload must match its cipher type and must not contain data for another cipher type.",
  ),
)

export const bitwardenJsonPayloadSchema = v.object({
  encrypted: v.literal(false),
  folders: v.array(bitwardenJsonFolderSchema),
  items: v.array(bitwardenJsonItemSchema),
})

export type BitwardenJsonPayload = v.InferOutput<typeof bitwardenJsonPayloadSchema>
