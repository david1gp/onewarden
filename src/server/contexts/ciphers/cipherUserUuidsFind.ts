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

export function cipherUserUuidsFind(
  database: DatabaseConnection,
  cipher: Cipher,
  groupsEnabled = false,
): Result<string[]> {
  const op = "cipherUserUuidsFind"
  if (cipher.organizationUuid === null) return resultCreate(cipher.userUuid === null ? [] : [cipher.userUuid])
  try {
    const collection = alias(collections, "cipher_user_collection")
    const userCollection = alias(usersCollections, "cipher_user_collection_access")
    const groupUser = alias(groupsUsers, "cipher_user_group_user")
    const group = alias(groups, "cipher_user_group")
    const collectionGroup = alias(collectionsGroups, "cipher_user_group_access")
    const directCollectionAccess = exists(
      database.drizzle
        .select({ collectionUuid: ciphersCollections.collectionUuid })
        .from(ciphersCollections)
        .innerJoin(
          collection,
          and(
            eq(collection.uuid, ciphersCollections.collectionUuid),
            eq(collection.orgUuid, usersOrganizations.orgUuid),
          ),
        )
        .innerJoin(
          userCollection,
          and(
            eq(userCollection.collectionUuid, ciphersCollections.collectionUuid),
            eq(userCollection.userUuid, usersOrganizations.userUuid),
          ),
        )
        .where(eq(ciphersCollections.cipherUuid, cipher.uuid)),
    )
    const groupCollectionAccess = exists(
      database.drizzle
        .select({ collectionUuid: ciphersCollections.collectionUuid })
        .from(ciphersCollections)
        .innerJoin(
          collection,
          and(
            eq(collection.uuid, ciphersCollections.collectionUuid),
            eq(collection.orgUuid, usersOrganizations.orgUuid),
          ),
        )
        .innerJoin(groupUser, eq(groupUser.usersOrganizationsUuid, usersOrganizations.uuid))
        .innerJoin(
          group,
          and(eq(group.uuid, groupUser.groupsUuid), eq(group.organizationsUuid, usersOrganizations.orgUuid)),
        )
        .leftJoin(
          collectionGroup,
          and(
            eq(collectionGroup.collectionsUuid, ciphersCollections.collectionUuid),
            eq(collectionGroup.groupsUuid, group.uuid),
          ),
        )
        .where(
          and(
            eq(ciphersCollections.cipherUuid, cipher.uuid),
            or(eq(group.accessAll, true), isNotNull(collectionGroup.collectionsUuid)),
          ),
        ),
    )
    const rows = database.drizzle
      .selectDistinct({ userUuid: usersOrganizations.userUuid })
      .from(usersOrganizations)
      .where(
        and(
          eq(usersOrganizations.orgUuid, cipher.organizationUuid),
          eq(usersOrganizations.status, 2),
          or(
            eq(usersOrganizations.accessAll, true),
            lte(usersOrganizations.atype, 1),
            directCollectionAccess,
            groupsEnabled ? groupCollectionAccess : undefined,
          ),
        ),
      )
      .orderBy(asc(usersOrganizations.userUuid))
      .all()
    return resultCreate(rows.map((row) => row.userUuid))
  } catch {
    return resultErrorCreate(op, "Cipher user lookup failed.")
  }
}
