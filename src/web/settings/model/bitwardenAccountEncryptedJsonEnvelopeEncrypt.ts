import * as v from "valibot"
import type { Result } from "#result"
import { extensionFido2CredentialEncrypt } from "../../../extension/crypto/extensionFido2CredentialEncrypt.js"
import { bitwardenCipherStringEncrypt } from "../../../shared/crypto/bitwardenCipherStringEncrypt.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { BitwardenJsonItem } from "./bitwardenJsonItemSchema.js"
import { bitwardenJsonPayloadSchema, type BitwardenJsonPayload } from "./bitwardenJsonPayloadSchema.js"
import {
  bitwardenAccountEncryptedJsonEnvelopeSchema,
  type BitwardenAccountEncryptedJsonEnvelope,
} from "./bitwardenAccountEncryptedJsonEnvelopeSchema.js"
import { bitwardenAccountEncryptedJsonEnvelopeReferencesValidate } from "./bitwardenAccountEncryptedJsonEnvelopeReferencesValidate.js"

type AccountItem = BitwardenAccountEncryptedJsonEnvelope["items"][number]
type AccountFolder = BitwardenAccountEncryptedJsonEnvelope["folders"][number]
type JsonLogin = NonNullable<BitwardenJsonItem["login"]>
type JsonField = NonNullable<BitwardenJsonItem["fields"]>[number]
type JsonPasswordHistoryEntry = NonNullable<BitwardenJsonItem["passwordHistory"]>[number]
type AccountLogin = NonNullable<AccountItem["login"]>
type AccountField = NonNullable<AccountItem["fields"]>[number]
type AccountPasswordHistoryEntry = NonNullable<AccountItem["passwordHistory"]>[number]

function invalidInputResult<T>(message: string): Result<T> {
  return resultErrorCreate("bitwardenAccountEncryptedJsonEnvelopeEncrypt", message, {
    code: "platform.invalid-request",
    statusCode: 400,
  })
}

function payloadReferencesValidate(payload: BitwardenJsonPayload): string | null {
  const folderIds = new Set<string>()
  for (const [index, folder] of payload.folders.entries()) {
    if (folder.id === undefined || folder.id === null || folder.id.length === 0) {
      return `folder at index ${index} must have an id`
    }
    if (folderIds.has(folder.id)) return `duplicate folder id '${folder.id}'`
    folderIds.add(folder.id)
  }

  const itemIds = new Set<string>()
  for (const [index, item] of payload.items.entries()) {
    if (item.id === undefined || item.id === null || item.id.length === 0) {
      return `item at index ${index} must have an id`
    }
    if (itemIds.has(item.id)) return `duplicate item id '${item.id}'`
    itemIds.add(item.id)

    if (item.organizationId !== undefined && item.organizationId !== null) {
      return `item at index ${index} is organization-owned`
    }
    if (item.deletedDate !== undefined && item.deletedDate !== null) return `item at index ${index} is trashed`
    if (item.collectionIds !== undefined && item.collectionIds !== null && item.collectionIds.length > 0) {
      return `item at index ${index} contains organization collection references`
    }
    if (item.folderId !== undefined && item.folderId !== null) {
      if (item.folderId.length === 0 || !folderIds.has(item.folderId)) {
        return `item at index ${index} references missing folder '${item.folderId}'`
      }
    }
    if (
      item.type === 2 &&
      item.secureNote?.type !== undefined &&
      item.secureNote.type !== null &&
      item.secureNote.type !== 0
    ) {
      return `item at index ${index} contains an unsupported secure note type`
    }
  }
  return null
}

async function stringEncrypt(value: string, userKey: Uint8Array): Promise<Result<string>> {
  return bitwardenCipherStringEncrypt(value, userKey)
}

async function optionalStringEncrypt(
  value: string | null | undefined,
  userKey: Uint8Array,
): Promise<Result<string | null | undefined>> {
  if (value === undefined || value === null) return resultCreate(value)
  return stringEncrypt(value, userKey)
}

