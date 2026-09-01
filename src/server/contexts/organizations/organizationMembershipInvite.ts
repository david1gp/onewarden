import type { KeyInput } from "jose"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { and, eq, inArray } from "drizzle-orm"
import { collections } from "../../database/schema/collections.js"
import { groups } from "../../database/schema/groups.js"
import { groupsUsers } from "../../database/schema/groupsUsers.js"
import { invitations } from "../../database/schema/invitations.js"
import { users } from "../../database/schema/users.js"
import { usersCollections } from "../../database/schema/usersCollections.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { IdentityMailAdapter } from "../identity/identityMailAdapter.js"
import { identityEmailDomainAllowed } from "../identity/identityEmailDomainAllowed.js"
import { identityUserFindByEmail } from "../identity/identityUserFindByEmail.js"
import { identityUserSave } from "../identity/identityUserSave.js"
import { organizationFindByUuid } from "./organizationFindByUuid.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import type { OrganizationMembershipInviteData } from "./organizationMembershipInviteDataSchema.js"
import { organizationMembershipFindByUserAndOrganization } from "./organizationMembershipFindByUserAndOrganization.js"
import { organizationMembershipInviteTokenCreate } from "./organizationMembershipInviteTokenCreate.js"
import { organizationMembershipPendingUserCreate } from "./organizationMembershipPendingUserCreate.js"
import { organizationMembershipSave } from "./organizationMembershipSave.js"
import { organizationMembershipStatus } from "./organizationMembershipStatus.js"
import { organizationMembershipType } from "./organizationMembershipType.js"
import { organizationMembershipTypeResolve } from "./organizationMembershipTypeResolve.js"
import type { IdentityUser } from "../identity/identityUser.js"

type OrganizationMembershipInviteOptions = {
  clock: Clock
  config: IdentityConfig
  identifier: Identifier
  issuer: string
  mail?: IdentityMailAdapter
  privateKey: KeyInput | undefined
  actorMembership?: OrganizationMembership
}

type OrganizationMembershipInviteMutation = {
  membership: OrganizationMembership
  userUuid: string
}

export async function organizationMembershipInvite(
  database: DatabaseConnection,
  organizationUuid: string,
  invitedByEmail: string,
  data: OrganizationMembershipInviteData,
  options: OrganizationMembershipInviteOptions,
): Promise<Result<OrganizationMembershipInviteMutation[]>> {
  const op = "organizationMembershipInvite"
  const organizationResult = organizationFindByUuid(database, organizationUuid)
  if (!organizationResult.success) return organizationResult
  if (organizationResult.data === null) return resultErrorCreate(op, "Error looking up organization")

  const typeResult = organizationMembershipTypeResolve(data.type, data.permissions)
  if (!typeResult.success) return typeResult
  if (
    typeResult.data.type !== organizationMembershipType.user &&
    (options.actorMembership === undefined || options.actorMembership.type !== organizationMembershipType.owner)
  )
    return resultErrorCreate("organizationMembershipInvite", "Only Owners can invite Managers, Admins or Owners")
  const validationResult = organizationMembershipInviteDataValidate(database, organizationUuid, data)
  if (!validationResult.success) return validationResult
  const normalizedInvitedByEmail = invitedByEmail.trim().toLowerCase()
  const mutations: OrganizationMembershipInviteMutation[] = []

  for (const emailValue of data.emails) {
    const email = emailValue.trim().toLowerCase()
    const mutationResult = await organizationMembershipInviteOne(
      database,
      organizationUuid,
      organizationResult.data.name,
      normalizedInvitedByEmail,
      email,
      typeResult.data.type,
      typeResult.data.accessAll,
      data,
      options,
    )
    if (!mutationResult.success) return mutationResult
    mutations.push(mutationResult.data)
  }

  return resultCreate(mutations)
}

