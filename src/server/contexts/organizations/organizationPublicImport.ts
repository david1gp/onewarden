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
import { organizationPolicyCheckUserAllowed } from "./organizationPolicyCheckUserAllowed.js"
import type { Organization } from "./organization.js"
import type { OrganizationPublicImportData } from "./organizationPublicImportDataSchema.js"
import type { OrganizationPublicImportOptions } from "./organizationPublicImportOptions.js"
import { notificationUpdateType } from "../notifications/notificationUpdateType.js"
import { organizationGroupCreate } from "./organizationGroupCreate.js"
import { organizationGroupFindByUuidAndOrganization } from "./organizationGroupFindByUuidAndOrganization.js"
import { organizationGroupExternalIdNormalize } from "./organizationGroupExternalIdNormalize.js"
import { organizationGroupMembersReplace } from "./organizationGroupMembersReplace.js"
import { organizationMemberUserUuidsFind } from "./organizationMemberUserUuidsFind.js"
import { and, count, eq, inArray } from "drizzle-orm"
import { collections } from "../../database/schema/collections.js"
import { groups } from "../../database/schema/groups.js"
import { groupsUsers } from "../../database/schema/groupsUsers.js"
import { invitations } from "../../database/schema/invitations.js"
import { organizations } from "../../database/schema/organizations.js"
import { users } from "../../database/schema/users.js"
import { usersOrganizations, type UserOrganizationRow } from "../../database/schema/usersOrganizations.js"
import { usersCollections } from "../../database/schema/usersCollections.js"

type OrganizationImportOrganization = Pick<Organization, "billingEmail" | "name">

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

  organizationPublicImportNotify(database, options)
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
    let status = organizationPublicMembershipRestore(existingMember.status)
    const externalId = organizationPublicExternalIdNormalize(memberData.externalId)
    if (status !== existingMember.status) {
      const policyResult = organizationPolicyCheckUserAllowed(database, { ...existingMember, status }, "restore")
      if (!policyResult.success) status = organizationMembershipStatus.revoked
    }
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
        database.drizzle.insert(invitations).values({ email: user.email }).onConflictDoNothing().run()
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
    invitedByEmail: organizationResult.data.billingEmail,
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

  let groupUuid = groupResult.data?.uuid
  if (groupUuid === undefined) {
    const createResult = organizationGroupCreate(
      database,
      options.organizationUuid,
      groupData.name,
      false,
      organizationGroupExternalIdNormalize(groupData.externalId),
      options.clock,
      options.identifier,
    )
    if (!createResult.success) return createResult
    groupUuid = createResult.data.uuid
  } else {
    const existingGroupResult = organizationGroupFindByUuidAndOrganization(
      database,
      groupUuid,
      options.organizationUuid,
    )
    if (!existingGroupResult.success) return existingGroupResult
    if (existingGroupResult.data === null)
      return resultErrorCreate("organizationPublicImportGroup", "Group lookup failed.")
  }

  const membershipUuids: string[] = []
  for (const externalId of groupData.memberExternalIds) {
    const member = organizationPublicMembershipFindByExternalId(database, externalId, options.organizationUuid)
    if (!member.success) return member
    if (member.data !== null) membershipUuids.push(member.data.uuid)
  }

  return organizationGroupMembersReplace(
    database,
    options.organizationUuid,
    groupUuid,
    membershipUuids,
    options.clock.now().toISOString(),
  )
}

function organizationPublicImportNotify(database: DatabaseConnection, options: OrganizationPublicImportOptions): void {
  if (options.notification === undefined) return
  const memberUuidsResult = organizationMemberUserUuidsFind(database, options.organizationUuid)
  if (!memberUuidsResult.success) return
  const date = options.clock.now().toISOString()
  for (const userUuid of memberUuidsResult.data) {
    try {
      options.notification.sendUserUpdate({
        contextId: options.organizationUuid,
        payload: { Date: date, UserId: userUuid },
        type: notificationUpdateType.syncSettings,
      })
    } catch {}
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
      database.drizzle.delete(invitations).where(eq(invitations.email, user.email)).run()
      database.drizzle.delete(users).where(eq(users.uuid, user.uuid)).run()
    } catch {
      return resultErrorCreate("organizationPublicImport", "User rollback failed.")
    }
  }
  return resultErrorCreate("organizationPublicImport", "Error sending invite")
}

