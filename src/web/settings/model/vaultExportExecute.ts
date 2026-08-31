import * as v from "valibot"
import { type Result } from "#result"
import { extensionCipherKeyResolve } from "../../../extension/crypto/extensionCipherKeyResolve.js"
import { extensionFido2CredentialDecrypt } from "../../../extension/crypto/extensionFido2CredentialDecrypt.js"
import type { BitwardenEncryptedLoginCipher } from "../../../shared/api/bitwardenEncryptedLoginCipherSchema.js"
import { bitwardenCipherStringDecryptText } from "../../../shared/crypto/bitwardenCipherStringDecryptText.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import { webAuthUserKeyUnlock } from "../../auth/model/webAuthUserKeyUnlock.js"
import { type BitwardenCsvRecord, bitwardenCsvFormat } from "./bitwardenCsvFormat.js"
import { bitwardenEncryptedSyncSchema } from "./bitwardenEncryptedSyncSchema.js"
import { bitwardenJsonPayloadSchema } from "./bitwardenJsonPayloadSchema.js"
import { bitwardenPortableEncryptedJsonEnvelopeEncrypt } from "./bitwardenPortableEncryptedJsonEnvelopeEncrypt.js"
import type { VaultExportFormat } from "./vaultExportSchema.js"
import { webSettingsApiClientCreate } from "./webSettingsApiClientCreate.js"

export interface VaultExportExecuteOptions {
  session: ReturnType<typeof webAuthSessionCreate>
  format: VaultExportFormat
  password?: string
  apiClient?: ReturnType<typeof webSettingsApiClientCreate>
}

export interface VaultExportResult {
  filename: string
  mimeType: string
  content: string
}

async function decryptOptionalString(
  encrypted: unknown,
  userKey: Uint8Array,
  failure: { errorMessage: string | null },
): Promise<string | null> {
  if (typeof encrypted !== "string" || encrypted.length === 0) return null
  const result = await bitwardenCipherStringDecryptText(encrypted, userKey)
  if (result.success) return result.data
  failure.errorMessage ??= result.errorMessage
  return null
}

