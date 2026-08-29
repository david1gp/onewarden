import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { organizationMembershipFromRow } from "./organizationMembershipFromRow.js"
import type { OrganizationMembershipRow } from "./organizationMembershipRow.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import { organizationMembershipStatus } from "./organizationMembershipStatus.js"

export function organizationMembershipFindMainByUser(
  database: DatabaseConnection,
  userUuid: string,
): Result<OrganizationMembership | null> {
  const op = "organizationMembershipFindMainByUser"
  try {
    const row = database
      .query<OrganizationMembershipRow, [string, number]>(
        `SELECT uuid, user_uuid, org_uuid, invited_by_email, access_all, akey,
                status, atype, reset_password_key, external_id
         FROM users_organizations
         WHERE user_uuid = ? AND status != ?
         ORDER BY atype ASC
         LIMIT 1`,
      )
      .get(userUuid, organizationMembershipStatus.revoked)
    return resultCreate(row === null ? null : organizationMembershipFromRow(row))
  } catch {
    return resultErrorCreate(op, "Organization membership lookup failed.")
  }
}
