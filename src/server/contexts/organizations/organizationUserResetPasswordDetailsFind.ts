import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import { organizationUserResetPasswordApplicableAndPermissionCheck } from "./organizationUserResetPasswordApplicableAndPermissionCheck.js"
import { organizationUserResetPasswordTargetFind } from "./organizationUserResetPasswordTargetFind.js"

export function organizationUserResetPasswordDetailsFind(
  database: DatabaseConnection,
  organizationUuid: string,
  membershipUuid: string,
  actorMembership: OrganizationMembership,
  config: IdentityConfig,
): Result<Record<string, number | string | null>> {
  const op = "organizationUserResetPasswordDetailsFind"
  if (organizationUuid !== actorMembership.organizationUuid)
    return organizationErrorCreate(op, "Organization not found")

  const targetResult = organizationUserResetPasswordTargetFind(database, organizationUuid, membershipUuid, op)
  if (!targetResult.success) return targetResult

  const { membership, organization, user } = targetResult.data
  const checkResult = organizationUserResetPasswordApplicableAndPermissionCheck(
    database,
    organizationUuid,
    actorMembership,
    membership,
    config,
    op,
  )
  if (!checkResult.success) return checkResult

  return resultCreate({
    encryptedPrivateKey: organization.privateKey,
    kdf: user.clientKdfType,
    kdfIterations: user.clientKdfIter,
    kdfMemory: user.clientKdfMemory,
    kdfParallelism: user.clientKdfParallelism,
    object: "organizationUserResetPasswordDetails",
    organizationUserId: membership.uuid,
    resetPasswordKey: membership.resetPasswordKey,
  })
}