async function loginEncrypt(value: JsonLogin, userKey: Uint8Array): Promise<Result<AccountLogin>> {
  const uris: NonNullable<AccountLogin["uris"]> = []
  if (value.uris !== undefined && value.uris !== null) {
    for (const uri of value.uris) {
      const encryptedUri = await stringEncrypt(uri.uri, userKey)
      if (!encryptedUri.success) return encryptedUri
      uris.push({ uri: encryptedUri.data, ...(uri.match === undefined ? {} : { match: uri.match }) })
    }
  }

  const username = await optionalStringEncrypt(value.username, userKey)
  if (!username.success) return username
  const password = await optionalStringEncrypt(value.password, userKey)
  if (!password.success) return password
  const totp = await optionalStringEncrypt(value.totp, userKey)
  if (!totp.success) return totp

  let fido2Credentials: AccountLogin["fido2Credentials"]
  if (value.fido2Credentials !== undefined && value.fido2Credentials !== null) {
    const encryptedCredentials: NonNullable<AccountLogin["fido2Credentials"]> = []
    for (const credential of value.fido2Credentials) {
      const encryptedCredential = await extensionFido2CredentialEncrypt(credential, userKey)
      if (!encryptedCredential.success) return encryptedCredential
      encryptedCredentials.push(encryptedCredential.data)
    }
    fido2Credentials = encryptedCredentials
  } else {
    fido2Credentials = value.fido2Credentials
  }

  return resultCreate({
    ...(value.username === undefined ? {} : { username: username.data }),
    ...(value.password === undefined ? {} : { password: password.data }),
    ...(value.uris === undefined ? {} : { uris: value.uris === null ? null : uris }),
    ...(value.totp === undefined ? {} : { totp: totp.data }),
    ...(value.fido2Credentials === undefined ? {} : { fido2Credentials }),
    ...(value.passwordRevisionDate === undefined ? {} : { passwordRevisionDate: value.passwordRevisionDate }),
  })
}

async function fieldEncrypt(value: JsonField, userKey: Uint8Array): Promise<Result<AccountField>> {
  const name = await optionalStringEncrypt(value.name, userKey)
  if (!name.success) return name
  const fieldValue = await optionalStringEncrypt(value.value, userKey)
  if (!fieldValue.success) return fieldValue
  return resultCreate({
    ...(value.name === undefined ? {} : { name: name.data }),
    ...(value.value === undefined ? {} : { value: fieldValue.data }),
    type: value.type,
    ...(value.linkedId === undefined ? {} : { linkedId: value.linkedId }),
  })
}

async function passwordHistoryEntryEncrypt(
  value: JsonPasswordHistoryEntry,
  userKey: Uint8Array,
): Promise<Result<AccountPasswordHistoryEntry>> {
  const password = await stringEncrypt(value.password, userKey)
  if (!password.success) return password
  return resultCreate({ password: password.data, lastUsedDate: value.lastUsedDate })
}

async function itemEncrypt(value: BitwardenJsonItem, userKey: Uint8Array): Promise<Result<AccountItem>> {
  const name = await stringEncrypt(value.name, userKey)
  if (!name.success) return name
  const notes = await optionalStringEncrypt(value.notes, userKey)
  if (!notes.success) return notes

  let login: AccountItem["login"]
  if (value.login === undefined || value.login === null) {
    login = value.login
  } else {
    const loginResult = await loginEncrypt(value.login, userKey)
    if (!loginResult.success) return loginResult
    login = loginResult.data
  }

  let card: AccountItem["card"]
  if (value.card === undefined || value.card === null) {
    card = value.card
  } else {
    const encryptedCard: NonNullable<AccountItem["card"]> = {}
    for (const field of ["cardholderName", "brand", "number", "expMonth", "expYear", "code"] as const) {
      const encryptedValue = await optionalStringEncrypt(value.card[field], userKey)
      if (!encryptedValue.success) return encryptedValue
      if (value.card[field] !== undefined) encryptedCard[field] = encryptedValue.data
    }
    card = encryptedCard
  }

  let identity: AccountItem["identity"]
  if (value.identity === undefined || value.identity === null) {
    identity = value.identity
  } else {
    const encryptedIdentity: NonNullable<AccountItem["identity"]> = {}
    for (const field of [
      "title",
      "firstName",
      "middleName",
      "lastName",
      "address1",
      "address2",
      "address3",
      "city",
      "state",
      "postalCode",
      "country",
      "company",
      "email",
      "phone",
      "ssn",
      "username",
      "passportNumber",
      "licenseNumber",
    ] as const) {
      const encryptedValue = await optionalStringEncrypt(value.identity[field], userKey)
      if (!encryptedValue.success) return encryptedValue
      if (value.identity[field] !== undefined) encryptedIdentity[field] = encryptedValue.data
    }
    identity = encryptedIdentity
  }

  let fields: AccountItem["fields"]
  if (value.fields === undefined || value.fields === null) {
    fields = value.fields
  } else {
    const encryptedFields: NonNullable<AccountItem["fields"]> = []
    for (const field of value.fields) {
      const encryptedField = await fieldEncrypt(field, userKey)
      if (!encryptedField.success) return encryptedField
      encryptedFields.push(encryptedField.data)
    }
    fields = encryptedFields
  }

  let passwordHistory: AccountItem["passwordHistory"]
  if (value.passwordHistory === undefined || value.passwordHistory === null) {
    passwordHistory = value.passwordHistory
  } else {
    const encryptedPasswordHistory: NonNullable<AccountItem["passwordHistory"]> = []
    for (const entry of value.passwordHistory) {
      const encryptedEntry = await passwordHistoryEntryEncrypt(entry, userKey)
      if (!encryptedEntry.success) return encryptedEntry
      encryptedPasswordHistory.push(encryptedEntry.data)
    }
    passwordHistory = encryptedPasswordHistory
  }

  return resultCreate({
    id: value.id ?? "",
    organizationId: null,
    ...(value.folderId === undefined ? {} : { folderId: value.folderId }),
    type: value.type,
    ...(value.reprompt === undefined ? {} : { reprompt: value.reprompt }),
    name: name.data,
    ...(value.notes === undefined ? {} : { notes: notes.data }),
    ...(value.favorite === undefined ? {} : { favorite: value.favorite }),
    login: value.type === 1 ? login : null,
    secureNote: value.type === 2 ? { type: 0 } : null,
    card: value.type === 3 ? card : null,
    identity: value.type === 4 ? identity : null,
    ...(value.fields === undefined ? {} : { fields }),
    ...(value.passwordHistory === undefined ? {} : { passwordHistory }),
    collectionIds: null,
    ...(value.creationDate === undefined ? {} : { creationDate: value.creationDate }),
    ...(value.revisionDate === undefined ? {} : { revisionDate: value.revisionDate }),
    deletedDate: null,
    ...(value.archivedDate === undefined ? {} : { archivedDate: value.archivedDate }),
  })
}

