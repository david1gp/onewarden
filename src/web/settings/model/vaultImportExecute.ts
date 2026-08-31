import * as v from "valibot"
import { type Result } from "#result"
import { extensionFido2CredentialEncrypt } from "../../../extension/crypto/extensionFido2CredentialEncrypt.js"
import type { BitwardenFido2Credential } from "../../../shared/api/bitwardenFido2CredentialSchema.js"
import { bitwardenCipherStringEncrypt } from "../../../shared/crypto/bitwardenCipherStringEncrypt.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import { webAuthUserKeyUnlock } from "../../auth/model/webAuthUserKeyUnlock.js"
import { bitwardenCsvFieldsParse } from "./bitwardenCsvFieldsParse.js"
import { bitwardenCsvLossyWarning } from "./bitwardenCsvLossyWarning.js"
import { bitwardenCsvParse } from "./bitwardenCsvParse.js"
import type { BitwardenJsonPayload } from "./bitwardenJsonPayloadSchema.js"
import { bitwardenJsonPayloadSchema } from "./bitwardenJsonPayloadSchema.js"
import { bitwardenPortableEncryptedJsonEnvelopeDecrypt } from "./bitwardenPortableEncryptedJsonEnvelopeDecrypt.js"
import { webSettingsApiClientCreate } from "./webSettingsApiClientCreate.js"

export interface VaultImportExecuteOptions {
  session: ReturnType<typeof webAuthSessionCreate>
  rawContent: string
  format: "json" | "csv"
  filePassword?: string
  masterPassword?: string
  apiClient?: ReturnType<typeof webSettingsApiClientCreate>
}

async function encryptString(
  value: string,
  userKey: Uint8Array,
  failure: { errorMessage: string | null },
): Promise<string> {
  const enc = await bitwardenCipherStringEncrypt(value, userKey)
  if (enc.success) return enc.data
  failure.errorMessage ??= enc.errorMessage
  return ""
}

async function encryptOptional(
  value: string | null | undefined,
  userKey: Uint8Array,
  failure: { errorMessage: string | null },
): Promise<string | null> {
  if (value === null || value === undefined) return null
  return encryptString(value, userKey, failure)
}

