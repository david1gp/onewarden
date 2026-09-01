import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, eq } from "drizzle-orm"
import { collections } from "../../database/schema/collections.js"
import type { OrganizationCollection } from "./organizationCollection.js"

export function organizationCollectionFindByUuidAndOrganization(
  database: DatabaseConnection,
  collectionUuid: string,
  organizationUuid: string,
): Result<OrganizationCollection | null> {
  const op = "organizationCollectionFindByUuidAndOrganization"
  try {
    const row = database.drizzle
      .select({
        externalId: collections.externalId,
        name: collections.name,
        organizationUuid: collections.orgUuid,
        uuid: collections.uuid,
      })
      .from(collections)
      .where(and(eq(collections.uuid, collectionUuid), eq(collections.orgUuid, organizationUuid)))
      .limit(1)
      .get()
    return resultCreate(row ?? null)
  } catch {
    return resultErrorCreate(op, "Collection lookup failed.")
  }
}
