import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationPolicyType } from "./organizationPolicy.js"
import { organizationPolicyFindActiveByUserAndType } from "./organizationPolicyFindActiveByUserAndType.js"

export function organizationPolicyIsApplicableToUser(
  database: DatabaseConnection,
  userUuid: string,
  type: OrganizationPolicyType,
  excludeOrganizationUuid?: string,
): Result<boolean> {
  const policiesResult = organizationPolicyFindActiveByUserAndType(database, userUuid, type)
  if (!policiesResult.success) return policiesResult
  return resultCreate(policiesResult.data.some((policy) => policy.organizationUuid !== excludeOrganizationUuid))
}
