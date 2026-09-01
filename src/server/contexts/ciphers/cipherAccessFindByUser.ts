import { and, count, eq } from "drizzle-orm"
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

const unrestrictedCipherAccess = { hidePasswords: false, manage: true, readOnly: false } as const

export function cipherAccessFindByUser(
  database: DatabaseConnection,
  cipher: Cipher,
  userUuid: string,
  groupsEnabled = false,
): Result<{ hidePasswords: boolean; manage: boolean; readOnly: boolean } | null> {
  const op = "cipherAccessFindByUser"
  if (cipher.userUuid === userUuid) return resultCreate(unrestrictedCipherAccess)
  if (cipher.organizationUuid === null) return resultCreate(null)

  try {
    const membership = database.drizzle
      .select({
        uuid: usersOrganizations.uuid,
        accessAll: usersOrganizations.accessAll,
        atype: usersOrganizations.atype,
      })
      .from(usersOrganizations)
      .where(
        and(
          eq(usersOrganizations.orgUuid, cipher.organizationUuid),
          eq(usersOrganizations.userUuid, userUuid),
          eq(usersOrganizations.status, 2),
        ),
      )
      .limit(1)
      .get()
    if (membership === undefined) return resultCreate(null)
    if (membership.accessAll || membership.atype <= 1) return resultCreate(unrestrictedCipherAccess)

    if (groupsEnabled) {
      const fullGroup = database.drizzle
        .select({ count: count() })
        .from(groupsUsers)
        .innerJoin(
          groups,
          and(eq(groups.uuid, groupsUsers.groupsUuid), eq(groups.organizationsUuid, cipher.organizationUuid)),
        )
        .where(and(eq(groupsUsers.usersOrganizationsUuid, membership.uuid), eq(groups.accessAll, true)))
        .get()
      if ((fullGroup?.count ?? 0) > 0) return resultCreate(unrestrictedCipherAccess)
    }

    const directRows = database.drizzle
      .select({
        readOnly: usersCollections.readOnly,
        hidePasswords: usersCollections.hidePasswords,
        manage: usersCollections.manage,
      })
      .from(ciphersCollections)
      .innerJoin(
        collections,
        and(eq(collections.uuid, ciphersCollections.collectionUuid), eq(collections.orgUuid, cipher.organizationUuid)),
      )
      .innerJoin(
        usersCollections,
        and(
          eq(usersCollections.collectionUuid, ciphersCollections.collectionUuid),
          eq(usersCollections.userUuid, userUuid),
        ),
      )
      .where(eq(ciphersCollections.cipherUuid, cipher.uuid))
      .all()
    const rows =
      directRows.length > 0 || !groupsEnabled ? directRows : cipherGroupAccessRowsFind(database, cipher, userUuid)
    if (rows.length === 0) return resultCreate(null)
    return resultCreate(cipherAccessAggregate(rows))
  } catch {
    return resultErrorCreate(op, "Cipher access lookup failed.")
  }
}

function cipherGroupAccessRowsFind(database: DatabaseConnection, cipher: Cipher, userUuid: string): CipherAccessRow[] {
  if (cipher.organizationUuid === null) return []
  return database.drizzle
    .select({
      readOnly: collectionsGroups.readOnly,
      hidePasswords: collectionsGroups.hidePasswords,
      manage: collectionsGroups.manage,
    })
    .from(ciphersCollections)
    .innerJoin(
      collections,
      and(eq(collections.uuid, ciphersCollections.collectionUuid), eq(collections.orgUuid, cipher.organizationUuid)),
    )
    .innerJoin(collectionsGroups, eq(collectionsGroups.collectionsUuid, ciphersCollections.collectionUuid))
    .innerJoin(groupsUsers, eq(groupsUsers.groupsUuid, collectionsGroups.groupsUuid))
    .innerJoin(
      usersOrganizations,
      and(
        eq(usersOrganizations.uuid, groupsUsers.usersOrganizationsUuid),
        eq(usersOrganizations.userUuid, userUuid),
        eq(usersOrganizations.status, 2),
      ),
    )
    .innerJoin(groups, and(eq(groups.uuid, groupsUsers.groupsUuid), eq(groups.organizationsUuid, collections.orgUuid)))
    .where(eq(ciphersCollections.cipherUuid, cipher.uuid))
    .all()
}

function cipherAccessAggregate(rows: readonly CipherAccessRow[]): {
  hidePasswords: boolean
  manage: boolean
  readOnly: boolean
} {
  let readOnly = true
  let hidePasswords = true
  let manage = false
  for (const row of rows) {
    readOnly = readOnly && row.readOnly
    hidePasswords = hidePasswords && row.hidePasswords
    manage = manage || row.manage
  }
  return { hidePasswords, manage, readOnly }
}

type CipherAccessRow = {
  hidePasswords: boolean
  manage: boolean
  readOnly: boolean
}
