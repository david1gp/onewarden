import { and, asc, eq, exists, isNotNull, lte, or } from "drizzle-orm"
import { alias } from "drizzle-orm/sqlite-core"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { ciphers } from "../../database/schema/ciphers.js"
import { ciphersCollections } from "../../database/schema/ciphersCollections.js"
import { collections } from "../../database/schema/collections.js"
import { collectionsGroups } from "../../database/schema/collectionsGroups.js"
import { groups } from "../../database/schema/groups.js"
import { groupsUsers } from "../../database/schema/groupsUsers.js"
import { usersCollections } from "../../database/schema/usersCollections.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"
import type { Cipher } from "./cipher.js"
import { cipherProjection } from "./cipherProjection.js"

export function cipherFindByUser(
  database: DatabaseConnection,
  userUuid: string,
  groupsEnabled = false,
): Result<Cipher[]> {
  const op = "cipherFindByUser"
  try {
    const membership = alias(usersOrganizations, "cipher_membership")
    const directCipherCollection = alias(ciphersCollections, "cipher_direct_collection")
    const directCollection = alias(collections, "cipher_direct_collection_data")
    const directUserCollection = alias(usersCollections, "cipher_direct_user_collection")
    const groupCipherCollection = alias(ciphersCollections, "cipher_group_collection")
    const groupCollection = alias(collections, "cipher_group_collection_data")
    const groupUser = alias(groupsUsers, "cipher_group_user")
    const group = alias(groups, "cipher_group")
    const collectionGroup = alias(collectionsGroups, "cipher_collection_group")

    const directCollectionAccess = exists(
      database.drizzle
        .select({ collectionUuid: directCipherCollection.collectionUuid })
        .from(directCipherCollection)
        .innerJoin(
          directCollection,
          and(
            eq(directCollection.uuid, directCipherCollection.collectionUuid),
            eq(directCollection.orgUuid, membership.orgUuid),
          ),
        )
        .innerJoin(
          directUserCollection,
          and(
            eq(directUserCollection.collectionUuid, directCipherCollection.collectionUuid),
            eq(directUserCollection.userUuid, membership.userUuid),
          ),
        )
        .where(eq(directCipherCollection.cipherUuid, ciphers.uuid)),
    )
    const groupAccess = exists(
      database.drizzle
        .select({ collectionUuid: groupCipherCollection.collectionUuid })
        .from(groupCipherCollection)
        .innerJoin(
          groupCollection,
          and(
            eq(groupCollection.uuid, groupCipherCollection.collectionUuid),
            eq(groupCollection.orgUuid, membership.orgUuid),
          ),
        )
        .innerJoin(groupUser, eq(groupUser.usersOrganizationsUuid, membership.uuid))
        .innerJoin(group, and(eq(group.uuid, groupUser.groupsUuid), eq(group.organizationsUuid, membership.orgUuid)))
        .leftJoin(
          collectionGroup,
          and(
            eq(collectionGroup.groupsUuid, group.uuid),
            eq(collectionGroup.collectionsUuid, groupCipherCollection.collectionUuid),
          ),
        )
        .where(
          and(
            eq(groupCipherCollection.cipherUuid, ciphers.uuid),
            or(eq(group.accessAll, true), isNotNull(collectionGroup.collectionsUuid)),
          ),
        ),
    )
    const organizationAccess = exists(
      database.drizzle
        .select({ uuid: membership.uuid })
        .from(membership)
        .where(
          and(
            eq(membership.userUuid, userUuid),
            eq(membership.orgUuid, ciphers.organizationUuid),
            eq(membership.status, 2),
            or(
              eq(membership.accessAll, true),
              lte(membership.atype, 1),
              directCollectionAccess,
              groupsEnabled ? groupAccess : undefined,
            ),
          ),
        ),
    )
    const rows: Cipher[] = database.drizzle
      .select(cipherProjection)
      .from(ciphers)
      .where(or(eq(ciphers.userUuid, userUuid), organizationAccess))
      .orderBy(asc(ciphers.createdAt), asc(ciphers.uuid))
      .all()
    return resultCreate(rows)
  } catch {
    return resultErrorCreate(op, "Cipher lookup failed.")
  }
}
