import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, asc, eq } from "drizzle-orm"
import { usersCollections } from "../../database/schema/usersCollections.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"

export function organizationCollectionUserAccessFindByCollection(
  database: DatabaseConnection,
  organizationUuid: string,
  collectionUuid: string,
): Result<
  {
    hidePasswords: boolean
    manage: boolean
    membershipType: number
    membershipUuid: string
    readOnly: boolean
  }[]
> {
  const op = "organizationCollectionUserAccessFindByCollection"
  try {
    const rows = database.drizzle
      .select({
        membershipType: usersOrganizations.atype,
        membershipUuid: usersOrganizations.uuid,
        hidePasswords: usersCollections.hidePasswords,
        manage: usersCollections.manage,
        readOnly: usersCollections.readOnly,
      })
      .from(usersCollections)
      .innerJoin(
        usersOrganizations,
        and(
          eq(usersOrganizations.userUuid, usersCollections.userUuid),
          eq(usersOrganizations.orgUuid, organizationUuid),
        ),
      )
      .where(eq(usersCollections.collectionUuid, collectionUuid))
      .orderBy(asc(usersOrganizations.uuid))
      .all()
    return resultCreate(
      rows.map((row) => ({
        hidePasswords: row.hidePasswords,
        manage: row.manage,
        membershipType: row.membershipType,
        membershipUuid: row.membershipUuid,
        readOnly: row.readOnly,
      })),
    )
  } catch {
    return resultErrorCreate(op, "Collection user access lookup failed.")
  }
}
