import type { KeyInput } from "jose"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { invitations } from "../../database/schema/invitations.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { IdentityMailAdapter } from "../identity/identityMailAdapter.js"
import { identityInvitationTake } from "../identity/identityInvitationTake.js"
import { identityUserFindByUuid } from "../identity/identityUserFindByUuid.js"
import { organizationFindByUuid } from "./organizationFindByUuid.js"
import { organizationMembershipFindByUuidAndOrganization } from "./organizationMembershipFindByUuidAndOrganization.js"
import { organizationMembershipInviteTokenCreate } from "./organizationMembershipInviteTokenCreate.js"
import { organizationMembershipSave } from "./organizationMembershipSave.js"
import { organizationMembershipStatus } from "./organizationMembershipStatus.js"

type OrganizationMembershipResendOptions = {
  clock: Clock
  config: IdentityConfig
  issuer: string
  mail?: IdentityMailAdapter
  privateKey: KeyInput | undefined
}

export async function organizationMembershipResend(
  database: DatabaseConnection,
  organizationUuid: string,
  membershipUuid: string,
  invitedByEmail: string,
  options: OrganizationMembershipResendOptions,
): Promise<Result<{ statusChanged: boolean; userUuid: string }>> {
  const memberResult = organizationMembershipFindByUuidAndOrganization(database, membershipUuid, organizationUuid)
  if (!memberResult.success) return memberResult
  if (memberResult.data === null)
    return resultErrorCreate("organizationMembershipResend", "The user hasn't been invited to the organization.")
  const membership = memberResult.data
  if (membership.status !== organizationMembershipStatus.invited)
    return resultErrorCreate(
      "organizationMembershipResend",
      "The user is already accepted or confirmed to the organization",
    )

  const userResult = identityUserFindByUuid(database, membership.userUuid)
  if (!userResult.success) return userResult
  if (userResult.data === null) return resultErrorCreate("organizationMembershipResend", "User not found.")
  const user = userResult.data
  if (!options.config.INVITATIONS_ALLOWED && user.passwordHash.byteLength === 0)
    return resultErrorCreate("organizationMembershipResend", "Invitations are not allowed.")

  const organizationResult = organizationFindByUuid(database, organizationUuid)
  if (!organizationResult.success) return organizationResult
  if (organizationResult.data === null)
    return resultErrorCreate("organizationMembershipResend", "Error looking up organization.")

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
    const mailResult = await organizationMembershipResendMailSend(
      options.mail?.sendInvite,
      user.email,
      organizationResult.data.name,
      membership.uuid,
      tokenResult.data,
    )
    if (!mailResult.success) return mailResult
    return resultCreate({ statusChanged: false, userUuid: user.uuid })
  }

  if (user.passwordHash.byteLength === 0) {
    const invitationResult = databaseTransaction(database, () => identityInvitationSave(database, user.email))
    if (!invitationResult.success) return invitationResult
    return resultCreate({ statusChanged: false, userUuid: user.uuid })
  }

  membership.status = organizationMembershipStatus.accepted
  const saveResult = databaseTransaction(database, () => {
    const invitationResult = identityInvitationTake(database, user.email)
    if (!invitationResult.success) return invitationResult
    return organizationMembershipSave(database, membership, options.clock.now().toISOString())
  })
  if (!saveResult.success) return saveResult
  return resultCreate({ statusChanged: true, userUuid: user.uuid })
}

async function organizationMembershipResendMailSend(
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
    return resultErrorCreate("organizationMembershipResendMailSend", "Organization invitation mail failed.")
  }
}

function identityInvitationSave(database: DatabaseConnection, email: string): Result<void> {
  try {
    database.drizzle.insert(invitations).values({ email: email.toLowerCase() }).onConflictDoNothing().run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate("identityInvitationSave", "Invitation save failed.")
  }
}
