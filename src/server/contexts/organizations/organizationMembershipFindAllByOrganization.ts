import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { organizationMembershipFromRow } from "./organizationMembershipFromRow.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import type { OrganizationMembershipRow } from "./organizationMembershipRow.js"

export function organizationMembershipFindAllByOrganization(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<OrganizationMembership[]> {
  const op = "organizationMembershipFindAllByOrganization"
  try {
    const rows = database
      .query<OrganizationMembershipRow, [string]>(
        `SELECT uuid, user_uuid, org_uuid, invited_by_email, access_all, akey,
                status, atype, reset_password_key, external_id
         FROM users_organizations
         WHERE org_uuid = ?
         ORDER BY uuid`,
      )
      .all(organizationUuid)
    return resultCreate(rows.map(organizationMembershipFromRow))
  } catch {
    return resultErrorCreate(op, "Organization membership lookup failed.")
  }
}
