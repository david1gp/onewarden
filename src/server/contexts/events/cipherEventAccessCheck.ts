import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { cipherFindByUuid } from "../ciphers/cipherFindByUuid.js"
import { organizationMembershipFindByUserAndOrganization } from "../organizations/organizationMembershipFindByUserAndOrganization.js"
import { organizationMembershipRoleCheck } from "../organizations/organizationMembershipRoleCheck.js"

export function cipherEventAccessCheck(
  database: DatabaseConnection,
  cipherUuid: string,
  userUuid: string,
): Result<boolean> {
  const cipherResult = cipherFindByUuid(database, cipherUuid)
  if (!cipherResult.success) return cipherResult
  if (cipherResult.data === null || cipherResult.data.organizationUuid === null) return resultCreate(false)
  const membershipResult = organizationMembershipFindByUserAndOrganization(
    database,
    userUuid,
    cipherResult.data.organizationUuid,
  )
  if (!membershipResult.success) return resultErrorCreate("cipherEventAccessCheck", "Cipher access lookup failed.")
  if (membershipResult.data === null) return resultCreate(false)
  return resultCreate(organizationMembershipRoleCheck(membershipResult.data, "admin"))
}
