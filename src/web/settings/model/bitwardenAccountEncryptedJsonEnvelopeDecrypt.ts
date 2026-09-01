import * as v from "valibot"
import type { Result } from "#result"
import { extensionFido2CredentialDecrypt } from "../../../extension/crypto/extensionFido2CredentialDecrypt.js"
import { bitwardenCipherStringDecrypt } from "../../../shared/crypto/bitwardenCipherStringDecrypt.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { BitwardenJsonItem } from "./bitwardenJsonItemSchema.js"
import type { BitwardenJsonPayload } from "./bitwardenJsonPayloadSchema.js"
import { bitwardenJsonPayloadSchema } from "./bitwardenJsonPayloadSchema.js"
import {
  bitwardenAccountEncryptedJsonEnvelopeSchema,
  type BitwardenAccountEncryptedJsonEnvelope,
} from "./bitwardenAccountEncryptedJsonEnvelopeSchema.js"
import { bitwardenAccountEncryptedJsonEnvelopeKeyValidate } from "./bitwardenAccountEncryptedJsonEnvelopeKeyValidate.js"
import { bitwardenAccountEncryptedJsonEnvelopeReferencesValidate } from "./bitwardenAccountEncryptedJsonEnvelopeReferencesValidate.js"
import { bitwardenAccountEncryptedJsonSensitiveValueClear } from "./bitwardenAccountEncryptedJsonSensitiveValueClear.js"

type AccountItem = BitwardenAccountEncryptedJsonEnvelope["items"][number]
type AccountLogin = NonNullable<AccountItem["login"]>
type AccountField = NonNullable<AccountItem["fields"]>[number]
type AccountPasswordHistoryEntry = NonNullable<AccountItem["passwordHistory"]>[number]
type JsonItem = BitwardenJsonItem
type JsonLogin = NonNullable<JsonItem["login"]>
type JsonField = NonNullable<JsonItem["fields"]>[number]
type JsonPasswordHistoryEntry = NonNullable<JsonItem["passwordHistory"]>[number]

function invalidEnvelopeResult<T>(message: string): Result<T> {
  return resultErrorCreate("bitwardenAccountEncryptedJsonEnvelopeDecrypt", message, {
    code: "platform.invalid-request",
    statusCode: 400,
  })
}

function authenticationResult<T>(): Result<T> {
  return resultErrorCreate(
    "bitwardenAccountEncryptedJsonEnvelopeDecrypt",
    "Account-encrypted Bitwarden export key or integrity check failed.",
    { code: "platform.unauthorized", statusCode: 401 },
  )
}

async function stringDecrypt(value: string, userKey: Uint8Array): Promise<Result<string>> {
  const decrypted = await bitwardenCipherStringDecrypt(value, userKey)
  if (!decrypted.success) return authenticationResult()

  try {
    return resultCreate(new TextDecoder("utf-8", { fatal: true }).decode(decrypted.data))
  } catch {
    return invalidEnvelopeResult("Account-encrypted Bitwarden value is not valid UTF-8.")
  } finally {
    decrypted.data.fill(0)
  }
}

async function optionalStringDecrypt(
  value: string | null | undefined,
  userKey: Uint8Array,
): Promise<Result<string | null | undefined>> {
  if (value === undefined || value === null) return resultCreate(value)
  return stringDecrypt(value, userKey)
}

