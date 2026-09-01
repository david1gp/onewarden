import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { eq } from "drizzle-orm"
import { collections } from "../../database/schema/collections.js"
import type { OrganizationCollection } from "./organizationCollection.js"

export function organizationCollectionFindByOrganization(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<OrganizationCollection[]> {
  const op = "organizationCollectionFindByOrganization"
  try {
    const rows = database.drizzle
      .select({
        externalId: collections.externalId,
        name: collections.name,
        organizationUuid: collections.orgUuid,
        uuid: collections.uuid,
      })
      .from(collections)
      .where(eq(collections.orgUuid, organizationUuid))
      .all()
    return resultCreate(rows)
  } catch {
    return resultErrorCreate(op, "Collection lookup failed.")
  }
}
