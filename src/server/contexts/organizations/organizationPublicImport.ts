import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import { identityUserFindByEmail } from "../identity/identityUserFindByEmail.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { identityUserSave } from "../identity/identityUserSave.js"
import type { DatabaseConnection } from "../../database/database.js"
import { organizationMembershipFromRow } from "./organizationMembershipFromRow.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import { organizationMembershipStatus } from "./organizationMembershipStatus.js"
import { organizationMembershipType } from "./organizationMembershipType.js"
import type { OrganizationMembershipRow } from "./organizationMembershipRow.js"
import type { OrganizationPublicImportData } from "./organizationPublicImportDataSchema.js"
import type { OrganizationPublicImportOptions } from "./organizationPublicImportOptions.js"

type OrganizationImportOrganizationRow = {
  billing_email: string
  name: string
}

export async function organizationPublicImport(
  data: OrganizationPublicImportData,
  options: OrganizationPublicImportOptions,
): Promise<Result<void>> {
  const op = "organizationPublicImport"
  const database = options.database
  if (database === undefined) return resultErrorCreate(op, "Error getting DB")

  for (const memberData of data.members) {
    const memberResult = await organizationPublicImportMember(memberData, options, database)
    if (!memberResult.success) return memberResult
  }

  if (options.groupsEnabled) {
    for (const groupData of data.groups) {
      const groupResult = organizationPublicImportGroup(groupData, options, database)
      if (!groupResult.success) return groupResult
    }
  }

  if (data.overwriteExisting) {
    const overwriteResult = organizationPublicImportOverwrite(data, options, database)
    if (!overwriteResult.success) return overwriteResult
  }

  return resultCreate(undefined)
}

async function organizationPublicImportMember(
  memberData: OrganizationPublicImportData["members"][number],
  options: OrganizationPublicImportOptions,
  database: DatabaseConnection,
): Promise<Result<void>> {
  const existingMemberResult = organizationPublicMembershipFindByEmail(
    database,
    memberData.email,
    options.organizationUuid,
  )
  if (!existingMemberResult.success) return existingMemberResult
  const existingMember = existingMemberResult.data

  if (memberData.deleted) {
    if (existingMember === null) return resultCreate(undefined)
    const canRevoke =
      existingMember.type !== organizationMembershipType.owner ||
      existingMember.status !== organizationMembershipStatus.confirmed ||
      organizationPublicConfirmedOwnerCount(database, options.organizationUuid) > 1
    const status = canRevoke ? organizationPublicMembershipRevoke(existingMember.status) : existingMember.status
    const externalId = organizationPublicExternalIdNormalize(memberData.externalId)
    if (status === existingMember.status && externalId === existingMember.externalId) return resultCreate(undefined)
    return organizationPublicMembershipSave(
      database,
      { ...existingMember, externalId, status },
      options,
      existingMember.userUuid,
    )
  }

  if (existingMember !== null) {
    const status = organizationPublicMembershipRestore(existingMember.status)
    const externalId = organizationPublicExternalIdNormalize(memberData.externalId)
    if (status === existingMember.status && externalId === existingMember.externalId) return resultCreate(undefined)
    return organizationPublicMembershipSave(
      database,
      { ...existingMember, externalId, status },
      options,
      existingMember.userUuid,
    )
  }

  const userResult = identityUserFindByEmail(database, memberData.email)
  if (!userResult.success) return userResult
  let user = userResult.data
  let userCreated = false
  if (user === null) {
    const newUserResult = organizationPublicUserCreate(memberData.email, options, database)
    if (!newUserResult.success) return newUserResult
    user = newUserResult.data
    userCreated = true
    if (!options.config.MAIL_ENABLED) {
      try {
        database.run("INSERT INTO invitations (email) VALUES (?) ON CONFLICT(email) DO NOTHING", [user.email])
      } catch {
        return resultErrorCreate("organizationPublicImport", "Invitation save failed.")
      }
    }
  }

  const organizationResult = organizationPublicOrganizationFind(database, options.organizationUuid)
  if (!organizationResult.success) return organizationResult
  if (organizationResult.data === null)
    return resultErrorCreate("organizationPublicImport", "Error looking up organization")

  const member: OrganizationMembership = {
    accessAll: false,
    akey: "",
    externalId: organizationPublicExternalIdNormalize(memberData.externalId),
    invitedByEmail: organizationResult.data.billing_email,
    organizationUuid: options.organizationUuid,
    resetPasswordKey: null,
    status:
      options.config.MAIL_ENABLED || user.passwordHash.length === 0
        ? organizationMembershipStatus.invited
        : organizationMembershipStatus.accepted,
    type: organizationMembershipType.user,
    userUuid: user.uuid,
    uuid: options.identifier.uuid(),
  }
  const saveResult = organizationPublicMembershipSave(database, member, options, user.uuid)
  if (!saveResult.success) return saveResult

  if (!options.config.MAIL_ENABLED) return resultCreate(undefined)
  const sendInvite = options.mail.sendInvite
  if (sendInvite === undefined) return organizationPublicImportInviteFailure(database, member, user, userCreated)
  const mailResult = await sendInvite(user.email, organizationResult.data.name, member.uuid)
  if (mailResult.success) return resultCreate(undefined)
  return organizationPublicImportInviteFailure(database, member, user, userCreated)
}