async function loginDecrypt(value: AccountLogin, userKey: Uint8Array): Promise<Result<JsonLogin>> {
  let uris: JsonLogin["uris"]
  if (value.uris === undefined || value.uris === null) {
    uris = value.uris
  } else {
    const decryptedUris: NonNullable<JsonLogin["uris"]> = []
    for (const uri of value.uris) {
      const decryptedUri = await stringDecrypt(uri.uri, userKey)
      if (!decryptedUri.success) return decryptedUri
      if (uri.uriChecksum !== undefined && uri.uriChecksum !== null) {
        const checksumResult = await stringDecrypt(uri.uriChecksum, userKey)
        if (!checksumResult.success) return checksumResult
      }
      decryptedUris.push({ uri: decryptedUri.data, ...(uri.match === undefined ? {} : { match: uri.match }) })
    }
    uris = decryptedUris
  }

  if (value.uri !== undefined && value.uri !== null) {
    const uriResult = await stringDecrypt(value.uri, userKey)
    if (!uriResult.success) return uriResult
  }

  const username = await optionalStringDecrypt(value.username, userKey)
  if (!username.success) return username
  const password = await optionalStringDecrypt(value.password, userKey)
  if (!password.success) return password
  const totp = await optionalStringDecrypt(value.totp, userKey)
  if (!totp.success) return totp

  let fido2Credentials: JsonLogin["fido2Credentials"]
  if (value.fido2Credentials === undefined || value.fido2Credentials === null) {
    fido2Credentials = value.fido2Credentials
  } else {
    const decryptedCredentials: NonNullable<JsonLogin["fido2Credentials"]> = []
    for (const credential of value.fido2Credentials) {
      const decryptedCredential = await extensionFido2CredentialDecrypt(credential, userKey)
      if (!decryptedCredential.success) return invalidEnvelopeResult(decryptedCredential.errorMessage)
      decryptedCredentials.push(decryptedCredential.data)
    }
    fido2Credentials = decryptedCredentials
  }

  return resultCreate({
    ...(value.username === undefined ? {} : { username: username.data }),
    ...(value.password === undefined ? {} : { password: password.data }),
    ...(value.uris === undefined ? {} : { uris }),
    ...(value.totp === undefined ? {} : { totp: totp.data }),
    ...(value.fido2Credentials === undefined ? {} : { fido2Credentials }),
    ...(value.passwordRevisionDate === undefined ? {} : { passwordRevisionDate: value.passwordRevisionDate }),
  })
}

async function fieldDecrypt(value: AccountField, userKey: Uint8Array): Promise<Result<JsonField>> {
  const name = await optionalStringDecrypt(value.name, userKey)
  if (!name.success) return name
  const fieldValue = await optionalStringDecrypt(value.value, userKey)
  if (!fieldValue.success) return fieldValue
  return resultCreate({
    name: value.name === undefined ? null : (name.data ?? null),
    value: value.value === undefined ? null : (fieldValue.data ?? null),
    type: value.type,
    linkedId: value.linkedId === undefined ? null : value.linkedId,
  })
}

async function passwordHistoryEntryDecrypt(
  value: AccountPasswordHistoryEntry,
  userKey: Uint8Array,
): Promise<Result<JsonPasswordHistoryEntry>> {
  const password = await stringDecrypt(value.password, userKey)
  if (!password.success) return password
  return resultCreate({ password: password.data, lastUsedDate: value.lastUsedDate })
}

