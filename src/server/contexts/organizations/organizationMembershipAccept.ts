import type { KeyInput } from "jose"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { IdentityMailAdapter } from "../identity/identityMailAdapter.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { identityInvitationTake } from "../identity/identityInvitationTake.js"
import { organizationFindByUuid } from "./organizationFindByUuid.js"
import type { OrganizationMembershipAcceptData } from "./organizationMembershipAcceptDataSchema.js"
import { organizationMembershipFindByUuidAndOrganization } from "./organizationMembershipFindByUuidAndOrganization.js"
import { organizationMembershipInviteTokenDecode } from "./organizationMembershipInviteTokenDecode.js"
import { organizationMembershipSave } from "./organizationMembershipSave.js"
import { organizationMembershipStatus } from "./organizationMembershipStatus.js"

type OrganizationMembershipAcceptOptions = {
  clock: Clock
  config: IdentityConfig
  issuer: string
  mail?: IdentityMailAdapter
  publicKey: KeyInput | undefined
}

export async function organizationMembershipAccept(
  database: DatabaseConnection,
  user: IdentityUser,
  organizationUuid: string,
  membershipUuid: string,
  data: OrganizationMembershipAcceptData,
  options: OrganizationMembershipAcceptOptions,
): Promise<Result<{ userUuid: string }>> {
  const claimsResult = await organizationMembershipInviteTokenDecode(
    data.token,
    options.issuer,
    options.publicKey,
    options.clock,
  )
  if (!claimsResult.success) return claimsResult
  const claims = claimsResult.data
  if (claims.subject !== user.uuid)
    return resultErrorCreate("organizationMembershipAccept", "Invitation was issued to a different account")
  if (claims.email.toLowerCase() !== user.email.toLowerCase())
    return resultErrorCreate("organizationMembershipAccept", "Invitation was issued to a different account")
  if (claims.organizationId !== organizationUuid)
    return resultErrorCreate("organizationMembershipAccept", "Error accepting the invitation")
  if (claims.memberId !== membershipUuid)
    return resultErrorCreate("organizationMembershipAccept", "Error accepting the invitation")

  const memberResult = organizationMembershipFindByUuidAndOrganization(database, membershipUuid, organizationUuid)
  if (!memberResult.success) return memberResult
  if (memberResult.data === null)
    return resultErrorCreate("organizationMembershipAccept", "Error accepting the invitation")
  const membership = memberResult.data
  if (membership.userUuid !== user.uuid)
    return resultErrorCreate("organizationMembershipAccept", "Error accepting the invitation")
  if (membership.status !== organizationMembershipStatus.invited)
    return resultErrorCreate("organizationMembershipAccept", "User already accepted the invitation")
  if (membership.invitedByEmail === null) membership.invitedByEmail = claims.invitedByEmail
  membership.status = organizationMembershipStatus.accepted
  if (
    options.config.MAIL_ENABLED &&
    (data.resetPasswordKey === undefined || data.resetPasswordKey === null || data.resetPasswordKey.length === 0)
  )
    return resultErrorCreate("organizationMembershipAccept", "Reset password key is required, but not provided.")
  membership.resetPasswordKey = options.config.MAIL_ENABLED ? (data.resetPasswordKey as string) : null

  let organizationName: string | undefined
  let invitedByAddress: string | undefined
  if (options.config.MAIL_ENABLED) {
    const organizationResult = organizationFindByUuid(database, organizationUuid)
    if (!organizationResult.success) return organizationResult
    if (organizationResult.data === null)
      return resultErrorCreate("organizationMembershipAccept", "Organization not found.")
    organizationName = organizationResult.data.name
    invitedByAddress = membership.invitedByEmail ?? organizationResult.data.billingEmail
  }

  const saveResult = databaseTransaction(database, () =>
    organizationMembershipAcceptPersist(database, user.email, membership, options.clock.now().toISOString()),
  )
  if (!saveResult.success) return saveResult

  if (options.config.MAIL_ENABLED) {
    const mailResult = await organizationMembershipAcceptMailSend(
      options.mail?.sendInviteAccepted,
      user.email,
      invitedByAddress as string,
      organizationName as string,
    )
    if (!mailResult.success) return mailResult
  }

  return resultCreate({ userUuid: user.uuid })
}

function organizationMembershipAcceptPersist(
  database: DatabaseConnection,
  email: string,
  membership: import("./organizationMembershipSchema.js").OrganizationMembership,
  revisionDate: string,
): Result<void> {
  const invitationResult = identityInvitationTake(database, email)
  if (!invitationResult.success) return invitationResult
  return organizationMembershipSave(database, membership, revisionDate)
}

async function organizationMembershipAcceptMailSend(
  sendInviteAccepted: IdentityMailAdapter["sendInviteAccepted"],
  newUserEmail: string,
  address: string,
  organizationName: string,
): Promise<Result<void>> {
  if (sendInviteAccepted === undefined) return resultCreate(undefined)
  try {
    const result = await sendInviteAccepted(newUserEmail, address, organizationName)
    return result ?? resultCreate(undefined)
  } catch {
    return resultErrorCreate("organizationMembershipAcceptMailSend", "Organization invitation mail failed.")
  }
}
