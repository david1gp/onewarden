import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"
import type { OrganizationMembership } from "./organizationMembershipSchema.js"
import { organizationMembershipStatus } from "./organizationMembershipStatus.js"
import { organizationMembershipType } from "./organizationMembershipType.js"

export function organizationLeave(
  database: DatabaseConnection,
  membership: OrganizationMembership,
  revisionDate: string,
): Result<void> {
  return databaseTransaction(database, () => {
    if (membership.status !== organizationMembershipStatus.confirmed)
      return organizationErrorCreate(
        "organizationLeave",
        "You need to be a Member of the Organization to call this endpoint",
      )

    try {
      if (membership.type === organizationMembershipType.owner) {
        const ownerCount = database
          .query<{ count: number }, [string, number, number]>(
            "SELECT COUNT(*) AS count FROM users_organizations WHERE org_uuid = ? AND status = ? AND atype = ?",
          )
          .get(
            membership.organizationUuid,
            organizationMembershipStatus.confirmed,
            organizationMembershipType.owner,
          )?.count
        if (ownerCount === undefined || ownerCount <= 1)
          return organizationErrorCreate("organizationLeave", "The last owner can't leave")
      }

      database.run(
        `UPDATE users
         SET updated_at = ?
         WHERE uuid = ?`,
        [revisionDate, membership.userUuid],
      )
      database.run(
        `DELETE FROM users_collections
         WHERE user_uuid = ?
           AND collection_uuid IN (SELECT uuid FROM collections WHERE org_uuid = ?)`,
        [membership.userUuid, membership.organizationUuid],
      )
      database.run("DELETE FROM groups_users WHERE users_organizations_uuid = ?", [membership.uuid])
      database.run("DELETE FROM users_organizations WHERE uuid = ?", [membership.uuid])
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate("organizationLeave", "Organization leave failed.")
    }
  })
}
