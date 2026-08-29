import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import { organizationMembershipFromRow } from "./organizationMembershipFromRow.js"
import type { OrganizationMembershipRow } from "./organizationMembershipRow.js"

export function organizationMembershipFindByUuidAndOrganization(
  database: DatabaseConnection,
  membershipUuid: string,
  organizationUuid: string,
): Result<OrganizationMembership | null> {
  const op = "organizationMembershipFindByUuidAndOrganization"
  try {
    const row = database
      .query<OrganizationMembershipRow, [string, string]>(
        `SELECT uuid, user_uuid, org_uuid, invited_by_email, access_all, akey,
           status, atype, reset_password_key, external_id
         FROM users_organizations
         WHERE uuid = ? AND org_uuid = ?
         LIMIT 1`,
      )
      .get(membershipUuid, organizationUuid)
    return resultCreate(row === null ? null : organizationMembershipFromRow(row))
  } catch {
    return resultErrorCreate(op, "Organization membership lookup failed.")
  }
}
