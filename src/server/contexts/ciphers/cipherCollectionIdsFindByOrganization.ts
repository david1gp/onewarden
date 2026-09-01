import { and, asc, eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { ciphersCollections } from "../../database/schema/ciphersCollections.js"
import { collections } from "../../database/schema/collections.js"

export function cipherCollectionIdsFindByOrganization(
  database: DatabaseConnection,
  cipherUuid: string,
  organizationUuid: string,
): Result<string[]> {
  const op = "cipherCollectionIdsFindByOrganization"
  try {
    const rows = database.drizzle
      .select({ collectionUuid: ciphersCollections.collectionUuid })
      .from(ciphersCollections)
      .innerJoin(
        collections,
        and(eq(collections.uuid, ciphersCollections.collectionUuid), eq(collections.orgUuid, organizationUuid)),
      )
      .where(eq(ciphersCollections.cipherUuid, cipherUuid))
      .orderBy(asc(ciphersCollections.collectionUuid))
      .all()
    return resultCreate(rows.map((row) => row.collectionUuid))
  } catch {
    return resultErrorCreate(op, "Organization cipher collection lookup failed.")
  }
}
