import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { IdentityMailAdapter } from "../identity/identityMailAdapter.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { identityUserFindByUuid } from "../identity/identityUserFindByUuid.js"
import { organizationFindByUuid } from "./organizationFindByUuid.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import { organizationMembershipFindByUuidAndOrganization } from "./organizationMembershipFindByUuidAndOrganization.js"
import { organizationMembershipSave } from "./organizationMembershipSave.js"
import { organizationMembershipStatus } from "./organizationMembershipStatus.js"
import { organizationMembershipType } from "./organizationMembershipType.js"

type OrganizationMembershipConfirmOptions = {
  clock: Clock
  config: IdentityConfig
  mail?: IdentityMailAdapter
}

export async function organizationMembershipConfirm(
  database: DatabaseConnection,
  actorMembership: OrganizationMembership,
  organizationUuid: string,
  membershipUuid: string,
  key: string,
  options: OrganizationMembershipConfirmOptions,
): Promise<Result<{ revisionDate: string; userUuid: string }>> {
  if (key.length === 0 || membershipUuid.length === 0)
    return resultErrorCreate("organizationMembershipConfirm", "Key or UserId is not set, unable to process request")

  const memberResult = organizationMembershipFindByUuidAndOrganization(database, membershipUuid, organizationUuid)
  if (!memberResult.success) return memberResult
  if (memberResult.data === null)
    return resultErrorCreate("organizationMembershipConfirm", "The specified user isn't a member of the organization")
  const membership = memberResult.data
  if (membership.type !== organizationMembershipType.user && actorMembership.type !== organizationMembershipType.owner)
    return resultErrorCreate("organizationMembershipConfirm", "Only Owners can confirm Managers, Admins or Owners")
  if (membership.status !== organizationMembershipStatus.accepted)
    return resultErrorCreate("organizationMembershipConfirm", "User in invalid state")

  const userResult = identityUserFindByUuid(database, membership.userUuid)
  if (!userResult.success) return userResult
  if (userResult.data === null) return resultErrorCreate("organizationMembershipConfirm", "Error looking up user.")
  const user = userResult.data
  const organizationResult = organizationFindByUuid(database, organizationUuid)
  if (!organizationResult.success) return organizationResult
  if (organizationResult.data === null)
    return resultErrorCreate("organizationMembershipConfirm", "Error looking up organization.")

  if (options.config.MAIL_ENABLED) {
    const mailResult = await organizationMembershipConfirmMailSend(
      options.mail?.sendInviteConfirmed,
      user,
      organizationResult.data.name,
    )
    if (!mailResult.success) return mailResult
  }

  membership.status = organizationMembershipStatus.confirmed
  membership.akey = key
  const revisionDate = options.clock.now().toISOString()
  const saveResult = databaseTransaction(database, () => organizationMembershipSave(database, membership, revisionDate))
  if (!saveResult.success) return saveResult
  return resultCreate({ revisionDate, userUuid: user.uuid })
}

async function organizationMembershipConfirmMailSend(
  sendInviteConfirmed: IdentityMailAdapter["sendInviteConfirmed"],
  user: IdentityUser,
  organizationName: string,
): Promise<Result<void>> {
  if (sendInviteConfirmed === undefined) return resultCreate(undefined)
  try {
    const result = await sendInviteConfirmed(user.email, organizationName)
    return result ?? resultCreate(undefined)
  } catch {
    return resultErrorCreate("organizationMembershipConfirmMailSend", "Organization invitation mail failed.")
  }
}
