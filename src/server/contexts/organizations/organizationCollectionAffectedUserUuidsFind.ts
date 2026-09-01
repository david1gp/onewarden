import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, asc, eq, isNotNull, lte, or } from "drizzle-orm"
import { collectionsGroups } from "../../database/schema/collectionsGroups.js"
import { groups } from "../../database/schema/groups.js"
import { groupsUsers } from "../../database/schema/groupsUsers.js"
import { usersCollections } from "../../database/schema/usersCollections.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"

export function organizationCollectionAffectedUserUuidsFind(
  database: DatabaseConnection,
  organizationUuid: string,
  collectionUuid: string,
): Result<string[]> {
  const op = "organizationCollectionAffectedUserUuidsFind"
  try {
    const rows = database.drizzle
      .selectDistinct({ userUuid: usersOrganizations.userUuid })
      .from(usersOrganizations)
      .leftJoin(
        usersCollections,
        and(
          eq(usersCollections.userUuid, usersOrganizations.userUuid),
          eq(usersCollections.collectionUuid, collectionUuid),
        ),
      )
      .leftJoin(groupsUsers, eq(groupsUsers.usersOrganizationsUuid, usersOrganizations.uuid))
      .leftJoin(
        groups,
        and(eq(groups.uuid, groupsUsers.groupsUuid), eq(groups.organizationsUuid, usersOrganizations.orgUuid)),
      )
      .leftJoin(
        collectionsGroups,
        and(eq(collectionsGroups.groupsUuid, groups.uuid), eq(collectionsGroups.collectionsUuid, collectionUuid)),
      )
      .where(
        and(
          eq(usersOrganizations.orgUuid, organizationUuid),
          or(
            eq(usersOrganizations.accessAll, true),
            lte(usersOrganizations.atype, 1),
            isNotNull(usersCollections.userUuid),
            eq(groups.accessAll, true),
            isNotNull(collectionsGroups.collectionsUuid),
          ),
        ),
      )
      .orderBy(asc(usersOrganizations.userUuid))
      .all()
    return resultCreate(rows.map((row) => row.userUuid))
  } catch {
    return resultErrorCreate(op, "Collection access revision lookup failed.")
  }
}