export async function vaultImportExecute(
  options: VaultImportExecuteOptions,
): Promise<Result<{ cipherCount: number; folderCount: number; warnings: string[] }>> {
  const op = "vaultImportExecute"
  const currentSession = options.session.session()
  if (currentSession === null) {
    return resultErrorCreate(op, "You must be logged in to import vault data.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  }

  let jsonPayload: BitwardenJsonPayload | undefined
  if (options.format === "json") {
    let rawPayload: unknown
    try {
      rawPayload = JSON.parse(options.rawContent)
    } catch {
      return resultErrorCreate(op, "Invalid JSON vault file format.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }

    const rawPayloadRecord =
      typeof rawPayload === "object" && rawPayload !== null ? (rawPayload as Record<string, unknown>) : null
    if (rawPayloadRecord !== null && "encrypted" in rawPayloadRecord && rawPayloadRecord.encrypted === true) {
      if (rawPayloadRecord.passwordProtected !== true) {
        return resultErrorCreate(
          op,
          "Account-restricted Bitwarden encrypted JSON exports cannot be imported. Use a password-protected portable export.",
          { code: "platform.unsupported", statusCode: 400 },
        )
      }
      if (!options.filePassword) {
        return resultErrorCreate(op, "A password is required for password-protected JSON import.", {
          code: "platform.invalid-request",
          statusCode: 400,
        })
      }
      const decryptedPayloadResult = await bitwardenPortableEncryptedJsonEnvelopeDecrypt(
        rawPayload,
        options.filePassword,
      )
      if (!decryptedPayloadResult.success) return decryptedPayloadResult
      jsonPayload = decryptedPayloadResult.data
    } else {
      const parsedPayloadResult = v.safeParse(bitwardenJsonPayloadSchema, rawPayload)
      if (!parsedPayloadResult.success) {
        return resultErrorCreate(op, `Invalid Bitwarden JSON vault file: ${v.summarize(parsedPayloadResult.issues)}`, {
          code: "platform.invalid-request",
          statusCode: 400,
        })
      }
      jsonPayload = parsedPayloadResult.output
    }

    const folderIndexById = new Map<string, number>()
    for (const [index, folder] of jsonPayload.folders.entries()) {
      if (folder.id === undefined || folder.id === null || folder.id === "") continue
      if (folderIndexById.has(folder.id)) {
        return resultErrorCreate(op, `Invalid Bitwarden JSON vault file: duplicate folder id '${folder.id}'.`, {
          code: "platform.invalid-request",
          statusCode: 400,
        })
      }
      folderIndexById.set(folder.id, index)
    }

    for (const [index, item] of jsonPayload.items.entries()) {
      if (item.organizationId !== undefined && item.organizationId !== null) {
        return resultErrorCreate(
          op,
          `Invalid Bitwarden JSON vault file: organization-owned item at index ${index} is not supported.`,
          { code: "platform.invalid-request", statusCode: 400 },
        )
      }
      if (item.deletedDate !== undefined && item.deletedDate !== null) {
        return resultErrorCreate(
          op,
          `Invalid Bitwarden JSON vault file: trashed item at index ${index} is not supported.`,
          { code: "platform.invalid-request", statusCode: 400 },
        )
      }
      if (item.folderId !== undefined && item.folderId !== null) {
        if (item.folderId === "" || !folderIndexById.has(item.folderId)) {
          return resultErrorCreate(
            op,
            `Invalid Bitwarden JSON vault file: item at index ${index} references a missing folder '${item.folderId}'.`,
            { code: "platform.invalid-request", statusCode: 400 },
          )
        }
      }

      const typeData =
        item.type === 1 ? item.login : item.type === 2 ? item.secureNote : item.type === 3 ? item.card : item.identity
      if (typeData === undefined || typeData === null) {
        return resultErrorCreate(
          op,
          `Invalid Bitwarden JSON vault file: item at index ${index} is missing data for cipher type ${item.type}.`,
          { code: "platform.invalid-request", statusCode: 400 },
        )
      }
    }
  }

  let userKey = options.session.getUserKey()
  if (userKey === null && options.masterPassword) {
    const kdfMetadata = {
      kdfType: currentSession.kdf,
      iterations: currentSession.kdfIterations,
      memory: currentSession.kdfMemory,
      parallelism: currentSession.kdfParallelism,
    }
    const unlockResult = await webAuthUserKeyUnlock(
      options.masterPassword,
      currentSession.email,
      kdfMetadata,
      currentSession.encryptedUserKey,
    )
    if (!unlockResult.success) {
      return resultErrorCreate(op, "Invalid master password for import.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    userKey = unlockResult.data
  }

  if (userKey === null) {
    return resultErrorCreate(op, "Vault is locked. Master password is required to import vault data.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  let parsedFolders: Array<{ id?: string | null; name: string }> = []
  let parsedItems: Array<{
    folderName?: string | null
    folderId?: string | null
    type: number
    name: string
    notes?: string | null
    favorite?: boolean | null
    reprompt?: number | null
    login?: {
      uris?: Array<{ uri: string; match?: number | null }> | null
      username?: string | null
      password?: string | null
      totp?: string | null
      passwordRevisionDate?: string | null
      fido2Credentials?: Array<BitwardenFido2Credential> | null
    } | null
    secureNote?: { type?: number | null } | null
    card?: {
      cardholderName?: string | null
      brand?: string | null
      number?: string | null
      expMonth?: string | null
      expYear?: string | null
      code?: string | null
    } | null
    identity?: {
      title?: string | null
      firstName?: string | null
      middleName?: string | null
      lastName?: string | null
      address1?: string | null
      address2?: string | null
      address3?: string | null
      city?: string | null
      state?: string | null
      postalCode?: string | null
      country?: string | null
      company?: string | null
      email?: string | null
      phone?: string | null
      ssn?: string | null
      username?: string | null
      passportNumber?: string | null
      licenseNumber?: string | null
    } | null
    fields?: Array<{
      name?: string | null
      value?: string | null
      type?: number | null
      linkedId?: number | null
    }> | null
    passwordHistory?: Array<{ password: string; lastUsedDate: string }> | null
    archivedDate?: string | null
  }> = []

  if (options.format === "csv") {
    const csvParsedResult = bitwardenCsvParse(options.rawContent)
    if (!csvParsedResult.success) return csvParsedResult

    const folderNames = new Set<string>()
    for (const rec of csvParsedResult.data) {
      const folder = rec.folder ?? null
      if (folder !== null && folder.length > 0) {
        folderNames.add(folder)
      }

      const type = rec.type === "login" ? 1 : 2
      const fieldsText = typeof rec.fields === "string" ? rec.fields : null
      const fieldsResult = bitwardenCsvFieldsParse(fieldsText)
      if (!fieldsResult.success) return fieldsResult

      parsedItems.push({
        folderName: folder,
        type,
        name: rec.name,
        notes: rec.notes,
        favorite: rec.favorite,
        reprompt: rec.reprompt,
        login:
          type === 1
            ? {
                uris: rec.login_uri ? [{ uri: rec.login_uri, match: null }] : [],
                username: rec.login_username,
                password: rec.login_password,
                totp: rec.login_totp,
              }
            : null,
        fields: fieldsResult.data,
      })
    }

    parsedFolders = Array.from(folderNames).map((name) => ({ name }))
  } else if (jsonPayload !== undefined) {
    parsedFolders = jsonPayload.folders
    parsedItems = jsonPayload.items
  }

  // Encrypt folders
  const encryptedFolders: Array<{ id: null; name: string }> = []
  const folderIndexMap = new Map<string, number>()
  const encryptionFailure = { errorMessage: null as string | null }

  for (let i = 0; i < parsedFolders.length; i++) {
    const f = parsedFolders[i]
    if (!f) continue
    const encName = await encryptString(f.name, userKey, encryptionFailure)
    encryptedFolders.push({ id: null, name: encName })
    if (f.name) folderIndexMap.set(f.name, i)
    if (f.id) folderIndexMap.set(f.id, i)
  }

  // Encrypt ciphers & map folder relations
  const encryptedCiphers: unknown[] = []
  const folderRelationships: Array<{ key: number; value: number }> = []

  for (let i = 0; i < parsedItems.length; i++) {
    const item = parsedItems[i]
    if (!item) continue

    const folderReference = item.folderId ?? item.folderName ?? null
    if (folderReference && folderIndexMap.has(folderReference)) {
      const fIdx = folderIndexMap.get(folderReference)
      if (fIdx !== undefined) {
        folderRelationships.push({ key: i, value: fIdx })
      }
    }

    const encName = await encryptString(item.name, userKey, encryptionFailure)
    const encNotes = await encryptOptional(item.notes, userKey, encryptionFailure)

    let encLogin: Record<string, unknown> | null = null
    if (item.login) {
      const encUris: Array<{ uri: string; match?: number | null }> = []
      if (Array.isArray(item.login.uris)) {
        for (const u of item.login.uris) {
          encUris.push({ uri: await encryptString(u.uri, userKey, encryptionFailure), match: u.match ?? null })
        }
      }
      let encryptedFido2Credentials: unknown
      if (item.login.fido2Credentials !== undefined) {
        if (item.login.fido2Credentials === null) {
          encryptedFido2Credentials = null
        } else {
          const fido2Credentials: unknown[] = []
          for (const credential of item.login.fido2Credentials) {
            const credentialResult = await extensionFido2CredentialEncrypt(credential, userKey)
            if (!credentialResult.success) {
              encryptionFailure.errorMessage ??= credentialResult.errorMessage
              continue
            }
            fido2Credentials.push(credentialResult.data)
          }
          encryptedFido2Credentials = fido2Credentials
        }
      }
      encLogin = {
        uris: encUris,
        username: await encryptOptional(item.login.username, userKey, encryptionFailure),
        password: await encryptOptional(item.login.password, userKey, encryptionFailure),
        totp: await encryptOptional(item.login.totp, userKey, encryptionFailure),
        passwordRevisionDate: item.login.passwordRevisionDate ?? null,
        ...(encryptedFido2Credentials === undefined ? {} : { fido2Credentials: encryptedFido2Credentials }),
      }
    }

    let encCard: Record<string, unknown> | null = null
    if (item.card) {
      encCard = {
        cardholderName: await encryptOptional(item.card.cardholderName, userKey, encryptionFailure),
        brand: await encryptOptional(item.card.brand, userKey, encryptionFailure),
        number: await encryptOptional(item.card.number, userKey, encryptionFailure),
        expMonth: await encryptOptional(item.card.expMonth, userKey, encryptionFailure),
        expYear: await encryptOptional(item.card.expYear, userKey, encryptionFailure),
        code: await encryptOptional(item.card.code, userKey, encryptionFailure),
      }
    }

    let encIdentity: Record<string, unknown> | null = null
    if (item.identity) {
      encIdentity = {
        title: await encryptOptional(item.identity.title, userKey, encryptionFailure),
        firstName: await encryptOptional(item.identity.firstName, userKey, encryptionFailure),
        middleName: await encryptOptional(item.identity.middleName, userKey, encryptionFailure),
        lastName: await encryptOptional(item.identity.lastName, userKey, encryptionFailure),
        address1: await encryptOptional(item.identity.address1, userKey, encryptionFailure),
        address2: await encryptOptional(item.identity.address2, userKey, encryptionFailure),
        address3: await encryptOptional(item.identity.address3, userKey, encryptionFailure),
        city: await encryptOptional(item.identity.city, userKey, encryptionFailure),
        state: await encryptOptional(item.identity.state, userKey, encryptionFailure),
        postalCode: await encryptOptional(item.identity.postalCode, userKey, encryptionFailure),
        country: await encryptOptional(item.identity.country, userKey, encryptionFailure),
        company: await encryptOptional(item.identity.company, userKey, encryptionFailure),
        email: await encryptOptional(item.identity.email, userKey, encryptionFailure),
        phone: await encryptOptional(item.identity.phone, userKey, encryptionFailure),
        ssn: await encryptOptional(item.identity.ssn, userKey, encryptionFailure),
        username: await encryptOptional(item.identity.username, userKey, encryptionFailure),
        passportNumber: await encryptOptional(item.identity.passportNumber, userKey, encryptionFailure),
        licenseNumber: await encryptOptional(item.identity.licenseNumber, userKey, encryptionFailure),
      }
    }

    const encFields: Array<Record<string, unknown>> = []
    if (Array.isArray(item.fields)) {
      for (const field of item.fields) {
        encFields.push({
          name: await encryptOptional(field.name, userKey, encryptionFailure),
          value: await encryptOptional(field.value, userKey, encryptionFailure),
          type: field.type ?? 0,
          linkedId: field.linkedId ?? null,
        })
      }
    }

    const encryptedPasswordHistory: Array<{ password: string; lastUsedDate: string }> = []
    if (Array.isArray(item.passwordHistory)) {
      for (const entry of item.passwordHistory) {
        encryptedPasswordHistory.push({
          password: await encryptString(entry.password, userKey, encryptionFailure),
          lastUsedDate: entry.lastUsedDate,
        })
      }
    }

    encryptedCiphers.push({
      id: null,
      type: item.type,
      folderId: null,
      organizationId: null,
      name: encName,
      notes: encNotes,
      favorite: item.favorite ?? false,
      login: item.type === 1 ? encLogin : null,
      card: item.type === 3 ? encCard : null,
      identity: item.type === 4 ? encIdentity : null,
      secureNote: item.type === 2 ? { type: item.secureNote?.type ?? 0 } : null,
      fields: encFields,
      passwordHistory: encryptedPasswordHistory,
      reprompt: item.reprompt ?? 0,
      archivedDate: item.archivedDate ?? null,
    })
  }

  if (encryptionFailure.errorMessage !== null) {
    return resultErrorCreate(op, `Vault data could not be encrypted: ${encryptionFailure.errorMessage}`, {
      code: "platform.internal",
      statusCode: 500,
    })
  }

  const client = options.apiClient ?? webSettingsApiClientCreate()
  const importResult = await client.ciphersImport(currentSession.accessToken, {
    ciphers: encryptedCiphers,
    folders: encryptedFolders,
    folderRelationships,
  })

  if (!importResult.success) return importResult

  const warnings = "warnings" in importResult.data ? [...importResult.data.warnings] : []
  if (options.format === "csv") warnings.unshift(bitwardenCsvLossyWarning)
  const importedCipherCount =
    "importedCipherCount" in importResult.data ? importResult.data.importedCipherCount : undefined
  const importedFolderCount =
    "importedFolderCount" in importResult.data ? importResult.data.importedFolderCount : undefined

  return resultCreate({
    cipherCount: importedCipherCount ?? encryptedCiphers.length,
    folderCount: importedFolderCount ?? encryptedFolders.length,
    warnings,
  })
}