async function organizationMembershipInviteOne(
  database: DatabaseConnection,
  organizationUuid: string,
  organizationName: string,
  invitedByEmail: string,
  email: string,
  type: number,
  accessAll: boolean,
  data: OrganizationMembershipInviteData,
  options: OrganizationMembershipInviteOptions,
): Promise<Result<OrganizationMembershipInviteMutation>> {
  const userResult = identityUserFindByEmail(database, email)
  if (!userResult.success) return userResult
  let user = userResult.data
  let userCreated = false
  let memberStatus: number = organizationMembershipStatus.invited

  if (user === null) {
    if (!options.config.INVITATIONS_ALLOWED)
      return resultErrorCreate("organizationMembershipInvite", `User does not exist: ${email}`)
    if (!identityEmailDomainAllowed(options.config, email))
      return resultErrorCreate("organizationMembershipInvite", "Email domain not eligible for invitations")
    const newUserResult = organizationMembershipPendingUserCreate(
      email,
      options.clock,
      options.config,
      options.identifier,
    )
    if (!newUserResult.success) return newUserResult
    user = newUserResult.data
    userCreated = true
  } else {
    const existingMembershipResult = organizationMembershipFindByUserAndOrganization(
      database,
      user.uuid,
      organizationUuid,
    )
    if (!existingMembershipResult.success) return existingMembershipResult
    if (existingMembershipResult.data !== null)
      return resultErrorCreate("organizationMembershipInvite", `User already in organization: ${email}`)
    if (!options.config.MAIL_ENABLED && user.passwordHash.byteLength > 0)
      memberStatus = organizationMembershipStatus.accepted
  }

  const membership: OrganizationMembership = {
    accessAll,
    akey: "",
    externalId: null,
    invitedByEmail,
    organizationUuid,
    resetPasswordKey: null,
    status: memberStatus,
    type,
    userUuid: user.uuid,
    uuid: options.identifier.uuid(),
  }

  let inviteToken: string | undefined
  if (options.config.MAIL_ENABLED) {
    const tokenResult = await organizationMembershipInviteTokenCreate(
      user.uuid,
      user.email,
      organizationUuid,
      membership.uuid,
      invitedByEmail,
      options.issuer,
      options.privateKey,
      options.clock,
      options.config.INVITATION_EXPIRATION_HOURS,
    )
    if (!tokenResult.success) return tokenResult
    inviteToken = tokenResult.data
  }

  const saveResult = databaseTransaction(database, () => {
    if (userCreated) {
      const userSaveResult = identityUserSave(database, user as IdentityUser)
      if (!userSaveResult.success) return userSaveResult
    }
    if (!options.config.MAIL_ENABLED && user.passwordHash.byteLength === 0) {
      try {
        database.drizzle.insert(invitations).values({ email }).onConflictDoNothing().run()
      } catch {
        return resultErrorCreate("organizationMembershipInvite", "Invitation save failed.")
      }
    }
    const membershipSaveResult = organizationMembershipSave(database, membership, options.clock.now().toISOString())
    if (!membershipSaveResult.success) return membershipSaveResult
    return organizationMembershipInviteAssignmentsSave(database, membership, data, accessAll)
  })
  if (!saveResult.success) return saveResult

  if (options.config.MAIL_ENABLED) {
    const mailResult = await organizationMembershipInviteMailSend(
      options.mail?.sendInvite,
      user.email,
      organizationName,
      membership.uuid,
      inviteToken as string,
    )
    if (!mailResult.success) {
      const cleanupResult = organizationMembershipInviteCleanup(database, membership, user, userCreated)
      if (!cleanupResult.success) return cleanupResult
      return mailResult
    }
  }

  return resultCreate({ membership, userUuid: user.uuid })
}

async function organizationMembershipInviteMailSend(
  sendInvite: IdentityMailAdapter["sendInvite"],
  email: string,
  organizationName: string,
  membershipUuid: string,
  token: string,
): Promise<Result<void>> {
  if (sendInvite === undefined) return resultCreate(undefined)
  try {
    const result = await sendInvite(email, organizationName, membershipUuid, token)
    return result ?? resultCreate(undefined)
  } catch {
    return resultErrorCreate("organizationMembershipInviteMailSend", "Organization invitation mail failed.")
  }
}

function organizationMembershipInviteCleanup(
  database: DatabaseConnection,
  membership: OrganizationMembership,
  user: IdentityUser,
  userCreated: boolean,
): Result<void> {
  return databaseTransaction(database, () => {
    try {
      const collectionUuids = database.drizzle
        .select({ uuid: collections.uuid })
        .from(collections)
        .where(eq(collections.orgUuid, membership.organizationUuid))
      database.drizzle
        .delete(usersCollections)
        .where(and(eq(usersCollections.userUuid, user.uuid), inArray(usersCollections.collectionUuid, collectionUuids)))
        .run()
      database.drizzle.delete(groupsUsers).where(eq(groupsUsers.usersOrganizationsUuid, membership.uuid)).run()
      database.drizzle.delete(usersOrganizations).where(eq(usersOrganizations.uuid, membership.uuid)).run()
      if (userCreated) database.drizzle.delete(users).where(eq(users.uuid, user.uuid)).run()
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate("organizationMembershipInviteCleanup", "Organization invitation rollback failed.")
    }
  })
}

function organizationMembershipInviteDataValidate(
  database: DatabaseConnection,
  organizationUuid: string,
  data: OrganizationMembershipInviteData,
): Result<void> {
  try {
    for (const collection of data.collections ?? []) {
      const row = database.drizzle
        .select({ uuid: collections.uuid })
        .from(collections)
        .where(and(eq(collections.uuid, collection.id), eq(collections.orgUuid, organizationUuid)))
        .limit(1)
        .get()
      if (row === undefined) return resultErrorCreate("organizationMembershipInvite", "Invalid collection")
    }
    for (const groupUuid of data.groups ?? []) {
      const row = database.drizzle
        .select({ uuid: groups.uuid })
        .from(groups)
        .where(and(eq(groups.uuid, groupUuid), eq(groups.organizationsUuid, organizationUuid)))
        .limit(1)
        .get()
      if (row === undefined) return resultErrorCreate("organizationMembershipInvite", "Invalid group")
    }
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate("organizationMembershipInvite", "Organization membership validation failed.")
  }
}

function organizationMembershipInviteAssignmentsSave(
  database: DatabaseConnection,
  membership: OrganizationMembership,
  data: OrganizationMembershipInviteData,
  accessAll: boolean,
): Result<void> {
  try {
    if (!accessAll) {
      for (const collection of data.collections ?? []) {
        database.drizzle
          .insert(usersCollections)
          .values({
            userUuid: membership.userUuid,
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
    for (const groupUuid of data.groups ?? []) {
      database.drizzle
        .insert(groupsUsers)
        .values({ groupsUuid: groupUuid, usersOrganizationsUuid: membership.uuid })
        .onConflictDoNothing()
        .run()
    }
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate("organizationMembershipInvite", "Organization membership assignment failed.")
  }
}
