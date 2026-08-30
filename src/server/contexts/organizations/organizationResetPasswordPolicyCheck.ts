import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"
import type { OrganizationPolicy } from "./organizationPolicy.js"
import { organizationPolicyFindByOrganizationAndType } from "./organizationPolicyFindByOrganizationAndType.js"
import { organizationPolicyType } from "./organizationPolicyType.js"

export function organizationResetPasswordPolicyCheck(
  database: DatabaseConnection,
  organizationUuid: string,
  config: Pick<IdentityConfig, "MAIL_ENABLED">,
  operation: string,
): Result<OrganizationPolicy> {
  if (!config.MAIL_ENABLED)
    return organizationErrorCreate(operation, "Password reset is not supported on an email-disabled instance.")

  const policyResult = organizationPolicyFindByOrganizationAndType(
    database,
    organizationUuid,
    organizationPolicyType.resetPassword,
  )
  if (!policyResult.success) return policyResult
  if (policyResult.data === null) return organizationErrorCreate(operation, "Policy not found")
  if (!policyResult.data.enabled) return organizationErrorCreate(operation, "Reset password policy not enabled")

  return resultCreate(policyResult.data)
}