export async function vaultExportExecute(options: VaultExportExecuteOptions): Promise<Result<VaultExportResult>> {
  const op = "vaultExportExecute"
  const currentSession = options.session.session()
  if (currentSession === null) {
    return resultErrorCreate(op, "You must be logged in to export vault data.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  }

  if (options.format === "json-encrypted" && (!options.password || options.password.length === 0)) {
    return resultErrorCreate(op, "A password is required for password-protected JSON export.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  let userKey = options.session.getUserKey()
  if (userKey === null && options.format !== "json-encrypted" && options.password) {
    const kdfMetadata = {
      kdfType: currentSession.kdf,
      iterations: currentSession.kdfIterations,
      memory: currentSession.kdfMemory,
      parallelism: currentSession.kdfParallelism,
    }
    const unlockResult = await webAuthUserKeyUnlock(
      options.password,
      currentSession.email,
      kdfMetadata,
      currentSession.encryptedUserKey,
    )
    if (!unlockResult.success) {
      return resultErrorCreate(op, "Invalid master password for export.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    userKey = unlockResult.data
  }

  if (userKey === null) {
    return resultErrorCreate(
      op,
      options.format === "json-encrypted"
        ? "Vault is locked. Unlock the vault before creating a password-protected export."
        : "Vault is locked. Master password is required for decrypted export.",
      {
        code: "platform.invalid-request",
        statusCode: 400,
      },
    )
  }

  const client = options.apiClient ?? webSettingsApiClientCreate()
  const syncResult = await client.syncGet(currentSession.accessToken)
  if (!syncResult.success) return syncResult

  const syncDataResult = v.safeParse(bitwardenEncryptedSyncSchema, syncResult.data)
  if (!syncDataResult.success) {
    return resultErrorCreate(op, `Invalid Bitwarden sync response: ${v.summarize(syncDataResult.issues)}`, {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  const syncData = syncDataResult.output
  const rawFolders = syncData.folders
  const rawCiphers = syncData.ciphers

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")

  if (userKey === null) {
    return resultErrorCreate(op, "Decryption key unavailable.")
  }

  // Decrypt folders
  const decryptedFolders: Array<{ id: string; name: string }> = []
  const folderNameMap = new Map<string, string>()
  const decryptionFailure = { errorMessage: null as string | null }

  for (const folder of rawFolders) {
    if (folder.id.length === 0) {
      return resultErrorCreate(op, "Invalid Bitwarden sync response: folder id must not be empty.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    if (folderNameMap.has(folder.id)) {
      return resultErrorCreate(op, `Invalid Bitwarden sync response: duplicate folder id '${folder.id}'.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    const nameDecrypted = (await decryptOptionalString(folder.name, userKey, decryptionFailure)) ?? ""
    const id = folder.id
    decryptedFolders.push({ id, name: nameDecrypted })
    folderNameMap.set(id, nameDecrypted)
  }

  // Decrypt items
  const decryptedItems: Array<Record<string, unknown>> = []
  const csvRecords: BitwardenCsvRecord[] = []

  for (const cipher of rawCiphers) {
    const isJsonExport = options.format === "json-decrypted"
    const isCsvExport = options.format === "csv-decrypted"
    const isPortableJsonExport = options.format === "json-encrypted"
    const isIndividualExport = isJsonExport || isCsvExport || isPortableJsonExport
    if (isIndividualExport && cipher.organizationId !== undefined && cipher.organizationId !== null) continue
    if (isIndividualExport && cipher.deletedDate !== undefined && cipher.deletedDate !== null) continue

    const type = cipher.type
    if (type !== 1 && type !== 2 && type !== 3 && type !== 4) {
      return resultErrorCreate(op, `Bitwarden export does not support cipher type ${type}.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    if (isCsvExport && type !== 1 && type !== 2) continue

    const folderId = cipher.folderId ?? null
    if (isIndividualExport && folderId !== null && (folderId === "" || !folderNameMap.has(folderId))) {
      return resultErrorCreate(
        op,
        `Invalid Bitwarden sync response: cipher references a missing folder '${folderId}'.`,
        {
          code: "platform.invalid-request",
          statusCode: 400,
        },
      )
    }

    if (isJsonExport || isPortableJsonExport) {
      const typeData =
        type === 1 ? cipher.login : type === 2 ? cipher.secureNote : type === 3 ? cipher.card : cipher.identity
      if (typeData === undefined || typeData === null) {
        return resultErrorCreate(
          op,
          `Invalid Bitwarden sync response: cipher type ${type} has no type-specific data.`,
          {
            code: "platform.invalid-request",
            statusCode: 400,
          },
        )
      }
    }

    const id = cipher.id
    const favorite = cipher.favorite === true
    const reprompt = cipher.reprompt ?? 0

    const name = (await decryptOptionalString(cipher.name, userKey, decryptionFailure)) ?? ""
    const notes = await decryptOptionalString(cipher.notes, userKey, decryptionFailure)

    const rawLogin = cipher.login
    let loginData: Record<string, unknown> | undefined
    let csvUri: string | null = null
    let csvUsername: string | null = null
    let csvPassword: string | null = null
    let csvTotp: string | null = null

    if (rawLogin) {
      const username = await decryptOptionalString(rawLogin.username, userKey, decryptionFailure)
      const password = await decryptOptionalString(rawLogin.password, userKey, decryptionFailure)
      const totp = await decryptOptionalString(rawLogin.totp, userKey, decryptionFailure)
      const uris: Array<{ uri: string; match?: number | null }> = []

      for (const u of rawLogin.uris) {
        const decryptedUri = await decryptOptionalString(u.uri, userKey, decryptionFailure)
        if (decryptedUri !== null) {
          uris.push({ uri: decryptedUri, match: u.match ?? null })
          if (csvUri === null) csvUri = decryptedUri
        }
      }

      csvUsername = username
      csvPassword = password
      csvTotp = totp

      let decryptedFido2Credentials: unknown
      if (rawLogin.fido2Credentials !== undefined) {
        if (rawLogin.fido2Credentials === null) {
          decryptedFido2Credentials = null
        } else {
          const cipherKeyResult = await extensionCipherKeyResolve(
            cipher as unknown as BitwardenEncryptedLoginCipher,
            userKey,
          )
          if (!cipherKeyResult.success) {
            decryptionFailure.errorMessage ??= cipherKeyResult.errorMessage
          } else {
            const fido2Credentials: unknown[] = []
            for (const credential of rawLogin.fido2Credentials) {
              const credentialResult = await extensionFido2CredentialDecrypt(credential, cipherKeyResult.data)
              if (!credentialResult.success) {
                decryptionFailure.errorMessage ??= credentialResult.errorMessage
                continue
              }
              fido2Credentials.push(credentialResult.data)
            }
            decryptedFido2Credentials = fido2Credentials
          }
        }
      }

      loginData = {
        uris,
        username,
        password,
        totp,
        passwordRevisionDate: rawLogin.passwordRevisionDate ?? null,
        ...(decryptedFido2Credentials === undefined ? {} : { fido2Credentials: decryptedFido2Credentials }),
      }
    }

    const rawCard = cipher.card
    let cardData: Record<string, unknown> | undefined
    if (rawCard) {
      cardData = {
        cardholderName: await decryptOptionalString(rawCard.cardholderName, userKey, decryptionFailure),
        brand: await decryptOptionalString(rawCard.brand, userKey, decryptionFailure),
        number: await decryptOptionalString(rawCard.number, userKey, decryptionFailure),
        expMonth: await decryptOptionalString(rawCard.expMonth, userKey, decryptionFailure),
        expYear: await decryptOptionalString(rawCard.expYear, userKey, decryptionFailure),
        code: await decryptOptionalString(rawCard.code, userKey, decryptionFailure),
      }
    }

    const rawIdentity = cipher.identity
    let identityData: Record<string, unknown> | undefined
    if (rawIdentity) {
      identityData = {
        title: await decryptOptionalString(rawIdentity.title, userKey, decryptionFailure),
        firstName: await decryptOptionalString(rawIdentity.firstName, userKey, decryptionFailure),
        middleName: await decryptOptionalString(rawIdentity.middleName, userKey, decryptionFailure),
        lastName: await decryptOptionalString(rawIdentity.lastName, userKey, decryptionFailure),
        address1: await decryptOptionalString(rawIdentity.address1, userKey, decryptionFailure),
        address2: await decryptOptionalString(rawIdentity.address2, userKey, decryptionFailure),
        address3: await decryptOptionalString(rawIdentity.address3, userKey, decryptionFailure),
        city: await decryptOptionalString(rawIdentity.city, userKey, decryptionFailure),
        state: await decryptOptionalString(rawIdentity.state, userKey, decryptionFailure),
        postalCode: await decryptOptionalString(rawIdentity.postalCode, userKey, decryptionFailure),
        country: await decryptOptionalString(rawIdentity.country, userKey, decryptionFailure),
        company: await decryptOptionalString(rawIdentity.company, userKey, decryptionFailure),
        email: await decryptOptionalString(rawIdentity.email, userKey, decryptionFailure),
        phone: await decryptOptionalString(rawIdentity.phone, userKey, decryptionFailure),
        ssn: await decryptOptionalString(rawIdentity.ssn, userKey, decryptionFailure),
        username: await decryptOptionalString(rawIdentity.username, userKey, decryptionFailure),
        passportNumber: await decryptOptionalString(rawIdentity.passportNumber, userKey, decryptionFailure),
        licenseNumber: await decryptOptionalString(rawIdentity.licenseNumber, userKey, decryptionFailure),
      }
    }

    const rawFields = cipher.fields
    const decryptedFields: Array<{
      name: string | null
      value: string | null
      type: number
      linkedId: number | null
    }> = []
    if (Array.isArray(rawFields)) {
      for (const field of rawFields) {
        decryptedFields.push({
          name: await decryptOptionalString(field.name, userKey, decryptionFailure),
          value: await decryptOptionalString(field.value, userKey, decryptionFailure),
          type: field.type,
          linkedId: field.linkedId,
        })
      }
    }

    const decryptedPasswordHistory: Array<{ password: string; lastUsedDate: string }> = []
    if ((isJsonExport || isPortableJsonExport) && Array.isArray(cipher.passwordHistory)) {
      for (const entry of cipher.passwordHistory) {
        decryptedPasswordHistory.push({
          password: (await decryptOptionalString(entry.password, userKey, decryptionFailure)) ?? "",
          lastUsedDate: entry.lastUsedDate,
        })
      }
    }

    decryptedItems.push({
      id,
      folderId,
      type,
      name,
      notes,
      favorite,
      reprompt,
      organizationId: null,
      login: type === 1 ? loginData : null,
      secureNote: type === 2 ? cipher.secureNote : null,
      card: type === 3 ? cardData : null,
      identity: type === 4 ? identityData : null,
      fields: decryptedFields,
      passwordHistory: decryptedPasswordHistory,
      collectionIds: [],
      creationDate: cipher.creationDate ?? null,
      revisionDate: cipher.revisionDate ?? null,
      deletedDate: cipher.deletedDate ?? null,
      archivedDate: cipher.archivedDate ?? null,
    })

    const csvFields = decryptedFields.map((field) => ({
      name: field.name,
      value: field.value,
    }))

    csvRecords.push({
      folder: folderId ? (folderNameMap.get(folderId) ?? null) : null,
      favorite,
      type: type === 1 ? "login" : "note",
      name,
      notes,
      fields: csvFields.length > 0 ? csvFields : null,
      reprompt,
      login_uri: csvUri,
      login_username: csvUsername,
      login_password: csvPassword,
      login_totp: csvTotp,
    })
  }

  if (decryptionFailure.errorMessage !== null) {
    return resultErrorCreate(op, `Vault data could not be decrypted: ${decryptionFailure.errorMessage}`, {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  if (options.format === "csv-decrypted") {
    return resultCreate({
      filename: `onewarden_export_${timestamp}.csv`,
      mimeType: "text/csv",
      content: bitwardenCsvFormat(csvRecords),
    })
  }

  const exportPayload = {
    encrypted: false,
    folders: decryptedFolders,
    items: decryptedItems,
  }
  const exportPayloadResult = v.safeParse(bitwardenJsonPayloadSchema, exportPayload)
  if (!exportPayloadResult.success) {
    return resultErrorCreate(
      op,
      `Bitwarden JSON export contains unsupported data: ${v.summarize(exportPayloadResult.issues)}`,
      {
        code: "platform.invalid-request",
        statusCode: 400,
      },
    )
  }

  if (options.format === "json-encrypted") {
    if (!options.password) {
      return resultErrorCreate(op, "A password is required for password-protected JSON export.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    const encryptedPayloadResult = await bitwardenPortableEncryptedJsonEnvelopeEncrypt(
      JSON.stringify(exportPayloadResult.output),
      options.password,
    )
    if (!encryptedPayloadResult.success) return encryptedPayloadResult
    return resultCreate({
      filename: `onewarden_export_${timestamp}.json`,
      mimeType: "application/json",
      content: JSON.stringify(encryptedPayloadResult.data, null, 2),
    })
  }

  return resultCreate({
    filename: `onewarden_export_${timestamp}.json`,
    mimeType: "application/json",
    content: JSON.stringify(exportPayloadResult.output, null, 2),
  })
}