export async function bitwardenAccountEncryptedJsonEnvelopeEncrypt(
  payload: BitwardenJsonPayload,
  userKey: Uint8Array,
): Promise<Result<BitwardenAccountEncryptedJsonEnvelope>> {
  const op = "bitwardenAccountEncryptedJsonEnvelopeEncrypt"
  const payloadResult = v.safeParse(bitwardenJsonPayloadSchema, payload)
  if (!payloadResult.success)
    return invalidInputResult(`Invalid Bitwarden JSON payload: ${v.summarize(payloadResult.issues)}`)
  if (!(userKey instanceof Uint8Array) || userKey.byteLength !== 64) {
    return invalidInputResult("Bitwarden account user key must be 64 bytes.")
  }

  const referenceError = payloadReferencesValidate(payloadResult.output)
  if (referenceError !== null) return invalidInputResult(`Invalid Bitwarden JSON payload: ${referenceError}.`)

  const markerResult = await stringEncrypt(crypto.randomUUID(), userKey)
  if (!markerResult.success) return markerResult

  const folders: AccountFolder[] = []
  for (const folder of payloadResult.output.folders) {
    const name = await stringEncrypt(folder.name, userKey)
    if (!name.success) return name
    folders.push({
      id: folder.id as string,
      name: name.data,
      ...(folder.revisionDate === undefined ? {} : { revisionDate: folder.revisionDate }),
      ...(folder.object === undefined ? {} : { object: folder.object }),
    })
  }

  const items: AccountItem[] = []
  for (const item of payloadResult.output.items) {
    const encryptedItem = await itemEncrypt(item, userKey)
    if (!encryptedItem.success) return encryptedItem
    items.push(encryptedItem.data)
  }

  const envelopeResult = v.safeParse(bitwardenAccountEncryptedJsonEnvelopeSchema, {
    encrypted: true,
    passwordProtected: false,
    encKeyValidation_DO_NOT_EDIT: markerResult.data,
    folders,
    items,
  })
  if (!envelopeResult.success) {
    return resultErrorCreate(
      op,
      `Account-encrypted export could not be validated: ${v.summarize(envelopeResult.issues)}`,
      {
        code: "platform.internal",
        statusCode: 500,
      },
    )
  }

  const referencesResult = bitwardenAccountEncryptedJsonEnvelopeReferencesValidate(envelopeResult.output)
  if (!referencesResult.success) return referencesResult
  return resultCreate(envelopeResult.output)
}
