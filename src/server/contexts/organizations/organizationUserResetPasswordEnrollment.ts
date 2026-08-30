import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { AuthenticationContext } from "../authentication/authenticationContext.js"
import type { EventAdapter } from "../events/eventAdapter.js"
import { eventLogContextCreate } from "../events/eventLogContextCreate.js"
import { eventType } from "../events/eventType.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import { twoFactorPasswordOrOtpValidate } from "../twoFactor/twoFactorPasswordOrOtpValidate.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"
import { organizationMembershipSave } from "./organizationMembershipSave.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import { organizationResetPasswordPolicyAutoEnrollEnabled } from "./organizationResetPasswordPolicyAutoEnrollEnabled.js"
import { organizationResetPasswordPolicyCheck } from "./organizationResetPasswordPolicyCheck.js"
import type { OrganizationUserResetPasswordEnrollmentData } from "./organizationUserResetPasswordEnrollmentDataSchema.js"

type OrganizationUserResetPasswordEnrollmentOptions = {
  actor: AuthenticationContext
  actorMembership: OrganizationMembership
  clock: Clock
  config: IdentityConfig
  event?: EventAdapter
}

export async function organizationUserResetPasswordEnrollment(
  database: DatabaseConnection,
  organizationUuid: string,
  userUuid: string,
  data: OrganizationUserResetPasswordEnrollmentData,
  options: OrganizationUserResetPasswordEnrollmentOptions,
): Promise<Result<void>> {
  const op = "organizationUserResetPasswordEnrollment"
  if (userUuid !== options.actor.user.uuid)
    return organizationErrorCreate(op, "User to enroll isn't member of required organization")
  if (organizationUuid !== options.actorMembership.organizationUuid)
    return organizationErrorCreate(op, "Organization not found")

  const policyResult = organizationResetPasswordPolicyCheck(database, organizationUuid, options.config, op)
  if (!policyResult.success) return policyResult

  const resetPasswordKey =
    data.resetPasswordKey === undefined || data.resetPasswordKey === "" ? null : data.resetPasswordKey
  if (resetPasswordKey === null && organizationResetPasswordPolicyAutoEnrollEnabled(policyResult.data.data))
    return organizationErrorCreate(op, "Reset password can't be withdrawn due to an enterprise policy")

  if (resetPasswordKey !== null) {
    const validationResult = await twoFactorPasswordOrOtpValidate(
      database,
      options.actor.user,
      data,
      options.clock,
      options.config,
      true,
    )
    if (!validationResult.success) return validationResult
  }

  options.actorMembership.resetPasswordKey = resetPasswordKey
  const saveResult = organizationMembershipSave(database, options.actorMembership, options.clock.now().toISOString())
  if (!saveResult.success) return saveResult

  options.event?.organizationEventCreate(
    resetPasswordKey === null
      ? eventType.organizationUserResetPasswordWithdraw
      : eventType.organizationUserResetPasswordEnroll,
    options.actorMembership.uuid,
    organizationUuid,
    options.actor.user.uuid,
    eventLogContextCreate(options.actor),
  )
  return resultCreate(undefined)
}
