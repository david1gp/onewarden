import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import { organizationMembershipType } from "./organizationMembershipType.js"
import { organizationResetPasswordPolicyCheck } from "./organizationResetPasswordPolicyCheck.js"

export function organizationUserResetPasswordApplicableAndPermissionCheck(
  database: DatabaseConnection,
  organizationUuid: string,
  actorMembership: OrganizationMembership,
  targetMembership: OrganizationMembership,
  config: IdentityConfig,
  operation: string,
): Result<void> {
  const policyResult = organizationResetPasswordPolicyCheck(database, organizationUuid, config, operation)
  if (!policyResult.success) return policyResult

  if (
    actorMembership.type === organizationMembershipType.owner ||
    (actorMembership.type === organizationMembershipType.admin &&
      targetMembership.type !== organizationMembershipType.owner &&
      (targetMembership.type === organizationMembershipType.admin ||
        targetMembership.type === organizationMembershipType.manager ||
        targetMembership.type === organizationMembershipType.user))
  )
    return resultCreate(undefined)

  return organizationErrorCreate(operation, "No permission to reset this user's password")
}
