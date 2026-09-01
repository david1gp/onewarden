import { eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { collections } from "../../database/schema/collections.js"
import type { OrganizationCollection } from "./organizationCollection.js"

export function organizationCollectionFindByUuid(
  database: DatabaseConnection,
  collectionUuid: string,
): Result<OrganizationCollection | null> {
  const op = "organizationCollectionFindByUuid"
  try {
    const row = database.drizzle
      .select({
        externalId: collections.externalId,
        name: collections.name,
        organizationUuid: collections.orgUuid,
        uuid: collections.uuid,
      })
      .from(collections)
      .where(eq(collections.uuid, collectionUuid))
      .limit(1)
      .get()
    return resultCreate(row ?? null)
  } catch {
    return resultErrorCreate(op, "Collection lookup failed.")
  }
}
