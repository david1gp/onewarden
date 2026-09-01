import type { Result } from "#result"
import { extensionCipherKeyResolve } from "../../../extension/crypto/extensionCipherKeyResolve.js"
import { extensionEncStringDecryptText } from "../../../extension/crypto/extensionEncStringDecryptText.js"
import type { BitwardenEncryptedLoginCipher } from "../../../shared/api/bitwardenEncryptedLoginCipherSchema.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import { organizationApiClientCreate } from "../api/organizationApiClientCreate.js"
import { bitwardenOrganizationCsvFormat } from "./bitwardenOrganizationCsvFormat.js"
import { bitwardenOrganizationCsvLossyWarning } from "./bitwardenOrganizationCsvLossyWarning.js"
import type { BitwardenOrganizationCsvRecord } from "./bitwardenOrganizationCsvRecordSchema.js"
import { organizationCipherMap } from "./organizationCipherMap.js"

export interface BitwardenOrganizationCsvExportExecuteOptions {
  apiClient?: ReturnType<typeof organizationApiClientCreate>
  organizationId: string
  organizationKey?: Uint8Array | null
  session: ReturnType<typeof webAuthSessionCreate>
}

export interface BitwardenOrganizationCsvExportResult {
  cipherCount: number
  collectionCount: number
  content: string
  filename: string
  mimeType: string
  skippedCipherCount: number
  warnings: string[]
}

