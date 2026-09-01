import type { Result } from "#result"
import { extensionEncStringEncrypt } from "../../../extension/crypto/extensionEncStringEncrypt.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import { bitwardenCsvFieldsParse } from "../../settings/model/bitwardenCsvFieldsParse.js"
import { organizationApiClientCreate } from "../api/organizationApiClientCreate.js"
import { bitwardenOrganizationCsvLossyWarning } from "./bitwardenOrganizationCsvLossyWarning.js"
import { bitwardenOrganizationCsvParse } from "./bitwardenOrganizationCsvParse.js"
import { organizationCipherMap } from "./organizationCipherMap.js"

export interface BitwardenOrganizationCsvImportExecuteOptions {
  apiClient?: ReturnType<typeof organizationApiClientCreate>
  organizationId: string
  organizationKey?: Uint8Array | null
  rawContent: string
  session: ReturnType<typeof webAuthSessionCreate>
}

export interface BitwardenOrganizationCsvImportResult {
  cipherCount: number
  collectionCount: number
  warnings: string[]
}

function organizationKeyValidate(key: Uint8Array | null | undefined): Result<Uint8Array> {
  if (!(key instanceof Uint8Array) || key.byteLength !== 64)
    return resultErrorCreate("bitwardenOrganizationCsvImportExecute", "Organization key is unavailable.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  return resultCreate(key)
}

function collectionImportDataCreate(name: string): Record<string, unknown> {
  return {
    externalId: null,
    groups: [],
    id: null,
    name,
    users: [],
  }
}

export async function bitwardenOrganizationCsvImportExecute(
  options: BitwardenOrganizationCsvImportExecuteOptions,
): Promise<Result<BitwardenOrganizationCsvImportResult>> {
  const op = "bitwardenOrganizationCsvImportExecute"
  const currentSession = options.session.session()
  if (currentSession === null)
    return resultErrorCreate(op, "You must be logged in to import organization data.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  if (typeof options.organizationId !== "string" || options.organizationId.length === 0)
    return resultErrorCreate(op, "Organization id must not be empty.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })

  const parsedResult = bitwardenOrganizationCsvParse(options.rawContent)
  if (!parsedResult.success) return parsedResult
  const organizationKeyResult = organizationKeyValidate(options.organizationKey)
  if (!organizationKeyResult.success) return organizationKeyResult
  const organizationKey = organizationKeyResult.data

  const collectionIndexByName = new Map<string, number>()
  const collections: Record<string, unknown>[] = []
  const collectionRelationships: Array<{ key: number; value: number }> = []
  const ciphers: Record<string, unknown>[] = []

  for (const [index, record] of parsedResult.data.entries()) {
    const fieldsResult = bitwardenCsvFieldsParse(typeof record.fields === "string" ? record.fields : null)
    if (!fieldsResult.success) return fieldsResult

    for (const collectionName of record.collections) {
      let collectionIndex = collectionIndexByName.get(collectionName)
      if (collectionIndex === undefined) {
        collectionIndex = collections.length
        collectionIndexByName.set(collectionName, collectionIndex)
        collections.push(collectionImportDataCreate(collectionName))
      }
      collectionRelationships.push({ key: index, value: collectionIndex })
    }

    const encryptedResult = await organizationCipherMap(
      {
        archivedDate: null,
        favorite: record.favorite ?? false,
        fields: fieldsResult.data,
        folderId: null,
        id: null,
        identity: null,
        key: null,
        login:
          record.type === "login"
            ? {
                password: record.login_password,
                passwordRevisionDate: null,
                totp: record.login_totp,
                uris:
                  record.login_uri === null || record.login_uri === undefined
                    ? []
                    : [{ match: null, uri: record.login_uri }],
                username: record.login_username,
              }
            : null,
        name: record.name,
        notes: record.notes,
        organizationId: options.organizationId,
        passwordHistory: [],
        reprompt: record.reprompt ?? 0,
        secureNote: record.type === "note" ? { type: 0 } : null,
        type: record.type === "login" ? 1 : 2,
      },
      (value) => extensionEncStringEncrypt(value, organizationKey),
    )
    if (!encryptedResult.success) return encryptedResult

    ciphers.push(encryptedResult.data)
  }

  const client = options.apiClient ?? organizationApiClientCreate({ token: () => currentSession.accessToken })
  const importResult = await client.organizationImport(options.organizationId, {
    ciphers,
    collections,
    collectionRelationships,
  })
  if (!importResult.success) return importResult

  return resultCreate({
    cipherCount: ciphers.length,
    collectionCount: collections.length,
    warnings: [bitwardenOrganizationCsvLossyWarning],
  })
}
