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

export function organizationCollectionFindByUuidAndUser(
  database: DatabaseConnection,
  collectionUuid: string,
  userUuid: string,
  groupsEnabled = false,
): Result<OrganizationCollection | null> {
  const op = "organizationCollectionFindByUuidAndUser"
  try {
    const base = database.drizzle
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
    const query = groupsEnabled
      ? base
          .leftJoin(groupsUsers, eq(groupsUsers.usersOrganizationsUuid, usersOrganizations.uuid))
          .leftJoin(
            groups,
            and(eq(groups.uuid, groupsUsers.groupsUuid), eq(groups.organizationsUuid, collections.orgUuid)),
          )
          .leftJoin(
            collectionsGroups,
            and(eq(collectionsGroups.groupsUuid, groups.uuid), eq(collectionsGroups.collectionsUuid, collections.uuid)),
          )
          .where(
            and(
              eq(collections.uuid, collectionUuid),
              eq(usersOrganizations.status, 2),
              or(
                eq(usersCollections.collectionUuid, collections.uuid),
                eq(usersOrganizations.accessAll, true),
                eq(usersOrganizations.atype, 0),
                eq(usersOrganizations.atype, 1),
                eq(groups.accessAll, true),
                eq(collectionsGroups.collectionsUuid, collections.uuid),
              ),
            ),
          )
      : base.where(
          and(
            eq(collections.uuid, collectionUuid),
            eq(usersOrganizations.status, 2),
            or(
              eq(usersCollections.collectionUuid, collections.uuid),
              eq(usersOrganizations.accessAll, true),
              eq(usersOrganizations.atype, 0),
              eq(usersOrganizations.atype, 1),
            ),
          ),
        )
    return resultCreate(query.limit(1).get() ?? null)
  } catch {
    return resultErrorCreate(op, "Collection lookup failed.")
  }
}
