import * as v from "valibot"
import { base64Decode } from "../../../shared/crypto/base64Decode.js"
import { isoTimestampSchema } from "../../../shared/validation/isoTimestampSchema.js"

const bitwardenCipherStringIsValid = (value: string): boolean => {
  const headerParts = value.split(".")
  if (headerParts.length !== 2 || headerParts[0] !== "2" || headerParts[1] === undefined) return false

  const encodedParts = headerParts[1].split("|")
  if (encodedParts.length !== 3 || encodedParts.some((part) => part.length === 0)) return false

  const decodedParts = encodedParts.map((part) => base64Decode(part))
  if (decodedParts.some((part) => !part.success)) {
    for (const part of decodedParts) {
      if (part.success) part.data.fill(0)
    }
    return false
  }

  const [iv, ciphertext, mac] = decodedParts
  if (!iv?.success || !ciphertext?.success || !mac?.success) return false

  const valid =
    iv.data.byteLength === 16 &&
    ciphertext.data.byteLength > 0 &&
    ciphertext.data.byteLength % 16 === 0 &&
    mac.data.byteLength === 32
  iv.data.fill(0)
  ciphertext.data.fill(0)
  mac.data.fill(0)
  return valid
}

const bitwardenCipherStringSchema = v.pipe(
  v.string(),
  v.minLength(1),
  v.check(bitwardenCipherStringIsValid, "Bitwarden encrypted value must be an AES-CBC-HMAC cipher string."),
)

const bitwardenOptionalCipherStringSchema = v.optional(v.nullable(bitwardenCipherStringSchema))
const bitwardenCipherTypeSchema = v.picklist([1, 2, 3, 4])
const bitwardenFieldTypeSchema = v.picklist([0, 1, 2, 3])
const bitwardenRepromptSchema = v.picklist([0, 1])
const bitwardenUriMatchSchema = v.picklist([0, 1, 2, 3, 4, 5])
const bitwardenNonEmptyStringSchema = v.pipe(v.string(), v.minLength(1))
const bitwardenOptionalReferenceSchema = v.optional(v.nullable(bitwardenNonEmptyStringSchema))

const bitwardenAccountEncryptedFolderSchema = v.strictObject({
  id: bitwardenNonEmptyStringSchema,
  name: bitwardenCipherStringSchema,
  revisionDate: v.optional(isoTimestampSchema),
  object: v.optional(v.literal("folder")),
})

const bitwardenAccountEncryptedLoginUriSchema = v.strictObject({
  uri: bitwardenCipherStringSchema,
  uriChecksum: bitwardenOptionalCipherStringSchema,
  match: v.optional(v.nullable(bitwardenUriMatchSchema)),
})

const bitwardenAccountEncryptedFido2CredentialSchema = v.strictObject({
  credentialId: bitwardenCipherStringSchema,
  keyType: bitwardenCipherStringSchema,
  keyAlgorithm: bitwardenCipherStringSchema,
  keyCurve: bitwardenCipherStringSchema,
  keyValue: bitwardenCipherStringSchema,
  rpId: bitwardenCipherStringSchema,
  userHandle: bitwardenOptionalCipherStringSchema,
  userName: bitwardenOptionalCipherStringSchema,
  counter: bitwardenCipherStringSchema,
  rpName: bitwardenOptionalCipherStringSchema,
  userDisplayName: bitwardenOptionalCipherStringSchema,
  discoverable: bitwardenCipherStringSchema,
  creationDate: bitwardenNonEmptyStringSchema,
})

const bitwardenAccountEncryptedLoginSchema = v.strictObject({
  username: bitwardenOptionalCipherStringSchema,
  password: bitwardenOptionalCipherStringSchema,
  uris: v.optional(v.nullable(v.array(bitwardenAccountEncryptedLoginUriSchema))),
  uri: bitwardenOptionalCipherStringSchema,
  totp: bitwardenOptionalCipherStringSchema,
  fido2Credentials: v.optional(v.nullable(v.array(bitwardenAccountEncryptedFido2CredentialSchema))),
  passwordRevisionDate: v.optional(v.nullable(isoTimestampSchema)),
})

const bitwardenAccountEncryptedCardSchema = v.strictObject({
  cardholderName: bitwardenOptionalCipherStringSchema,
  brand: bitwardenOptionalCipherStringSchema,
  number: bitwardenOptionalCipherStringSchema,
  expMonth: bitwardenOptionalCipherStringSchema,
  expYear: bitwardenOptionalCipherStringSchema,
  code: bitwardenOptionalCipherStringSchema,
})

