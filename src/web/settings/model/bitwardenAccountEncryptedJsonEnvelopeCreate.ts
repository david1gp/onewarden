import * as v from "valibot"
import type { Result } from "#result"
import { bitwardenCipherStringDecryptText } from "../../../shared/crypto/bitwardenCipherStringDecryptText.js"
import { bitwardenCipherStringEncrypt } from "../../../shared/crypto/bitwardenCipherStringEncrypt.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { bitwardenAccountEncryptedJsonEnvelopeReferencesValidate } from "./bitwardenAccountEncryptedJsonEnvelopeReferencesValidate.js"
import {
  type BitwardenAccountEncryptedJsonEnvelope,
  bitwardenAccountEncryptedJsonEnvelopeSchema,
} from "./bitwardenAccountEncryptedJsonEnvelopeSchema.js"
import type { BitwardenEncryptedSync } from "./bitwardenEncryptedSyncSchema.js"
import { bitwardenEncryptedSyncSchema } from "./bitwardenEncryptedSyncSchema.js"

type EncryptedCipher = BitwardenEncryptedSync["ciphers"][number]
type AccountEnvelope = v.InferOutput<typeof bitwardenAccountEncryptedJsonEnvelopeSchema>
type AccountItem = AccountEnvelope["items"][number]
type AccountLogin = NonNullable<AccountItem["login"]>

function invalidInputResult<T>(message: string): Result<T> {
  return resultErrorCreate("bitwardenAccountEncryptedJsonEnvelopeCreate", message, {
    code: "platform.invalid-request",
    statusCode: 400,
  })
}

function cipherTypeDataResolve(cipher: EncryptedCipher): unknown {
  if (cipher.type === 1) return cipher.login
  if (cipher.type === 2) return cipher.secureNote
  if (cipher.type === 3) return cipher.card
  if (cipher.type === 4) return cipher.identity
  return undefined
}

function fido2CredentialCreate(credential: Record<string, unknown>) {
  return {
    credentialId: credential.credentialId,
    keyType: credential.keyType,
    keyAlgorithm: credential.keyAlgorithm,
    keyCurve: credential.keyCurve,
    keyValue: credential.keyValue,
    rpId: credential.rpId,
    ...(credential.userHandle === undefined ? {} : { userHandle: credential.userHandle }),
    ...(credential.userName === undefined ? {} : { userName: credential.userName }),
    counter: credential.counter,
    ...(credential.rpName === undefined ? {} : { rpName: credential.rpName }),
    ...(credential.userDisplayName === undefined ? {} : { userDisplayName: credential.userDisplayName }),
    discoverable: credential.discoverable,
    creationDate: credential.creationDate,
  }
}

function loginCreate(cipher: EncryptedCipher): Record<string, unknown> | null {
  if (cipher.login === undefined || cipher.login === null) return null
  const login = cipher.login as Record<string, unknown>
  const rawUris = login.uris
  const uris =
    Array.isArray(rawUris) && rawUris.every((uri) => typeof uri === "object" && uri !== null)
      ? rawUris.map((rawUri) => {
          const uri = rawUri as Record<string, unknown>
          return {
            uri: uri.uri,
            ...(uri.uriChecksum === undefined ? {} : { uriChecksum: uri.uriChecksum }),
            ...(uri.match === undefined ? {} : { match: uri.match }),
          }
        })
      : rawUris
  const rawFido2Credentials = login.fido2Credentials
  const fido2Credentials =
    Array.isArray(rawFido2Credentials) &&
    rawFido2Credentials.every((credential) => typeof credential === "object" && credential !== null)
      ? rawFido2Credentials.map((credential) => fido2CredentialCreate(credential as Record<string, unknown>))
      : rawFido2Credentials

  return {
    ...(login.username === undefined ? {} : { username: login.username }),
    ...(login.password === undefined ? {} : { password: login.password }),
    ...(login.uris === undefined ? {} : { uris }),
    ...(login.uri === undefined ? {} : { uri: login.uri }),
    ...(login.totp === undefined ? {} : { totp: login.totp }),
    ...(login.fido2Credentials === undefined ? {} : { fido2Credentials }),
    ...(login.passwordRevisionDate === undefined ? {} : { passwordRevisionDate: login.passwordRevisionDate }),
  }
}

function cardCreate(cipher: EncryptedCipher): Record<string, unknown> | null {
  if (cipher.card === undefined || cipher.card === null) return null
  const card = cipher.card as Record<string, unknown>
  return {
    ...(card.cardholderName === undefined ? {} : { cardholderName: card.cardholderName }),
    ...(card.brand === undefined ? {} : { brand: card.brand }),
    ...(card.number === undefined ? {} : { number: card.number }),
    ...(card.expMonth === undefined ? {} : { expMonth: card.expMonth }),
    ...(card.expYear === undefined ? {} : { expYear: card.expYear }),
    ...(card.code === undefined ? {} : { code: card.code }),
  }
}