function recordIs(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function organizationKeyValidate(key: Uint8Array | null | undefined): Result<Uint8Array> {
  if (!(key instanceof Uint8Array) || key.byteLength !== 64)
    return resultErrorCreate("bitwardenOrganizationCsvExportExecute", "Organization key is unavailable.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  return resultCreate(key)
}

function collectionNameMapCreate(
  collections: Record<string, unknown>[],
  organizationId: string,
): Result<Map<string, string>> {
  const collectionNames = new Map<string, string>()
  const collectionIdsByName = new Map<string, string>()
  for (const [index, collection] of collections.entries()) {
    const id = collection.id
    const rawName = collection.name
    if (typeof id !== "string" || id.length === 0 || typeof rawName !== "string" || rawName.trim().length === 0)
      return resultErrorCreate(
        "bitwardenOrganizationCsvExportExecute",
        `Organization export contains an invalid collection at index ${index}.`,
        { code: "platform.invalid-request", statusCode: 400 },
      )
    const name = rawName.trim()
    if (
      collection.organizationId !== undefined &&
      collection.organizationId !== null &&
      collection.organizationId !== organizationId
    )
      return resultErrorCreate(
        "bitwardenOrganizationCsvExportExecute",
        `Organization collection '${id}' belongs to a different organization.`,
        { code: "platform.invalid-request", statusCode: 400 },
      )
    if (collectionNames.has(id))
      return resultErrorCreate(
        "bitwardenOrganizationCsvExportExecute",
        `Organization export contains duplicate collection id '${id}'.`,
        { code: "platform.invalid-request", statusCode: 400 },
      )
    const existingId = collectionIdsByName.get(name)
    if (existingId !== undefined && existingId !== id)
      return resultErrorCreate(
        "bitwardenOrganizationCsvExportExecute",
        `Organization export contains ambiguous collection name '${name}'.`,
        { code: "platform.invalid-request", statusCode: 400 },
      )
    if (name.includes(","))
      return resultErrorCreate(
        "bitwardenOrganizationCsvExportExecute",
        `Organization collection '${name}' cannot be represented unambiguously in Bitwarden CSV.`,
        { code: "platform.invalid-request", statusCode: 400 },
      )
    collectionNames.set(id, name)
    collectionIdsByName.set(name, id)
  }
  return resultCreate(collectionNames)
}

function cipherCollectionNamesRead(
  cipher: Record<string, unknown>,
  collectionNames: ReadonlyMap<string, string>,
  index: number,
): Result<string[]> {
  if (!Array.isArray(cipher.collectionIds) || cipher.collectionIds.length === 0)
    return resultErrorCreate(
      "bitwardenOrganizationCsvExportExecute",
      `Organization cipher at index ${index} does not reference a collection.`,
      { code: "platform.invalid-request", statusCode: 400 },
    )
  const names: string[] = []
  for (const collectionId of cipher.collectionIds) {
    if (typeof collectionId !== "string" || collectionId.length === 0)
      return resultErrorCreate(
        "bitwardenOrganizationCsvExportExecute",
        `Organization cipher at index ${index} has an invalid collection reference.`,
        { code: "platform.invalid-request", statusCode: 400 },
      )
    const name = collectionNames.get(collectionId)
    if (name === undefined)
      return resultErrorCreate(
        "bitwardenOrganizationCsvExportExecute",
        `Organization cipher at index ${index} references an unknown collection '${collectionId}'.`,
        { code: "platform.invalid-request", statusCode: 400 },
      )
    if (names.includes(name))
      return resultErrorCreate(
        "bitwardenOrganizationCsvExportExecute",
        `Organization cipher at index ${index} contains a duplicate collection reference.`,
        { code: "platform.invalid-request", statusCode: 400 },
      )
    names.push(name)
  }
  return resultCreate(names)
}

function itemDataRead(mappedCipher: Record<string, unknown>, type: number): Record<string, unknown> | null {
  const data = mappedCipher[type === 1 ? "login" : "secureNote"]
  return recordIs(data) ? data : null
}

export async function bitwardenOrganizationCsvExportExecute(
  options: BitwardenOrganizationCsvExportExecuteOptions,
): Promise<Result<BitwardenOrganizationCsvExportResult>> {
  const op = "bitwardenOrganizationCsvExportExecute"
  const currentSession = options.session.session()
  if (currentSession === null)
    return resultErrorCreate(op, "You must be logged in to export organization data.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  if (typeof options.organizationId !== "string" || options.organizationId.length === 0)
    return resultErrorCreate(op, "Organization id must not be empty.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })

  const organizationKeyResult = organizationKeyValidate(options.organizationKey)
  if (!organizationKeyResult.success) return organizationKeyResult
  const organizationKey = organizationKeyResult.data
  const client = options.apiClient ?? organizationApiClientCreate({ token: () => currentSession.accessToken })
  const exportResult = await client.organizationExport(options.organizationId)
  if (!exportResult.success) return exportResult
  const rawCollections = exportResult.data.collections
  const collectionNamesResult = collectionNameMapCreate(rawCollections, options.organizationId)
  if (!collectionNamesResult.success) return collectionNamesResult
  const collectionNames = collectionNamesResult.data
  const records: BitwardenOrganizationCsvRecord[] = []
  let skippedCipherCount = 0

  for (const [index, value] of exportResult.data.ciphers.entries()) {
    if (!recordIs(value))
      return resultErrorCreate(op, `Organization export contains an invalid cipher at index ${index}.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    if (value.deletedDate !== undefined && value.deletedDate !== null) continue
    if (
      value.organizationId !== undefined &&
      value.organizationId !== null &&
      value.organizationId !== options.organizationId
    )
      return resultErrorCreate(op, `Organization cipher at index ${index} belongs to a different organization.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    if (value.favorite !== undefined && value.favorite !== null && typeof value.favorite !== "boolean")
      return resultErrorCreate(op, `Organization cipher at index ${index} has an invalid favorite value.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    const reprompt = value.reprompt ?? 0
    if (reprompt !== 0 && reprompt !== 1)
      return resultErrorCreate(op, `Organization cipher at index ${index} has an invalid reprompt value.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    if (value.type !== 1 && value.type !== 2 && value.type !== 3 && value.type !== 4)
      return resultErrorCreate(op, `Bitwarden organization CSV does not support cipher type ${String(value.type)}.`, {
        code: "platform.unsupported",
        statusCode: 400,
      })
    if (value.type === 3 || value.type === 4) {
      skippedCipherCount++
      continue
    }

    const collectionNamesResultForCipher = cipherCollectionNamesRead(value, collectionNames, index)
    if (!collectionNamesResultForCipher.success) return collectionNamesResultForCipher
    const cipherKeyResult = await extensionCipherKeyResolve(
      { ...value, organizationId: options.organizationId } as unknown as BitwardenEncryptedLoginCipher,
      organizationKey,
      new Map([[options.organizationId, organizationKey]]),
    )
    if (!cipherKeyResult.success) return cipherKeyResult
    const cipherForCsv = { ...value }
    if (recordIs(value.login)) {
      const loginForCsv = { ...value.login }
      delete loginForCsv.fido2Credentials
      cipherForCsv.login = loginForCsv
    }
    const decryptedResult = await organizationCipherMap(cipherForCsv, (encrypted) =>
      extensionEncStringDecryptText(encrypted, cipherKeyResult.data),
    )
    if (!decryptedResult.success) return decryptedResult
    const mappedCipher = decryptedResult.data
    const itemData = itemDataRead(mappedCipher, value.type)
    if (itemData === null)
      return resultErrorCreate(op, `Organization cipher at index ${index} has no type-specific data.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    const fields = mappedCipher.fields
    if (fields !== undefined && fields !== null && !Array.isArray(fields))
      return resultErrorCreate(op, `Organization cipher at index ${index} has invalid custom fields.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    const login = value.type === 1 ? itemData : null
    const uris = login?.uris
    const firstUri = Array.isArray(uris) ? uris[0] : login?.uri
    const loginUri =
      recordIs(firstUri) && typeof firstUri.uri === "string"
        ? firstUri.uri
        : typeof firstUri === "string"
          ? firstUri
          : null
    records.push({
      collections: collectionNamesResultForCipher.data,
      favorite: value.favorite === true,
      fields: Array.isArray(fields)
        ? fields.map((field) => ({
            name: recordIs(field) && typeof field.name === "string" ? field.name : null,
            value: recordIs(field) && typeof field.value === "string" ? field.value : null,
          }))
        : [],
      login_password: login !== null && typeof login.password === "string" ? login.password : null,
      login_totp: login !== null && typeof login.totp === "string" ? login.totp : null,
      login_uri: loginUri,
      login_username: login !== null && typeof login.username === "string" ? login.username : null,
      name: typeof mappedCipher.name === "string" ? mappedCipher.name : "",
      notes: typeof mappedCipher.notes === "string" ? mappedCipher.notes : null,
      reprompt,
      type: value.type === 1 ? "login" : "note",
    })
  }

  const formattedResult = bitwardenOrganizationCsvFormat(records)
  if (!formattedResult.success) return formattedResult
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const warnings = [bitwardenOrganizationCsvLossyWarning]
  if (skippedCipherCount > 0)
    warnings.push(
      `${skippedCipherCount} organization cipher${skippedCipherCount === 1 ? " was" : "s were"} omitted because organization CSV supports login and secure-note items only.`,
    )
  return resultCreate({
    cipherCount: records.length,
    collectionCount: new Set(records.flatMap((record) => record.collections)).size,
    content: formattedResult.data,
    filename: `onewarden_organization_export_${timestamp}.csv`,
    mimeType: "text/csv",
    skippedCipherCount,
    warnings,
  })
}
