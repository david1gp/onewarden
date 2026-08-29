import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
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
      database.run(
        `DELETE FROM users_collections
         WHERE user_uuid = ?
           AND collection_uuid IN (SELECT uuid FROM collections WHERE org_uuid = ?)`,
        [member.userUuid, organizationUuid],
      )
      if (!member.accessAll) {
        for (const collection of data.collections ?? []) {
          database.run(
            `INSERT INTO users_collections (user_uuid, collection_uuid, read_only, hide_passwords, manage)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(user_uuid, collection_uuid) DO UPDATE SET
               read_only = excluded.read_only,
               hide_passwords = excluded.hide_passwords,
               manage = excluded.manage`,
            [
              member.userUuid,
              collection.id,
              collection.readOnly ? 1 : 0,
              collection.hidePasswords ? 1 : 0,
              collection.manage ? 1 : 0,
            ],
          )
        }
      }
      database.run("DELETE FROM groups_users WHERE users_organizations_uuid = ?", [member.uuid])
      for (const groupUuid of data.groups ?? []) {
        database.run(
          `INSERT INTO groups_users (groups_uuid, users_organizations_uuid)
           VALUES (?, ?) ON CONFLICT(groups_uuid, users_organizations_uuid) DO NOTHING`,
          [groupUuid, member.uuid],
        )
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
    database
      .query<{ count: number }, [string, number, number]>(
        "SELECT COUNT(*) AS count FROM users_organizations WHERE org_uuid = ? AND status = ? AND atype = ?",
      )
      .get(organizationUuid, 2, organizationMembershipType.owner)?.count ?? 0
  )
}

function organizationMembershipUpdateCollectionsValidate(
  database: DatabaseConnection,
  organizationUuid: string,
  collections: OrganizationMembershipUpdateData["collections"],
): Result<void> {
  try {
    for (const collection of collections ?? []) {
      const row = database
        .query<{ uuid: string }, [string, string]>(
          "SELECT uuid FROM collections WHERE uuid = ? AND org_uuid = ? LIMIT 1",
        )
        .get(collection.id, organizationUuid)
      if (row === null)
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
      const row = database
        .query<{ uuid: string }, [string, string]>(
          "SELECT uuid FROM groups WHERE uuid = ? AND organizations_uuid = ? LIMIT 1",
        )
        .get(groupUuid, organizationUuid)
      if (row === null)
        return organizationErrorCreate("organizationMembershipUpdate", "Group not found in Organization")
    }
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate("organizationMembershipUpdate", "Organization group validation failed.")
  }
}
