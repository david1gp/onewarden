import { and, asc, eq, exists, isNotNull, lte, or } from "drizzle-orm"
import { alias } from "drizzle-orm/sqlite-core"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { ciphersCollections } from "../../database/schema/ciphersCollections.js"
import { collections } from "../../database/schema/collections.js"
import { collectionsGroups } from "../../database/schema/collectionsGroups.js"
import { groups } from "../../database/schema/groups.js"
import { groupsUsers } from "../../database/schema/groupsUsers.js"
import { usersCollections } from "../../database/schema/usersCollections.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"
import type { Cipher } from "./cipher.js"

export function cipherCollectionIdsFindByUser(
  database: DatabaseConnection,
  cipher: Cipher,
  userUuid: string,
  groupsEnabled = false,
  adminCollections = false,
): Result<string[]> {
  const op = "cipherCollectionIdsFindByUser"
  if (cipher.organizationUuid === null) return resultCreate([])
  try {
    const groupUser = alias(groupsUsers, "collection_group_user")
    const group = alias(groups, "collection_group")
    const collectionGroup = alias(collectionsGroups, "collection_group_access")
    const groupAccess = exists(
      database.drizzle
        .select({ groupsUuid: groupUser.groupsUuid })
        .from(groupUser)
        .innerJoin(group, and(eq(group.uuid, groupUser.groupsUuid), eq(group.organizationsUuid, collections.orgUuid)))
        .leftJoin(
          collectionGroup,
          and(
            eq(collectionGroup.groupsUuid, group.uuid),
            eq(collectionGroup.collectionsUuid, ciphersCollections.collectionUuid),
          ),
        )
        .where(
          and(
            eq(groupUser.usersOrganizationsUuid, usersOrganizations.uuid),
            or(
              eq(group.accessAll, true),
              and(isNotNull(collectionGroup.collectionsUuid), eq(collectionGroup.readOnly, false)),
            ),
          ),
        ),
    )
    const rows = database.drizzle
      .selectDistinct({ collectionUuid: ciphersCollections.collectionUuid })
      .from(ciphersCollections)
      .innerJoin(
        collections,
        and(eq(collections.uuid, ciphersCollections.collectionUuid), eq(collections.orgUuid, cipher.organizationUuid)),
      )
      .innerJoin(
        usersOrganizations,
        and(
          eq(usersOrganizations.orgUuid, collections.orgUuid),
          eq(usersOrganizations.userUuid, userUuid),
          eq(usersOrganizations.status, 2),
        ),
      )
      .leftJoin(
        usersCollections,
        and(
          eq(usersCollections.collectionUuid, ciphersCollections.collectionUuid),
          eq(usersCollections.userUuid, userUuid),
        ),
      )
      .where(
        and(
          eq(ciphersCollections.cipherUuid, cipher.uuid),
          or(
            eq(usersOrganizations.accessAll, true),
            adminCollections ? lte(usersOrganizations.atype, 1) : undefined,
            and(isNotNull(usersCollections.userUuid), eq(usersCollections.readOnly, false)),
            groupsEnabled ? groupAccess : undefined,
          ),
        ),
      )
      .orderBy(asc(ciphersCollections.collectionUuid))
      .all()
    return resultCreate(rows.map((row) => row.collectionUuid))
  } catch {
    return resultErrorCreate(op, "Cipher collection lookup failed.")
  }
}