function identityCreate(cipher: EncryptedCipher): Record<string, unknown> | null {
  if (cipher.identity === undefined || cipher.identity === null) return null
  const identity = cipher.identity as Record<string, unknown>
  return {
    ...(identity.title === undefined ? {} : { title: identity.title }),
    ...(identity.firstName === undefined ? {} : { firstName: identity.firstName }),
    ...(identity.middleName === undefined ? {} : { middleName: identity.middleName }),
    ...(identity.lastName === undefined ? {} : { lastName: identity.lastName }),
    ...(identity.address1 === undefined ? {} : { address1: identity.address1 }),
    ...(identity.address2 === undefined ? {} : { address2: identity.address2 }),
    ...(identity.address3 === undefined ? {} : { address3: identity.address3 }),
    ...(identity.city === undefined ? {} : { city: identity.city }),
    ...(identity.state === undefined ? {} : { state: identity.state }),
    ...(identity.postalCode === undefined ? {} : { postalCode: identity.postalCode }),
    ...(identity.country === undefined ? {} : { country: identity.country }),
    ...(identity.company === undefined ? {} : { company: identity.company }),
    ...(identity.email === undefined ? {} : { email: identity.email }),
    ...(identity.phone === undefined ? {} : { phone: identity.phone }),
    ...(identity.ssn === undefined ? {} : { ssn: identity.ssn }),
    ...(identity.username === undefined ? {} : { username: identity.username }),
    ...(identity.passportNumber === undefined ? {} : { passportNumber: identity.passportNumber }),
    ...(identity.licenseNumber === undefined ? {} : { licenseNumber: identity.licenseNumber }),
  }
}

function fieldsCreate(cipher: EncryptedCipher): Array<Record<string, unknown>> | null | undefined {
  if (cipher.fields === undefined || cipher.fields === null) return cipher.fields
  return cipher.fields.map((field) => ({
    name: field.name,
    value: field.value,
    type: field.type,
    linkedId: field.linkedId,
  }))
}

function passwordHistoryCreate(cipher: EncryptedCipher): Array<Record<string, unknown>> | null | undefined {
  if (cipher.passwordHistory === undefined || cipher.passwordHistory === null) return cipher.passwordHistory
  return cipher.passwordHistory.map((entry) => ({
    password: entry.password,
    lastUsedDate: entry.lastUsedDate,
  }))
}

function encryptedValuesCollect(item: AccountItem): string[] {
  const values: string[] = []
  const add = (value: string | null | undefined): void => {
    if (value !== undefined && value !== null) values.push(value)
  }

  add(item.name)
  add(item.notes)

  const login: AccountLogin | null | undefined = item.login
  if (login !== undefined && login !== null) {
    add(login.username)
    add(login.password)
    add(login.uri)
    add(login.totp)
    for (const uri of login.uris ?? []) {
      add(uri.uri)
      add(uri.uriChecksum)
    }
    for (const credential of login.fido2Credentials ?? []) {
      add(credential.credentialId)
      add(credential.keyType)
      add(credential.keyAlgorithm)
      add(credential.keyCurve)
      add(credential.keyValue)
      add(credential.rpId)
      add(credential.userHandle)
      add(credential.userName)
      add(credential.counter)
      add(credential.rpName)
      add(credential.userDisplayName)
      add(credential.discoverable)
    }
  }

  for (const field of item.fields ?? []) {
    add(field.name)
    add(field.value)
  }
  for (const entry of item.passwordHistory ?? []) add(entry.password)

  if (item.card !== undefined && item.card !== null) {
    for (const value of Object.values(item.card)) add(value)
  }
  if (item.identity !== undefined && item.identity !== null) {
    for (const value of Object.values(item.identity)) add(value)
  }

  return values
}

async function encryptedEnvelopeCiphertextsValidate(
  envelope: AccountEnvelope,
  userKey: Uint8Array,
): Promise<Result<void>> {
  const encryptedValues = envelope.folders.map((folder) => folder.name)
  for (const item of envelope.items) encryptedValues.push(...encryptedValuesCollect(item))

  for (const encryptedValue of encryptedValues) {
    const decryptResult = await bitwardenCipherStringDecryptText(encryptedValue, userKey)
    if (!decryptResult.success) {
      return resultErrorCreate(
        "bitwardenAccountEncryptedJsonEnvelopeCreate",
        "Encrypted sync data cannot be decrypted with the account key.",
        {
          code: "platform.unauthorized",
          statusCode: 401,
        },
      )
    }
  }

  return resultCreate(undefined)
}