function organizationPublicUserCreate(
  email: string,
  options: OrganizationPublicImportOptions,
  database: DatabaseConnection,
): Result<IdentityUser> {
  const saltResult = secureRandomBytes(64)
  if (!saltResult.success) return saltResult
  const normalizedEmail = email.toLowerCase()
  const timestamp = options.clock.now().toISOString()
  const user: IdentityUser = {
    uuid: options.identifier.uuid(),
    enabled: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    verifiedAt: null,
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: normalizedEmail,
    emailNew: null,
    emailNewToken: null,
    name: normalizedEmail,
    passwordHash: new Uint8Array(),
    salt: saltResult.data,
    passwordIterations: options.config.PASSWORD_ITERATIONS,
    passwordHint: null,
    akey: "",
    privateKey: null,
    publicKey: null,
    securityStamp: options.identifier.uuid(),
    stampException: null,
    equivalentDomains: "[]",
    excludedGlobals: "[]",
    clientKdfType: 0,
    clientKdfIter: 600_000,
    clientKdfMemory: null,
    clientKdfParallelism: null,
    apiKey: null,
    avatarColor: null,
    externalId: null,
  }
  const saveResult = identityUserSave(database, user)
  if (!saveResult.success) return saveResult
  return resultCreate(user)
}

function organizationPublicImportGroup(
  groupData: OrganizationPublicImportData["groups"][number],
  options: OrganizationPublicImportOptions,
  database: DatabaseConnection,
): Result<void> {
  const groupResult = organizationPublicGroupFindByExternalId(database, groupData.externalId, options.organizationUuid)
  if (!groupResult.success) return groupResult
  const groupUuid = groupResult.data?.uuid ?? options.identifier.uuid()
  try {
    if (groupResult.data === null) {
      database.run(
        `INSERT INTO groups (uuid, organizations_uuid, name, access_all, external_id, creation_date, revision_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          groupUuid,
          options.organizationUuid,
          groupData.name,
          0,
          groupData.externalId.trim().length === 0 ? null : groupData.externalId,
          options.clock.now().toISOString(),
          options.clock.now().toISOString(),
        ],
      )
    }
    database.run(
      `DELETE FROM groups_users
       WHERE groups_uuid = ?`,
      [groupUuid],
    )
    for (const externalId of groupData.memberExternalIds) {
      const member = organizationPublicMembershipFindByExternalId(database, externalId, options.organizationUuid)
      if (!member.success) return member
      if (member.data === null) continue
      database.run(
        `INSERT INTO groups_users (groups_uuid, users_organizations_uuid)
         VALUES (?, ?) ON CONFLICT(groups_uuid, users_organizations_uuid) DO NOTHING`,
        [groupUuid, member.data.uuid],
      )
    }
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate("organizationPublicImportGroup", "Group import failed.")
  }
}

function organizationPublicImportOverwrite(
  data: OrganizationPublicImportData,
  options: OrganizationPublicImportOptions,
  database: DatabaseConnection,
): Result<void> {
  const syncExternalIds = new Set(data.members.map((member) => member.externalId))
  const membersResult = organizationPublicMembershipFindAll(database, options.organizationUuid)
  if (!membersResult.success) return membersResult
  for (const member of membersResult.data) {
    if (member.externalId === null || syncExternalIds.has(member.externalId)) continue
    if (
      member.type === organizationMembershipType.owner &&
      member.status === organizationMembershipStatus.confirmed &&
      organizationPublicConfirmedOwnerCount(database, options.organizationUuid) <= 1
    )
      continue
    const deleteResult = organizationPublicMembershipDelete(database, member.uuid)
    if (!deleteResult.success) return deleteResult
  }
  return resultCreate(undefined)
}

function organizationPublicImportInviteFailure(
  database: DatabaseConnection,
  member: OrganizationMembership,
  user: IdentityUser,
  userCreated: boolean,
): Result<void> {
  const rollbackResult = organizationPublicMembershipDelete(database, member.uuid)
  if (!rollbackResult.success) return rollbackResult
  if (userCreated) {
    try {
      database.run("DELETE FROM invitations WHERE email = ?", [user.email])
      database.run("DELETE FROM users WHERE uuid = ?", [user.uuid])
    } catch {
      return resultErrorCreate("organizationPublicImport", "User rollback failed.")
    }
  }
  return resultErrorCreate("organizationPublicImport", "Error sending invite")
}

function organizationPublicOrganizationFind(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<OrganizationImportOrganizationRow | null> {
  try {
    return resultCreate(
      database
        .query<OrganizationImportOrganizationRow, [string]>(
          "SELECT name, billing_email FROM organizations WHERE uuid = ? LIMIT 1",
        )
        .get(organizationUuid),
    )
  } catch {
    return resultErrorCreate("organizationPublicOrganizationFind", "Organization lookup failed.")
  }
}

function organizationPublicMembershipFindByEmail(
  database: DatabaseConnection,
  email: string,
  organizationUuid: string,
): Result<OrganizationMembership | null> {
  try {
    const row = database
      .query<OrganizationMembershipRow, [string, string]>(
        `SELECT member.uuid, member.user_uuid, member.org_uuid, member.invited_by_email,
           member.access_all, member.akey, member.status, member.atype,
           member.reset_password_key, member.external_id
         FROM users_organizations AS member
         JOIN users AS user ON user.uuid = member.user_uuid
         WHERE user.email = ? AND member.org_uuid = ? LIMIT 1`,
      )
      .get(email.toLowerCase(), organizationUuid)
    return resultCreate(row === null ? null : organizationMembershipFromRow(row))
  } catch {
    return resultErrorCreate("organizationPublicMembershipFindByEmail", "Membership lookup failed.")
  }
}

function organizationPublicMembershipFindByExternalId(
  database: DatabaseConnection,
  externalId: string,
  organizationUuid: string,
): Result<OrganizationMembership | null> {
  try {
    const row = database
      .query<OrganizationMembershipRow, [string, string]>(
        `SELECT uuid, user_uuid, org_uuid, invited_by_email, access_all, akey,
           status, atype, reset_password_key, external_id
         FROM users_organizations WHERE external_id = ? AND org_uuid = ? LIMIT 1`,
      )
      .get(externalId, organizationUuid)
    return resultCreate(row === null ? null : organizationMembershipFromRow(row))
  } catch {
    return resultErrorCreate("organizationPublicMembershipFindByExternalId", "Membership lookup failed.")
  }
}

function organizationPublicMembershipFindAll(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<OrganizationMembership[]> {
  try {
    const rows = database
      .query<OrganizationMembershipRow, [string]>(
        `SELECT uuid, user_uuid, org_uuid, invited_by_email, access_all, akey,
           status, atype, reset_password_key, external_id
         FROM users_organizations WHERE org_uuid = ?`,
      )
      .all(organizationUuid)
    return resultCreate(rows.map(organizationMembershipFromRow))
  } catch {
    return resultErrorCreate("organizationPublicMembershipFindAll", "Membership lookup failed.")
  }
}

function organizationPublicGroupFindByExternalId(
  database: DatabaseConnection,
  externalId: string,
  organizationUuid: string,
): Result<{ uuid: string } | null> {
  try {
    return resultCreate(
      database
        .query<{ uuid: string }, [string, string]>(
          "SELECT uuid FROM groups WHERE external_id = ? AND organizations_uuid = ? LIMIT 1",
        )
        .get(externalId, organizationUuid),
    )
  } catch {
    return resultErrorCreate("organizationPublicGroupFindByExternalId", "Group lookup failed.")
  }
}

function organizationPublicMembershipSave(
  database: DatabaseConnection,
  member: OrganizationMembership,
  options: OrganizationPublicImportOptions,
  userUuid: string,
): Result<void> {
  try {
    database.run(
      `INSERT INTO users_organizations (
         uuid, user_uuid, org_uuid, invited_by_email, access_all, akey, status, atype,
         reset_password_key, external_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET
         user_uuid = excluded.user_uuid,
         org_uuid = excluded.org_uuid,
         invited_by_email = excluded.invited_by_email,
         access_all = excluded.access_all,
         akey = excluded.akey,
         status = excluded.status,
         atype = excluded.atype,
         reset_password_key = excluded.reset_password_key,
         external_id = excluded.external_id`,
      [
        member.uuid,
        member.userUuid,
        member.organizationUuid,
        member.invitedByEmail,
        member.accessAll ? 1 : 0,
        member.akey,
        member.status,
        member.type,
        member.resetPasswordKey,
        member.externalId,
      ],
    )
    database.run("UPDATE users SET updated_at = ? WHERE uuid = ?", [options.clock.now().toISOString(), userUuid])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate("organizationPublicMembershipSave", "Membership save failed.")
  }
}

function organizationPublicMembershipDelete(database: DatabaseConnection, membershipUuid: string): Result<void> {
  try {
    database.run(
      `DELETE FROM users_collections
       WHERE user_uuid = (SELECT user_uuid FROM users_organizations WHERE uuid = ?)
         AND collection_uuid IN (
           SELECT uuid FROM collections
           WHERE org_uuid = (SELECT org_uuid FROM users_organizations WHERE uuid = ?)
         )`,
      [membershipUuid, membershipUuid],
    )
    database.run("DELETE FROM groups_users WHERE users_organizations_uuid = ?", [membershipUuid])
    database.run("DELETE FROM users_organizations WHERE uuid = ?", [membershipUuid])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate("organizationPublicMembershipDelete", "Membership deletion failed.")
  }
}

function organizationPublicConfirmedOwnerCount(database: DatabaseConnection, organizationUuid: string): number {
  const row = database
    .query<{ count: number }, [string]>(
      "SELECT COUNT(*) AS count FROM users_organizations WHERE org_uuid = ? AND status = 2 AND atype = 0",
    )
    .get(organizationUuid)
  return row?.count ?? 0
}

function organizationPublicMembershipRevoke(status: number): number {
  return status > organizationMembershipStatus.revoked ? status - 128 : status
}

function organizationPublicMembershipRestore(status: number): number {
  return status < organizationMembershipStatus.invited ? status + 128 : status
}

function organizationPublicExternalIdNormalize(externalId: string): string | null {
  return externalId.length === 0 ? null : externalId
}
