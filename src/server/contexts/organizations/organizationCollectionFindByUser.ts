import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, eq, or } from "drizzle-orm"
import { collections } from "../../database/schema/collections.js"
import { collectionsGroups } from "../../database/schema/collectionsGroups.js"
import { groups } from "../../database/schema/groups.js"
import { groupsUsers } from "../../database/schema/groupsUsers.js"
import { usersCollections } from "../../database/schema/usersCollections.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"
import type { OrganizationCollection } from "./organizationCollection.js"

export function organizationCollectionFindByUser(
  database: DatabaseConnection,
  userUuid: string,
  groupsEnabled = false,
): Result<OrganizationCollection[]> {
  const op = "organizationCollectionFindByUser"
  try {
    if (!groupsEnabled) {
      const rows = database.drizzle
        .selectDistinct({
          externalId: collections.externalId,
          name: collections.name,
          organizationUuid: collections.orgUuid,
          uuid: collections.uuid,
        })
        .from(collections)
        .innerJoin(
          usersOrganizations,
          and(eq(usersOrganizations.orgUuid, collections.orgUuid), eq(usersOrganizations.userUuid, userUuid)),
        )
        .leftJoin(
          usersCollections,
          and(eq(usersCollections.collectionUuid, collections.uuid), eq(usersCollections.userUuid, userUuid)),
        )
        .where(
          and(
            eq(usersOrganizations.status, 2),
            or(
              // A non-null user collection assignment is enough for access.
              eq(usersCollections.userUuid, userUuid),
              eq(usersOrganizations.accessAll, true),
              // Owners and admins have unrestricted collection access.
              eq(usersOrganizations.atype, 0),
              eq(usersOrganizations.atype, 1),
            ),
          ),
        )
        .all()
      return resultCreate(rows)
    }

    const rows = database.drizzle
      .selectDistinct({
        externalId: collections.externalId,
        name: collections.name,
        organizationUuid: collections.orgUuid,
        uuid: collections.uuid,
      })
      .from(collections)
      .innerJoin(
        usersOrganizations,
        and(eq(usersOrganizations.orgUuid, collections.orgUuid), eq(usersOrganizations.userUuid, userUuid)),
      )
      .leftJoin(
        usersCollections,
        and(eq(usersCollections.collectionUuid, collections.uuid), eq(usersCollections.userUuid, userUuid)),
      )
      .leftJoin(groupsUsers, eq(groupsUsers.usersOrganizationsUuid, usersOrganizations.uuid))
      .leftJoin(groups, and(eq(groups.uuid, groupsUsers.groupsUuid), eq(groups.organizationsUuid, collections.orgUuid)))
      .leftJoin(
        collectionsGroups,
        and(eq(collectionsGroups.groupsUuid, groups.uuid), eq(collectionsGroups.collectionsUuid, collections.uuid)),
      )
      .where(
        and(
          eq(usersOrganizations.status, 2),
          or(
            eq(usersCollections.userUuid, userUuid),
            eq(usersOrganizations.accessAll, true),
            eq(usersOrganizations.atype, 0),
            eq(usersOrganizations.atype, 1),
            eq(groups.accessAll, true),
            eq(collectionsGroups.collectionsUuid, collections.uuid),
          ),
        ),
      )
      .all()
    return resultCreate(rows)
  } catch {
    return resultErrorCreate(op, "Collection lookup failed.")
  }
}