function itemCreate(cipher: EncryptedCipher): Record<string, unknown> {
  return {
    id: cipher.id,
    organizationId: null,
    ...(cipher.folderId === undefined ? {} : { folderId: cipher.folderId }),
    type: cipher.type,
    ...(cipher.reprompt === undefined ? {} : { reprompt: cipher.reprompt }),
    name: cipher.name,
    ...(cipher.notes === undefined ? {} : { notes: cipher.notes }),
    ...(cipher.favorite === undefined ? {} : { favorite: cipher.favorite }),
    login: cipher.type === 1 ? loginCreate(cipher) : null,
    secureNote:
      cipher.type === 2
        ? { type: (cipher.secureNote as { type?: number | null } | null | undefined)?.type ?? 0 }
        : null,
    card: cipher.type === 3 ? cardCreate(cipher) : null,
    identity: cipher.type === 4 ? identityCreate(cipher) : null,
    ...(cipher.fields === undefined ? {} : { fields: fieldsCreate(cipher) }),
    ...(cipher.passwordHistory === undefined ? {} : { passwordHistory: passwordHistoryCreate(cipher) }),
    collectionIds: null,
    ...(cipher.creationDate === undefined ? {} : { creationDate: cipher.creationDate }),
    ...(cipher.revisionDate === undefined ? {} : { revisionDate: cipher.revisionDate }),
    deletedDate: null,
    ...(cipher.archivedDate === undefined ? {} : { archivedDate: cipher.archivedDate }),
  }
}

export async function bitwardenAccountEncryptedJsonEnvelopeCreate(
  rawSync: unknown,
  userKey: Uint8Array,
): Promise<Result<BitwardenAccountEncryptedJsonEnvelope>> {
  const op = "bitwardenAccountEncryptedJsonEnvelopeCreate"
  const syncResult = v.safeParse(bitwardenEncryptedSyncSchema, rawSync)
  if (!syncResult.success)
    return invalidInputResult(`Invalid Bitwarden encrypted sync data: ${v.summarize(syncResult.issues)}`)
  if (!(userKey instanceof Uint8Array) || userKey.byteLength !== 64) {
    return invalidInputResult("Bitwarden account user key must be 64 bytes.")
  }

  const folderIds = new Set<string>()
  for (const folder of syncResult.output.folders) {
    if (folder.id.length === 0) return invalidInputResult("Encrypted sync folder id must not be empty.")
    if (folderIds.has(folder.id))
      return invalidInputResult(`Encrypted sync contains duplicate folder id '${folder.id}'.`)
    folderIds.add(folder.id)
  }

  const items: Array<Record<string, unknown>> = []
  for (const cipher of syncResult.output.ciphers) {
    if (cipher.organizationId !== undefined && cipher.organizationId !== null) continue
    if (cipher.deletedDate !== undefined && cipher.deletedDate !== null) continue
    if (cipher.key !== undefined && cipher.key !== null) continue
    if (cipher.collectionIds !== undefined && cipher.collectionIds !== null && cipher.collectionIds.length > 0) continue
    if (cipher.type !== 1 && cipher.type !== 2 && cipher.type !== 3 && cipher.type !== 4) {
      return invalidInputResult(`Encrypted sync item '${cipher.id}' has unsupported cipher type ${cipher.type}.`)
    }

    if (cipher.folderId !== undefined && cipher.folderId !== null) {
      if (cipher.folderId.length === 0 || !folderIds.has(cipher.folderId)) {
        return invalidInputResult(
          `Encrypted sync item '${cipher.id}' references a missing folder '${cipher.folderId}'.`,
        )
      }
    }
    const typeData = cipherTypeDataResolve(cipher)
    if (typeData === undefined || typeData === null) {
      return invalidInputResult(`Encrypted sync item '${cipher.id}' is missing data for cipher type ${cipher.type}.`)
    }
    items.push(itemCreate(cipher))
  }

  const markerResult = await bitwardenCipherStringEncrypt(crypto.randomUUID(), userKey)
  if (!markerResult.success) return markerResult

  // Account-restricted exports retain ciphertext from the validated sync response.
  const envelopeResult = v.safeParse(bitwardenAccountEncryptedJsonEnvelopeSchema, {
    encrypted: true,
    passwordProtected: false,
    encKeyValidation_DO_NOT_EDIT: markerResult.data,
    folders: syncResult.output.folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      ...(folder.revisionDate === undefined ? {} : { revisionDate: folder.revisionDate }),
      ...(folder.object === undefined ? {} : { object: folder.object }),
    })),
    items,
  })
  if (!envelopeResult.success) {
    return resultErrorCreate(
      op,
      `Account-encrypted export could not be validated: ${v.summarize(envelopeResult.issues)}`,
      {
        code: "platform.invalid-request",
        statusCode: 400,
      },
    )
  }

  const referencesResult = bitwardenAccountEncryptedJsonEnvelopeReferencesValidate(envelopeResult.output)
  if (!referencesResult.success) return referencesResult
  const ciphertextsResult = await encryptedEnvelopeCiphertextsValidate(envelopeResult.output, userKey)
  if (!ciphertextsResult.success) return ciphertextsResult
  return resultCreate(envelopeResult.output)
}
