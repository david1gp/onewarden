import type { KeyInput } from "jose"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Cipher } from "../ciphers/cipher.js"
import { cipherSelect } from "../ciphers/cipherSelect.js"
import { cipherToJson } from "../ciphers/cipherToJson.js"
import type { OrganizationCollection } from "./organizationCollection.js"
import { organizationCollectionSelect } from "./organizationCollectionSelect.js"

type OrganizationExportOptions = {
  clock: Clock
  origin: string
  privateKey: KeyInput | undefined
  userUuid: string
}

export async function organizationExport(
  database: DatabaseConnection,
  organizationUuid: string,
  options: OrganizationExportOptions,
): Promise<Result<{ collections: Record<string, unknown>[]; ciphers: Record<string, unknown>[] }>> {
  const op = "organizationExport"
  try {
    const collections = database
      .query<OrganizationCollection, [string]>(
        `SELECT ${organizationCollectionSelect}
         FROM collections AS c
         WHERE org_uuid = ?
         ORDER BY uuid`,
      )
      .all(organizationUuid)
      .map(organizationExportCollectionToJson)
    const cipherRows = database
      .query<Cipher, [string]>(
        `SELECT ${cipherSelect}
         FROM ciphers
         WHERE organization_uuid = ?
         ORDER BY created_at, uuid`,
      )
      .all(organizationUuid)
    const ciphers: Record<string, unknown>[] = []
    for (const cipher of cipherRows) {
      const cipherResult = await cipherToJson(database, cipher, options.userUuid, {
        clock: options.clock,
        origin: options.origin,
        privateKey: options.privateKey,
      })
      if (!cipherResult.success) return cipherResult
      ciphers.push(organizationExportCipherToJson(cipherResult.data))
    }
    return resultCreate({ ciphers, collections })
  } catch {
    return resultErrorCreate(op, "Organization export failed.")
  }
}

function organizationExportCollectionToJson(collection: OrganizationCollection): Record<string, unknown> {
  return organizationExportValueToJson({
    defaultUserCollectionEmail: null,
    externalId: collection.externalId,
    id: collection.uuid,
    name: collection.name,
    object: "collection",
    organizationId: collection.organizationUuid,
    type: 0,
  }) as Record<string, unknown>
}

function organizationExportCipherToJson(value: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...value }
  for (const key of ["archivedDate", "edit", "favorite", "folderId", "permissions", "viewPassword"]) delete copy[key]
  return organizationExportValueToJson(copy) as Record<string, unknown>
}

function organizationExportValueToJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(organizationExportValueToJson)
  if (typeof value !== "object" || value === null) return value
  const output: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    const firstCharacter = key.slice(0, 1)
    const normalizedKey = firstCharacter === "" ? key : firstCharacter.toLowerCase() + key.slice(1)
    output[normalizedKey] = organizationExportValueToJson(child)
  }
  return output
}
