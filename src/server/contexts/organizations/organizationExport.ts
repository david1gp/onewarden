import type { KeyInput } from "jose"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { cipherFromRow } from "../ciphers/cipherFromRow.js"
import type { CipherRow } from "../ciphers/cipherRow.js"
import { cipherToJson } from "../ciphers/cipherToJson.js"

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
      .query<OrganizationCollectionRow, [string]>(
        `SELECT uuid, org_uuid, name, external_id
         FROM collections
         WHERE org_uuid = ?
         ORDER BY uuid`,
      )
      .all(organizationUuid)
      .map(organizationExportCollectionToJson)
    const cipherRows = database
      .query<CipherRow, [string]>(
        `SELECT uuid, created_at, updated_at, user_uuid, organization_uuid, key, atype,
           name, notes, fields, data, password_history, deleted_at, reprompt
         FROM ciphers
         WHERE organization_uuid = ?
         ORDER BY created_at, uuid`,
      )
      .all(organizationUuid)
    const ciphers: Record<string, unknown>[] = []
    for (const row of cipherRows) {
      const cipherResult = await cipherToJson(database, cipherFromRow(row), options.userUuid, {
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

type OrganizationCollectionRow = {
  external_id: string | null
  name: string
  org_uuid: string
  uuid: string
}

function organizationExportCollectionToJson(row: OrganizationCollectionRow): Record<string, unknown> {
  return organizationExportValueToJson({
    defaultUserCollectionEmail: null,
    externalId: row.external_id,
    id: row.uuid,
    name: row.name,
    object: "collection",
    organizationId: row.org_uuid,
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
