import { and, asc, eq, isNull } from "drizzle-orm"
import type { KeyInput } from "jose"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { ciphers } from "../../database/schema/ciphers.js"
import { collections } from "../../database/schema/collections.js"
import type { Cipher } from "../ciphers/cipher.js"
import { cipherOrganizationToJson } from "../ciphers/cipherOrganizationToJson.js"
import type { OrganizationCollection } from "./organizationCollection.js"

type OrganizationExportOptions = {
  clock: Clock
  origin: string
  privateKey: KeyInput | undefined
}

export async function organizationExport(
  database: DatabaseConnection,
  organizationUuid: string,
  options: OrganizationExportOptions,
): Promise<Result<{ collections: Record<string, unknown>[]; ciphers: Record<string, unknown>[] }>> {
  const op = "organizationExport"
  try {
    const collectionRows: OrganizationCollection[] = database.drizzle
      .select({
        externalId: collections.externalId,
        name: collections.name,
        organizationUuid: collections.orgUuid,
        uuid: collections.uuid,
      })
      .from(collections)
      .where(eq(collections.orgUuid, organizationUuid))
      .orderBy(asc(collections.uuid))
      .all()
    const collectionJson = collectionRows.map(organizationExportCollectionToJson)
    const cipherRows: Cipher[] = database.drizzle
      .select({
        createdAt: ciphers.createdAt,
        data: ciphers.data,
        deletedAt: ciphers.deletedAt,
        fields: ciphers.fields,
        key: ciphers.key,
        name: ciphers.name,
        notes: ciphers.notes,
        organizationUuid: ciphers.organizationUuid,
        passwordHistory: ciphers.passwordHistory,
        reprompt: ciphers.reprompt,
        type: ciphers.atype,
        updatedAt: ciphers.updatedAt,
        userUuid: ciphers.userUuid,
        uuid: ciphers.uuid,
      })
      .from(ciphers)
      .where(and(eq(ciphers.organizationUuid, organizationUuid), isNull(ciphers.deletedAt)))
      .orderBy(asc(ciphers.createdAt), asc(ciphers.uuid))
      .all()
    const exportedCiphers: Record<string, unknown>[] = []
    for (const cipher of cipherRows) {
      const cipherResult = await cipherOrganizationToJson(database, cipher, organizationUuid, {
        clock: options.clock,
        origin: options.origin,
        privateKey: options.privateKey,
      })
      if (!cipherResult.success) return cipherResult
      exportedCiphers.push(organizationExportCipherToJson(cipherResult.data))
    }
    return resultCreate({ ciphers: exportedCiphers, collections: collectionJson })
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