function organizationPublicOrganizationFind(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<OrganizationImportOrganization | null> {
  try {
    const row = database.drizzle
      .select({ billingEmail: organizations.billingEmail, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.uuid, organizationUuid))
      .limit(1)
      .get()
    return resultCreate(row ?? null)
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
    const row: UserOrganizationRow | undefined = database.drizzle
      .select({
        accessAll: usersOrganizations.accessAll,
        akey: usersOrganizations.akey,
        atype: usersOrganizations.atype,
        externalId: usersOrganizations.externalId,
        invitedByEmail: usersOrganizations.invitedByEmail,
        orgUuid: usersOrganizations.orgUuid,
        resetPasswordKey: usersOrganizations.resetPasswordKey,
        status: usersOrganizations.status,
        userUuid: usersOrganizations.userUuid,
        uuid: usersOrganizations.uuid,
      })
      .from(usersOrganizations)
      .innerJoin(users, eq(users.uuid, usersOrganizations.userUuid))
      .where(and(eq(users.email, email.toLowerCase()), eq(usersOrganizations.orgUuid, organizationUuid)))
      .limit(1)
      .get()
    return resultCreate(row === undefined ? null : organizationMembershipFromRow(row))
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
    const row: UserOrganizationRow | undefined = database.drizzle
      .select()
      .from(usersOrganizations)
      .where(and(eq(usersOrganizations.externalId, externalId), eq(usersOrganizations.orgUuid, organizationUuid)))
      .limit(1)
      .get()
    return resultCreate(row === undefined ? null : organizationMembershipFromRow(row))
  } catch {
    return resultErrorCreate("organizationPublicMembershipFindByExternalId", "Membership lookup failed.")
  }
}

function organizationPublicMembershipFindAll(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<OrganizationMembership[]> {
  try {
    const rows: UserOrganizationRow[] = database.drizzle
      .select()
      .from(usersOrganizations)
      .where(eq(usersOrganizations.orgUuid, organizationUuid))
      .all()
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
      database.drizzle
        .select({ uuid: groups.uuid })
        .from(groups)
        .where(and(eq(groups.externalId, externalId), eq(groups.organizationsUuid, organizationUuid)))
        .limit(1)
        .get() ?? null,
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
    database.drizzle
      .insert(usersOrganizations)
      .values({
        uuid: member.uuid,
        userUuid: member.userUuid,
        orgUuid: member.organizationUuid,
        invitedByEmail: member.invitedByEmail,
        accessAll: member.accessAll,
        akey: member.akey,
        status: member.status,
        atype: member.type,
        resetPasswordKey: member.resetPasswordKey,
        externalId: member.externalId,
      })
      .onConflictDoUpdate({
        target: usersOrganizations.uuid,
        set: {
          userUuid: member.userUuid,
          orgUuid: member.organizationUuid,
          invitedByEmail: member.invitedByEmail,
          accessAll: member.accessAll,
          akey: member.akey,
          status: member.status,
          atype: member.type,
          resetPasswordKey: member.resetPasswordKey,
          externalId: member.externalId,
        },
      })
      .run()
    database.drizzle
      .update(users)
      .set({ updatedAt: options.clock.now().toISOString() })
      .where(eq(users.uuid, userUuid))
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate("organizationPublicMembershipSave", "Membership save failed.")
  }
}

function organizationPublicMembershipDelete(database: DatabaseConnection, membershipUuid: string): Result<void> {
  try {
    const membership = database.drizzle
      .select({ orgUuid: usersOrganizations.orgUuid, userUuid: usersOrganizations.userUuid })
      .from(usersOrganizations)
      .where(eq(usersOrganizations.uuid, membershipUuid))
      .limit(1)
      .get()
    if (membership !== undefined) {
      const collectionUuids = database.drizzle
        .select({ uuid: collections.uuid })
        .from(collections)
        .where(eq(collections.orgUuid, membership.orgUuid))
      database.drizzle
        .delete(usersCollections)
        .where(
          and(
            eq(usersCollections.userUuid, membership.userUuid),
            inArray(usersCollections.collectionUuid, collectionUuids),
          ),
        )
        .run()
    }
    database.drizzle.delete(groupsUsers).where(eq(groupsUsers.usersOrganizationsUuid, membershipUuid)).run()
    database.drizzle.delete(usersOrganizations).where(eq(usersOrganizations.uuid, membershipUuid)).run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate("organizationPublicMembershipDelete", "Membership deletion failed.")
  }
}

function organizationPublicConfirmedOwnerCount(database: DatabaseConnection, organizationUuid: string): number {
  const row = database.drizzle
    .select({ count: count() })
    .from(usersOrganizations)
    .where(
      and(
        eq(usersOrganizations.orgUuid, organizationUuid),
        eq(usersOrganizations.status, organizationMembershipStatus.confirmed),
        eq(usersOrganizations.atype, organizationMembershipType.owner),
      ),
    )
    .get()
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