const bitwardenAccountEncryptedIdentitySchema = v.strictObject({
  title: bitwardenOptionalCipherStringSchema,
  firstName: bitwardenOptionalCipherStringSchema,
  middleName: bitwardenOptionalCipherStringSchema,
  lastName: bitwardenOptionalCipherStringSchema,
  address1: bitwardenOptionalCipherStringSchema,
  address2: bitwardenOptionalCipherStringSchema,
  address3: bitwardenOptionalCipherStringSchema,
  city: bitwardenOptionalCipherStringSchema,
  state: bitwardenOptionalCipherStringSchema,
  postalCode: bitwardenOptionalCipherStringSchema,
  country: bitwardenOptionalCipherStringSchema,
  company: bitwardenOptionalCipherStringSchema,
  email: bitwardenOptionalCipherStringSchema,
  phone: bitwardenOptionalCipherStringSchema,
  ssn: bitwardenOptionalCipherStringSchema,
  username: bitwardenOptionalCipherStringSchema,
  passportNumber: bitwardenOptionalCipherStringSchema,
  licenseNumber: bitwardenOptionalCipherStringSchema,
})

const bitwardenAccountEncryptedSecureNoteSchema = v.strictObject({ type: v.literal(0) })

const bitwardenAccountEncryptedFieldSchema = v.strictObject({
  name: bitwardenOptionalCipherStringSchema,
  value: bitwardenOptionalCipherStringSchema,
  type: bitwardenFieldTypeSchema,
  linkedId: v.optional(v.nullable(v.pipe(v.number(), v.safeInteger(), v.minValue(0)))),
})

const bitwardenAccountEncryptedPasswordHistoryEntrySchema = v.strictObject({
  password: bitwardenCipherStringSchema,
  lastUsedDate: isoTimestampSchema,
})

const bitwardenAccountEncryptedItemSchema = v.pipe(
  v.strictObject({
    id: bitwardenNonEmptyStringSchema,
    organizationId: v.optional(v.nullable(bitwardenNonEmptyStringSchema)),
    folderId: bitwardenOptionalReferenceSchema,
    key: v.optional(v.nullable(v.string())),
    type: bitwardenCipherTypeSchema,
    reprompt: v.optional(v.nullable(bitwardenRepromptSchema)),
    name: bitwardenCipherStringSchema,
    notes: bitwardenOptionalCipherStringSchema,
    favorite: v.optional(v.nullable(v.boolean())),
    login: v.optional(v.nullable(bitwardenAccountEncryptedLoginSchema)),
    secureNote: v.optional(v.nullable(bitwardenAccountEncryptedSecureNoteSchema)),
    card: v.optional(v.nullable(bitwardenAccountEncryptedCardSchema)),
    identity: v.optional(v.nullable(bitwardenAccountEncryptedIdentitySchema)),
    fields: v.optional(v.nullable(v.array(bitwardenAccountEncryptedFieldSchema))),
    passwordHistory: v.optional(v.nullable(v.array(bitwardenAccountEncryptedPasswordHistoryEntrySchema))),
    collectionIds: v.optional(v.nullable(v.array(bitwardenNonEmptyStringSchema))),
    creationDate: v.optional(v.nullable(isoTimestampSchema)),
    revisionDate: v.optional(v.nullable(isoTimestampSchema)),
    deletedDate: v.optional(v.nullable(isoTimestampSchema)),
    archivedDate: v.optional(v.nullable(isoTimestampSchema)),
  }),
  v.check(
    (item) => item.organizationId === undefined || item.organizationId === null,
    "Account-restricted exports must not contain organization-owned items.",
  ),
  v.check(
    (item) => item.deletedDate === undefined || item.deletedDate === null,
    "Account-restricted exports must not contain trashed items.",
  ),
  v.check(
    (item) => item.collectionIds === undefined || item.collectionIds === null || item.collectionIds.length === 0,
    "Account-restricted exports must not contain organization collection references.",
  ),
  v.check(
    (item) => item.key === undefined || item.key === null,
    "Account-restricted exports must not contain per-item encryption keys.",
  ),
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
    "Account-encrypted item payload must match its cipher type.",
  ),
)

export const bitwardenAccountEncryptedJsonEnvelopeSchema = v.strictObject({
  encrypted: v.literal(true),
  passwordProtected: v.optional(v.literal(false)),
  encKeyValidation_DO_NOT_EDIT: bitwardenCipherStringSchema,
  folders: v.array(bitwardenAccountEncryptedFolderSchema),
  items: v.array(bitwardenAccountEncryptedItemSchema),
})

export type BitwardenAccountEncryptedJsonEnvelope = v.InferOutput<typeof bitwardenAccountEncryptedJsonEnvelopeSchema>