async function itemDecrypt(value: AccountItem, userKey: Uint8Array): Promise<Result<JsonItem>> {
  const name = await stringDecrypt(value.name, userKey)
  if (!name.success) return name
  const notes = await optionalStringDecrypt(value.notes, userKey)
  if (!notes.success) return notes

  let login: JsonItem["login"]
  if (value.login === undefined || value.login === null) {
    login = value.login
  } else {
    const loginResult = await loginDecrypt(value.login, userKey)
    if (!loginResult.success) return loginResult
    login = loginResult.data
  }

  let card: JsonItem["card"]
  if (value.card === undefined || value.card === null) {
    card = value.card
  } else {
    const decryptedCard: NonNullable<JsonItem["card"]> = {}
    for (const field of ["cardholderName", "brand", "number", "expMonth", "expYear", "code"] as const) {
      const decryptedValue = await optionalStringDecrypt(value.card[field], userKey)
      if (!decryptedValue.success) return decryptedValue
      if (value.card[field] !== undefined) decryptedCard[field] = decryptedValue.data
    }
    card = decryptedCard
  }

  let identity: JsonItem["identity"]
  if (value.identity === undefined || value.identity === null) {
    identity = value.identity
  } else {
    const decryptedIdentity: NonNullable<JsonItem["identity"]> = {}
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
      const decryptedValue = await optionalStringDecrypt(value.identity[field], userKey)
      if (!decryptedValue.success) return decryptedValue
      if (value.identity[field] !== undefined) decryptedIdentity[field] = decryptedValue.data
    }
    identity = decryptedIdentity
  }

  let fields: JsonItem["fields"]
  if (value.fields === undefined || value.fields === null) {
    fields = value.fields
  } else {
    const decryptedFields: NonNullable<JsonItem["fields"]> = []
    for (const field of value.fields) {
      const decryptedField = await fieldDecrypt(field, userKey)
      if (!decryptedField.success) return decryptedField
      decryptedFields.push(decryptedField.data)
    }
    fields = decryptedFields
  }

  let passwordHistory: JsonItem["passwordHistory"]
  if (value.passwordHistory === undefined || value.passwordHistory === null) {
    passwordHistory = value.passwordHistory
  } else {
    const decryptedPasswordHistory: NonNullable<JsonItem["passwordHistory"]> = []
    for (const entry of value.passwordHistory) {
      const decryptedEntry = await passwordHistoryEntryDecrypt(entry, userKey)
      if (!decryptedEntry.success) return decryptedEntry
      decryptedPasswordHistory.push(decryptedEntry.data)
    }
    passwordHistory = decryptedPasswordHistory
  }

  return resultCreate({
    id: value.id,
    organizationId: null,
    ...(value.folderId === undefined ? {} : { folderId: value.folderId }),
    type: value.type,
    ...(value.reprompt === undefined ? {} : { reprompt: value.reprompt }),
    name: name.data,
    ...(value.notes === undefined ? {} : { notes: notes.data }),
    ...(value.favorite === undefined ? {} : { favorite: value.favorite }),
    login: value.type === 1 ? login : null,
    secureNote: value.type === 2 ? { type: value.secureNote?.type ?? 0 } : null,
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

export async function bitwardenAccountEncryptedJsonEnvelopeDecrypt(
  rawEnvelope: unknown,
  userKey: Uint8Array,
): Promise<Result<BitwardenJsonPayload>> {
  const parsedEnvelope = v.safeParse(bitwardenAccountEncryptedJsonEnvelopeSchema, rawEnvelope)
  if (!parsedEnvelope.success) {
    return invalidEnvelopeResult(
      `Invalid account-encrypted Bitwarden JSON envelope: ${v.summarize(parsedEnvelope.issues)}`,
    )
  }
  if (!(userKey instanceof Uint8Array) || userKey.byteLength !== 64) {
    return invalidEnvelopeResult("Bitwarden account user key must be 64 bytes.")
  }

  const envelope = parsedEnvelope.output
  const referencesResult = bitwardenAccountEncryptedJsonEnvelopeReferencesValidate(envelope)
  if (!referencesResult.success) return referencesResult

  const keyValidationResult = await bitwardenAccountEncryptedJsonEnvelopeKeyValidate(envelope, userKey)
  if (!keyValidationResult.success) {
    if (keyValidationResult.code === "platform.invalid-request") return keyValidationResult
    return authenticationResult()
  }

  const folders: BitwardenJsonPayload["folders"] = []
  const items: BitwardenJsonPayload["items"] = []
  let completed = false
  try {
    for (const folder of envelope.folders) {
      const name = await stringDecrypt(folder.name, userKey)
      if (!name.success) return name
      folders.push({
        id: folder.id,
        name: name.data,
        ...(folder.revisionDate === undefined ? {} : { revisionDate: folder.revisionDate }),
        ...(folder.object === undefined ? {} : { object: folder.object }),
      })
    }

    for (const item of envelope.items) {
      const decryptedItem = await itemDecrypt(item, userKey)
      if (!decryptedItem.success) return decryptedItem
      items.push(decryptedItem.data)
    }

    const payloadResult = v.safeParse(bitwardenJsonPayloadSchema, { encrypted: false, folders, items })
    if (!payloadResult.success) {
      return invalidEnvelopeResult(`Account-encrypted export data is invalid: ${v.summarize(payloadResult.issues)}`)
    }
    completed = true
    return resultCreate(payloadResult.output)
  } finally {
    if (!completed) {
      bitwardenAccountEncryptedJsonSensitiveValueClear(folders)
      bitwardenAccountEncryptedJsonSensitiveValueClear(items)
    }
  }
}
