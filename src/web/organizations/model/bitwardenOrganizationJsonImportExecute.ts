import type { Result } from "#result"
import { extensionEncStringEncrypt } from "../../../extension/crypto/extensionEncStringEncrypt.js"
import { extensionFido2CredentialEncrypt } from "../../../extension/crypto/extensionFido2CredentialEncrypt.js"
import type { BitwardenFido2Credential } from "../../../shared/api/bitwardenFido2CredentialSchema.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import { organizationApiClientCreate } from "../api/organizationApiClientCreate.js"
import { bitwardenOrganizationJsonParse } from "./bitwardenOrganizationJsonParse.js"
import { organizationCipherMap } from "./organizationCipherMap.js"

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface BitwardenOrganizationJsonImportExecuteOptions {
  apiClient?: ReturnType<typeof organizationApiClientCreate>
  organizationId: string
  organizationKey?: Uint8Array | null
  rawContent: string
  session: ReturnType<typeof webAuthSessionCreate>
}

export interface BitwardenOrganizationJsonImportResult {
  cipherCount: number
  collectionCount: number
  warnings: string[]
}

function organizationKeyValidate(key: Uint8Array | null | undefined): Result<Uint8Array> {
  if (!(key instanceof Uint8Array) || key.byteLength !== 64)
    return resultErrorCreate("bitwardenOrganizationJsonImportExecute", "Organization key is unavailable.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  return resultCreate(key)
}

function collectionIdNormalize(
  id: string,
  sourceOrganizationId: string | null | undefined,
  organizationId: string,
): string | null {
  return sourceOrganizationId === organizationId && uuidPattern.test(id) ? id : null
}

function collectionImportDataCreate(
  collection: {
    externalId?: string | null
    id: string
    name: string
    organizationId?: string | null
  },
  organizationId: string,
): Record<string, unknown> {
  return {
    externalId: collection.externalId ?? null,
    groups: [],
    id: collectionIdNormalize(collection.id, collection.organizationId, organizationId),
    name: collection.name,
    users: [],
  }
}

export async function bitwardenOrganizationJsonImportExecute(
  options: BitwardenOrganizationJsonImportExecuteOptions,
): Promise<Result<BitwardenOrganizationJsonImportResult>> {
  const op = "bitwardenOrganizationJsonImportExecute"
  const currentSession = options.session.session()
  if (currentSession === null) {
    return resultErrorCreate(op, "You must be logged in to import organization data.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  }
  if (options.organizationId.length === 0) {
    return resultErrorCreate(op, "Organization id must not be empty.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  const parsedResult = bitwardenOrganizationJsonParse(options.rawContent)
  if (!parsedResult.success) return parsedResult

  const organizationKeyResult = organizationKeyValidate(options.organizationKey)
  if (!organizationKeyResult.success) return organizationKeyResult
  const organizationKey = organizationKeyResult.data
  const payload = parsedResult.data

  for (const [index, item] of payload.items.entries()) {
    if (item.deletedDate !== undefined && item.deletedDate !== null)
      return resultErrorCreate(
        op,
        `Invalid Bitwarden organization JSON: trashed item at index ${index} is not supported.`,
        {
          code: "platform.invalid-request",
          statusCode: 400,
        },
      )
  }

  const collections = payload.collections.map((collection) =>
    collectionImportDataCreate(collection, options.organizationId),
  )
  const collectionIndexById = new Map(payload.collections.map((collection, index) => [collection.id, index]))
  const collectionRelationships: Array<{ key: number; value: number }> = []
  const ciphers: Record<string, unknown>[] = []

  for (const [index, item] of payload.items.entries()) {
    const itemCollectionIds = item.collectionIds
    if (itemCollectionIds === undefined || itemCollectionIds === null || itemCollectionIds.length === 0) {
      return resultErrorCreate(op, `Organization item at index ${index} has no collection references.`, {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    for (const collectionId of itemCollectionIds) {
      const collectionIndex = collectionIndexById.get(collectionId)
      if (collectionIndex === undefined) {
        return resultErrorCreate(op, `Organization item at index ${index} references a missing collection.`, {
          code: "platform.invalid-request",
          statusCode: 400,
        })
      }
      collectionRelationships.push({ key: index, value: collectionIndex })
    }

    const encryptedResult = await organizationCipherMap(
      item as unknown as Record<string, unknown>,
      (value) => extensionEncStringEncrypt(value, organizationKey),
      (value) => extensionFido2CredentialEncrypt(value as BitwardenFido2Credential, organizationKey),
    )
    if (!encryptedResult.success) return encryptedResult

    ciphers.push({
      ...encryptedResult.data,
      archivedDate: item.archivedDate ?? null,
      favorite: item.favorite ?? false,
      folderId: null,
      id: null,
      key: null,
      organizationId: options.organizationId,
      reprompt: item.reprompt ?? 0,
    })
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
    warnings: [],
  })
}
