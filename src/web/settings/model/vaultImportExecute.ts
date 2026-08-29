import { type Result } from "#result"
import { bitwardenCipherStringEncrypt } from "../../../shared/crypto/bitwardenCipherStringEncrypt.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import { webAuthUserKeyUnlock } from "../../auth/model/webAuthUserKeyUnlock.js"
import { bitwardenCsvParse } from "./bitwardenCsvParse.js"
import { webSettingsApiClientCreate } from "./webSettingsApiClientCreate.js"

export interface VaultImportExecuteOptions {
  session: ReturnType<typeof webAuthSessionCreate>
  rawContent: string
  format: "json" | "csv"
  password?: string
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
  if (value === null || value === undefined || value === "") return null
  return encryptString(value, userKey, failure)
}

export async function vaultImportExecute(
  options: VaultImportExecuteOptions,
): Promise<Result<{ cipherCount: number; folderCount: number }>> {
  const op = "vaultImportExecute"
  const currentSession = options.session.session()
  if (currentSession === null) {
    return resultErrorCreate(op, "You must be logged in to import vault data.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  }

  if (options.format === "json") {
    let encryptedPayload: unknown
    try {
      encryptedPayload = JSON.parse(options.rawContent)
    } catch {
      return resultErrorCreate(op, "Invalid JSON vault file format.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }

    if (
      encryptedPayload !== null &&
      typeof encryptedPayload === "object" &&
      "encrypted" in encryptedPayload &&
      encryptedPayload.encrypted === true
    ) {
      const folders = "folders" in encryptedPayload ? encryptedPayload.folders : undefined
      const items = "items" in encryptedPayload ? encryptedPayload.items : undefined
      if (!Array.isArray(folders) || !Array.isArray(items)) {
        return resultErrorCreate(op, "Encrypted vault export must contain folders and items arrays.", {
          code: "platform.invalid-request",
          statusCode: 400,
        })
      }

      const folderIndexById = new Map<string, number>()
      const importedFolders: Array<{ id: null; name: string }> = []
      for (const [index, folder] of folders.entries()) {
        if (folder === null || typeof folder !== "object" || !("name" in folder) || typeof folder.name !== "string") {
          return resultErrorCreate(op, "Encrypted vault export contains an invalid folder.", {
            code: "platform.invalid-request",
            statusCode: 400,
          })
        }
        if ("id" in folder && typeof folder.id === "string") folderIndexById.set(folder.id, index)
        importedFolders.push({ id: null, name: folder.name })
      }

      const importedCiphers: Record<string, unknown>[] = []
      const folderRelationships: Array<{ key: number; value: number }> = []
      for (const [index, item] of items.entries()) {
        if (item === null || typeof item !== "object" || !("name" in item) || typeof item.name !== "string") {
          return resultErrorCreate(op, "Encrypted vault export contains an invalid item.", {
            code: "platform.invalid-request",
            statusCode: 400,
          })
        }
        const itemRecord = item as Record<string, unknown>
        const folderId = typeof itemRecord.folderId === "string" ? itemRecord.folderId : null
        if (folderId !== null) {
          const folderIndex = folderIndexById.get(folderId)
          if (folderIndex !== undefined) folderRelationships.push({ key: index, value: folderIndex })
        }
        importedCiphers.push({ ...itemRecord, id: undefined, folderId: null, organizationId: null })
      }

      const client = options.apiClient ?? webSettingsApiClientCreate()
      const importResult = await client.ciphersImport(currentSession.accessToken, {
        ciphers: importedCiphers,
        folders: importedFolders,
        folderRelationships,
      })
      if (!importResult.success) return importResult
      return resultCreate({ cipherCount: importedCiphers.length, folderCount: importedFolders.length })
    }
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
    } | null
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
    fields?: Array<{ name?: string | null; value?: string | null; type?: number | null }> | null
  }> = []

  if (options.format === "csv") {
    const csvParsedResult = bitwardenCsvParse(options.rawContent)
    if (!csvParsedResult.success) return csvParsedResult

    const folderNames = new Set<string>()
    for (const rec of csvParsedResult.data) {
      if (rec.folder && rec.folder.trim().length > 0) {
        folderNames.add(rec.folder.trim())
      }

      const typeMap: Record<string, number> = {
        login: 1,
        note: 2,
        securenote: 2,
        card: 3,
        identity: 4,
      }
      const type = typeMap[rec.type.toLowerCase()] ?? 1

      parsedItems.push({
        folderName: rec.folder?.trim() || null,
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
      })
    }

    parsedFolders = Array.from(folderNames).map((name) => ({ name }))
  } else {
    try {
      const json = JSON.parse(options.rawContent)
      if (Array.isArray(json.folders)) {
        parsedFolders = json.folders.map((f: { id?: string; name?: string }) => ({
          id: f.id ?? null,
          name: f.name ?? "Folder",
        }))
      }
      if (Array.isArray(json.items)) {
        parsedItems = json.items.map(
          (item: {
            folderId?: string
            type?: number
            name?: string
            notes?: string
            favorite?: boolean
            reprompt?: number
            login?: Record<string, unknown>
            card?: Record<string, unknown>
            identity?: Record<string, unknown>
            fields?: Array<Record<string, unknown>>
          }) => ({
            folderName: item.folderId ?? null,
            type: typeof item.type === "number" ? item.type : 1,
            name: item.name ?? "Untitled",
            notes: item.notes ?? null,
            favorite: item.favorite ?? false,
            reprompt: item.reprompt ?? 0,
            login: item.login ? (item.login as any) : null,
            card: item.card ? (item.card as any) : null,
            identity: item.identity ? (item.identity as any) : null,
            fields: item.fields ? (item.fields as any) : null,
          }),
        )
      }
    } catch {
      return resultErrorCreate(op, "Invalid JSON vault file format.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
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

    if (item.folderName && folderIndexMap.has(item.folderName)) {
      const fIdx = folderIndexMap.get(item.folderName)
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
          if (u.uri) {
            encUris.push({ uri: await encryptString(u.uri, userKey, encryptionFailure), match: u.match ?? null })
          }
        }
      }
      encLogin = {
        uris: encUris.length > 0 ? encUris : null,
        username: await encryptOptional(item.login.username, userKey, encryptionFailure),
        password: await encryptOptional(item.login.password, userKey, encryptionFailure),
        totp: await encryptOptional(item.login.totp, userKey, encryptionFailure),
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
        })
      }
    }

    encryptedCiphers.push({
      type: item.type,
      folderId: null,
      organizationId: null,
      name: encName,
      notes: encNotes,
      favorite: item.favorite ?? false,
      login: encLogin,
      card: encCard,
      identity: encIdentity,
      secureNote: item.type === 2 ? { type: 0 } : null,
      fields: encFields.length > 0 ? encFields : null,
      passwordHistory: null,
      reprompt: item.reprompt ?? 0,
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

  return resultCreate({
    cipherCount: encryptedCiphers.length,
    folderCount: encryptedFolders.length,
  })
}
