import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Organization } from "./organization.js"
import { organizationFindByUuid } from "./organizationFindByUuid.js"
import { organizationMembershipFindMainByUser } from "./organizationMembershipFindMainByUser.js"
import { organizationPolicyFindByOrganizationAndType } from "./organizationPolicyFindByOrganizationAndType.js"
import { organizationPolicyType } from "./organizationPolicyType.js"
import { organizationResetPasswordPolicyAutoEnrollEnabled } from "./organizationResetPasswordPolicyAutoEnrollEnabled.js"

const fakeSsoOrganizationUuid = "00000000-01DC-01DC-01DC-000000000000"

export function organizationAutoEnrollStatusFind(
  database: DatabaseConnection,
  userUuid: string,
  identifier: string,
): Result<{ id: string; identifier: string; resetPasswordEnabled: boolean }> {
  let organizationResult: Result<Organization | null>
  if (identifier === fakeSsoOrganizationUuid) {
    const membershipResult = organizationMembershipFindMainByUser(database, userUuid)
    if (!membershipResult.success) return membershipResult
    if (membershipResult.data === null) return resultCreate(organizationAutoEnrollStatusUnknown(identifier))
    organizationResult = organizationFindByUuid(database, membershipResult.data.organizationUuid)
  } else {
    organizationResult = organizationFindByUuid(database, identifier)
  }
  if (!organizationResult.success) return organizationResult
  if (organizationResult.data === null) return resultCreate(organizationAutoEnrollStatusUnknown(identifier))

  const policyResult = organizationPolicyFindByOrganizationAndType(
    database,
    organizationResult.data.uuid,
    organizationPolicyType.resetPassword,
  )
  if (!policyResult.success) return policyResult
  const policy = policyResult.data
  return resultCreate({
    id: organizationResult.data.uuid,
    identifier: organizationResult.data.uuid,
    resetPasswordEnabled: policy?.enabled === true && organizationResetPasswordPolicyAutoEnrollEnabled(policy.data),
  })
}

function organizationAutoEnrollStatusUnknown(identifier: string) {
  return { id: identifier, identifier, resetPasswordEnabled: false as const }
}
