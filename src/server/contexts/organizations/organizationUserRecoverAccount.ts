import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { AuthenticationContext } from "../authentication/authenticationContext.js"
import type { EventAdapter } from "../events/eventAdapter.js"
import { eventLogContextCreate } from "../events/eventLogContextCreate.js"
import { eventType } from "../events/eventType.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { IdentityMailAdapter } from "../identity/identityMailAdapter.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { identityUserPasswordSet } from "../identity/identityUserPasswordSet.js"
import { identityUserSave } from "../identity/identityUserSave.js"
import type { NotificationAdapter } from "../notifications/notificationAdapter.js"
import { notificationUpdateType } from "../notifications/notificationUpdateType.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import { organizationMembershipStatus } from "./organizationMembershipStatus.js"
import type { OrganizationUserRecoverAccountData } from "./organizationUserRecoverAccountDataSchema.js"
import { organizationUserResetPasswordApplicableAndPermissionCheck } from "./organizationUserResetPasswordApplicableAndPermissionCheck.js"
import { organizationUserResetPasswordTargetFind } from "./organizationUserResetPasswordTargetFind.js"

type OrganizationUserRecoverAccountOptions = {
  actor: AuthenticationContext
  actorMembership: OrganizationMembership
  clock: Clock
  config: IdentityConfig
  event?: EventAdapter
  identifier: Identifier
  mail?: IdentityMailAdapter
  notification?: NotificationAdapter
}

export async function organizationUserRecoverAccount(
  database: DatabaseConnection,
  organizationUuid: string,
  membershipUuid: string,
  data: OrganizationUserRecoverAccountData,
  options: OrganizationUserRecoverAccountOptions,
): Promise<Result<void>> {
  const op = "organizationUserRecoverAccount"
  if (organizationUuid !== options.actorMembership.organizationUuid)
    return organizationErrorCreate(op, "Organization not found")

  const targetResult = organizationUserResetPasswordTargetFind(database, organizationUuid, membershipUuid, op)
  if (!targetResult.success) return targetResult
  const { membership, organization, user } = targetResult.data
  const checkResult = organizationUserResetPasswordApplicableAndPermissionCheck(
    database,
    organizationUuid,
    options.actorMembership,
    membership,
    options.config,
    op,
  )
  if (!checkResult.success) return checkResult
  if (membership.resetPasswordKey === null)
    return organizationErrorCreate(op, "Password reset not or not correctly enrolled")
  if (membership.status !== organizationMembershipStatus.confirmed)
    return organizationErrorCreate(op, "Organization user must be confirmed for password reset functionality")

  const mailResult = await organizationUserRecoverAccountMailSend(
    options.mail?.sendAdminResetPassword,
    user,
    organization.name,
  )
  if (!mailResult.success) return mailResult

  const passwordResult = await identityUserPasswordSet(user, data.newMasterPasswordHash, data.key, {
    clearTrustedDevices: false,
    clock: options.clock,
    database,
    identifier: options.identifier,
    resetSecurityStamp: true,
  })
  if (!passwordResult.success) return passwordResult
  user.updatedAt = options.clock.now().toISOString()
  const saveResult = identityUserSave(database, user)
  if (!saveResult.success) return saveResult

  organizationUserRecoverAccountLogoutNotify(options.notification, user)
  options.event?.organizationEventCreate(
    eventType.organizationUserAdminResetPassword,
    membership.uuid,
    organizationUuid,
    options.actor.user.uuid,
    eventLogContextCreate(options.actor),
  )
  return resultCreate(undefined)
}

async function organizationUserRecoverAccountMailSend(
  sendAdminResetPassword: IdentityMailAdapter["sendAdminResetPassword"],
  user: IdentityUser,
  organizationName: string,
): Promise<Result<void>> {
  if (sendAdminResetPassword === undefined) return resultCreate(undefined)
  try {
    const result = await sendAdminResetPassword(
      user.email,
      user.name.length === 0 ? user.email : user.name,
      organizationName,
    )
    if (result === undefined || result.success) return result ?? resultCreate(undefined)
    return organizationErrorCreate(
      "organizationUserRecoverAccountMailSend",
      `Error sending user reset password email: ${result.errorMessage}`,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return organizationErrorCreate(
      "organizationUserRecoverAccountMailSend",
      `Error sending user reset password email: ${message}`,
    )
  }
}

function organizationUserRecoverAccountLogoutNotify(
  notification: NotificationAdapter | undefined,
  user: IdentityUser,
): void {
  if (notification === undefined) return
  try {
    notification.sendUpdate([user.uuid], {
      contextId: null,
      payload: { Date: new Date(user.updatedAt), UserId: user.uuid },
      type: notificationUpdateType.logOut,
    })
  } catch {
    return
  }
}
