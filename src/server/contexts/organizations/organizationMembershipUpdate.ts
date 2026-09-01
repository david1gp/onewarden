import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { and, count, eq, inArray } from "drizzle-orm"
import { collections as collectionsTable } from "../../database/schema/collections.js"
import { groups as groupsTable } from "../../database/schema/groups.js"
import { groupsUsers } from "../../database/schema/groupsUsers.js"
import { usersCollections } from "../../database/schema/usersCollections.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import type { OrganizationMembershipUpdateData } from "./organizationMembershipUpdateDataSchema.js"
import { organizationMembershipFindByUuidAndOrganization } from "./organizationMembershipFindByUuidAndOrganization.js"
import { organizationMembershipSave } from "./organizationMembershipSave.js"
import { organizationMembershipStatus } from "./organizationMembershipStatus.js"
import { organizationMembershipType } from "./organizationMembershipType.js"
import { organizationMembershipTypeResolve } from "./organizationMembershipTypeResolve.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"

export function organizationMembershipUpdate(
  database: DatabaseConnection,
  actorMembership: OrganizationMembership,
  organizationUuid: string,
  membershipUuid: string,
  data: OrganizationMembershipUpdateData,
  revisionDate: string,
): Result<{ userUuid: string }> {
  const typeResult = organizationMembershipTypeResolve(data.type, data.permissions)
  if (!typeResult.success) return typeResult

  return databaseTransaction(database, () => {
    const op = "organizationMembershipUpdate"
    const memberResult = organizationMembershipFindByUuidAndOrganization(database, membershipUuid, organizationUuid)
    if (!memberResult.success) return memberResult
    if (memberResult.data === null)
      return organizationErrorCreate(op, "The specified user isn't member of the organization")
    const member = memberResult.data
    const newType = typeResult.data.type

    if (
      newType !== member.type &&
      (organizationMembershipRoleLevel(member.type) >=
        organizationMembershipRoleLevel(organizationMembershipType.admin) ||
        organizationMembershipRoleLevel(newType) >=
          organizationMembershipRoleLevel(organizationMembershipType.admin)) &&
      actorMembership.type !== organizationMembershipType.owner
    )
      return organizationErrorCreate(op, "Only Owners can grant and remove Admin or Owner privileges")
    if (member.type === organizationMembershipType.owner && actorMembership.type !== organizationMembershipType.owner)
      return organizationErrorCreate(op, "Only Owners can edit Owner users")
    if (
      member.type === organizationMembershipType.owner &&
      newType !== organizationMembershipType.owner &&
      member.status === organizationMembershipStatus.confirmed &&
      organizationMembershipConfirmedOwnerCount(database, organizationUuid) <= 1
    )
      return organizationErrorCreate(op, "Can't delete the last owner")

    if (!typeResult.data.accessAll) {
      const collectionValidationResult = organizationMembershipUpdateCollectionsValidate(
        database,
        organizationUuid,
        data.collections ?? [],
      )
      if (!collectionValidationResult.success) return collectionValidationResult
    }
    const groupValidationResult = organizationMembershipUpdateGroupsValidate(
      database,
      organizationUuid,
      data.groups ?? [],
    )
    if (!groupValidationResult.success) return groupValidationResult

    member.accessAll = typeResult.data.accessAll
    member.type = newType

    try {
      const collectionUuids = database.drizzle
        .select({ uuid: collectionsTable.uuid })
        .from(collectionsTable)
        .where(eq(collectionsTable.orgUuid, organizationUuid))
      database.drizzle
        .delete(usersCollections)
        .where(
          and(
            eq(usersCollections.userUuid, member.userUuid),
            inArray(usersCollections.collectionUuid, collectionUuids),
          ),
        )
        .run()
      if (!member.accessAll) {
        for (const collection of data.collections ?? []) {
          database.drizzle
            .insert(usersCollections)
            .values({
              userUuid: member.userUuid,
              collectionUuid: collection.id,
              readOnly: collection.readOnly,
              hidePasswords: collection.hidePasswords,
              manage: collection.manage,
            })
            .onConflictDoUpdate({
              target: [usersCollections.userUuid, usersCollections.collectionUuid],
              set: {
                readOnly: collection.readOnly,
                hidePasswords: collection.hidePasswords,
                manage: collection.manage,
              },
            })
            .run()
        }
      }
      database.drizzle.delete(groupsUsers).where(eq(groupsUsers.usersOrganizationsUuid, member.uuid)).run()
      for (const groupUuid of data.groups ?? []) {
        database.drizzle
          .insert(groupsUsers)
          .values({ groupsUuid: groupUuid, usersOrganizationsUuid: member.uuid })
          .onConflictDoNothing()
          .run()
      }
    } catch {
      return resultErrorCreate(op, "Organization membership assignment update failed.")
    }

    const saveResult = organizationMembershipSave(database, member, revisionDate)
    if (!saveResult.success) return saveResult
    return resultCreate({ userUuid: member.userUuid })
  })
}

function organizationMembershipRoleLevel(type: number): number {
  if (type === organizationMembershipType.owner) return 3
  if (type === organizationMembershipType.admin) return 2
  if (type === organizationMembershipType.manager) return 1
  if (type === organizationMembershipType.user) return 0
  return -1
}

function organizationMembershipConfirmedOwnerCount(database: DatabaseConnection, organizationUuid: string): number {
  return (
    database.drizzle
      .select({ count: count() })
      .from(usersOrganizations)
      .where(
        and(
          eq(usersOrganizations.orgUuid, organizationUuid),
          eq(usersOrganizations.status, organizationMembershipStatus.confirmed),
          eq(usersOrganizations.atype, organizationMembershipType.owner),
        ),
      )
      .get()?.count ?? 0
  )
}

function organizationMembershipUpdateCollectionsValidate(
  database: DatabaseConnection,
  organizationUuid: string,
  collections: OrganizationMembershipUpdateData["collections"],
): Result<void> {
  try {
    for (const collection of collections ?? []) {
      const row = database.drizzle
        .select({ uuid: collectionsTable.uuid })
        .from(collectionsTable)
        .where(and(eq(collectionsTable.uuid, collection.id), eq(collectionsTable.orgUuid, organizationUuid)))
        .limit(1)
        .get()
      if (row === undefined)
        return organizationErrorCreate("organizationMembershipUpdate", "Collection not found in Organization")
    }
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate("organizationMembershipUpdate", "Organization collection validation failed.")
  }
}

function organizationMembershipUpdateGroupsValidate(
  database: DatabaseConnection,
  organizationUuid: string,
  groups: readonly string[],
): Result<void> {
  try {
    for (const groupUuid of groups) {
      const row = database.drizzle
        .select({ uuid: groupsTable.uuid })
        .from(groupsTable)
        .where(and(eq(groupsTable.uuid, groupUuid), eq(groupsTable.organizationsUuid, organizationUuid)))
        .limit(1)
        .get()
      if (row === undefined)
        return organizationErrorCreate("organizationMembershipUpdate", "Group not found in Organization")
    }
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate("organizationMembershipUpdate", "Organization group validation failed.")
  }
}
