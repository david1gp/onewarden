import { type Result } from "#result"
import { bitwardenCipherStringDecryptText } from "../../../shared/crypto/bitwardenCipherStringDecryptText.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import { webAuthUserKeyUnlock } from "../../auth/model/webAuthUserKeyUnlock.js"
import { type BitwardenCsvRecord, bitwardenCsvFormat } from "./bitwardenCsvFormat.js"
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

  let userKey = options.session.getUserKey()
  if (userKey === null && options.password) {
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

  if (userKey === null && options.format !== "json-encrypted") {
    return resultErrorCreate(op, "Vault is locked. Master password is required for decrypted export.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  const client = options.apiClient ?? webSettingsApiClientCreate()
  const syncResult = await client.syncGet(currentSession.accessToken)
  if (!syncResult.success) return syncResult

  const syncData = syncResult.data
  const rawFolders = (Array.isArray(syncData.folders) ? syncData.folders : []) as Array<Record<string, unknown>>
  const rawCiphers = (Array.isArray(syncData.ciphers) ? syncData.ciphers : []) as Array<Record<string, unknown>>

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")

  if (options.format === "json-encrypted") {
    const exportPayload = {
      encrypted: true,
      folders: rawFolders,
      items: rawCiphers,
    }
    return resultCreate({
      filename: `onewarden_export_${timestamp}.json`,
      mimeType: "application/json",
      content: JSON.stringify(exportPayload, null, 2),
    })
  }

  if (userKey === null) {
    return resultErrorCreate(op, "Decryption key unavailable.")
  }

  // Decrypt folders
  const decryptedFolders: Array<{ id: string; name: string }> = []
  const folderNameMap = new Map<string, string>()
  const decryptionFailure = { errorMessage: null as string | null }

  for (const folder of rawFolders) {
    const id = String(folder.id ?? folder.uuid ?? "")
    const nameEncrypted = String(folder.name ?? "")
    const nameDecrypted = (await decryptOptionalString(nameEncrypted, userKey, decryptionFailure)) ?? ""
    decryptedFolders.push({ id, name: nameDecrypted })
    if (id) folderNameMap.set(id, nameDecrypted)
  }

  // Decrypt items
  const decryptedItems: Array<Record<string, unknown>> = []
  const csvRecords: BitwardenCsvRecord[] = []

  for (const cipher of rawCiphers) {
    const id = String(cipher.id ?? cipher.uuid ?? "")
    const folderId = cipher.folderId ? String(cipher.folderId) : null
    const type = typeof cipher.type === "number" ? cipher.type : 1
    const favorite = Boolean(cipher.favorite)
    const reprompt = typeof cipher.reprompt === "number" ? cipher.reprompt : 0

    const name = (await decryptOptionalString(cipher.name, userKey, decryptionFailure)) ?? ""
    const notes = await decryptOptionalString(cipher.notes, userKey, decryptionFailure)

    const rawLogin = cipher.login as Record<string, unknown> | undefined
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

      if (Array.isArray(rawLogin.uris)) {
        for (const u of rawLogin.uris as Array<Record<string, unknown>>) {
          const decryptedUri = await decryptOptionalString(u.uri, userKey, decryptionFailure)
          if (decryptedUri) {
            uris.push({ uri: decryptedUri, match: (u.match as number) ?? null })
            if (!csvUri) csvUri = decryptedUri
          }
        }
      }

      csvUsername = username
      csvPassword = password
      csvTotp = totp

      loginData = {
        uris,
        username,
        password,
        totp,
      }
    }

    const rawCard = cipher.card as Record<string, unknown> | undefined
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

    const rawIdentity = cipher.identity as Record<string, unknown> | undefined
    let identityData: Record<string, unknown> | undefined
    if (rawIdentity) {
      identityData = {
        title: await decryptOptionalString(rawIdentity.title, userKey, decryptionFailure),
        firstName: await decryptOptionalString(rawIdentity.firstName, userKey, decryptionFailure),
        middleName: await decryptOptionalString(rawIdentity.middleName, userKey, decryptionFailure),
        lastName: await decryptOptionalString(rawIdentity.lastName, userKey, decryptionFailure),
        address1: await decryptOptionalString(rawIdentity.address1, userKey, decryptionFailure),
        address2: await decryptOptionalString(rawIdentity.address2, userKey, decryptionFailure),
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

    const rawFields = cipher.fields as Array<Record<string, unknown>> | undefined
    const decryptedFields: Array<Record<string, unknown>> = []
    if (Array.isArray(rawFields)) {
      for (const field of rawFields) {
        decryptedFields.push({
          name: await decryptOptionalString(field.name, userKey, decryptionFailure),
          value: await decryptOptionalString(field.value, userKey, decryptionFailure),
          type: field.type ?? 0,
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
      login: loginData,
      card: cardData,
      identity: identityData,
      fields: decryptedFields.length > 0 ? decryptedFields : undefined,
    })

    const typeNames: Record<number, string> = {
      1: "login",
      2: "note",
      3: "card",
      4: "identity",
    }

    csvRecords.push({
      folder: folderId ? (folderNameMap.get(folderId) ?? null) : null,
      favorite,
      type: typeNames[type] ?? "login",
      name,
      notes,
      fields: decryptedFields.length > 0 ? JSON.stringify(decryptedFields) : null,
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

  return resultCreate({
    filename: `onewarden_export_${timestamp}.json`,
    mimeType: "application/json",
    content: JSON.stringify(exportPayload, null, 2),
  })
}
