import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function organizationMemberUserUuidsFind(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<string[]> {
  const op = "organizationMemberUserUuidsFind"
  try {
    const rows = database
      .query<{ user_uuid: string }, [string]>(
        "SELECT user_uuid FROM users_organizations WHERE org_uuid = ? ORDER BY user_uuid",
      )
      .all(organizationUuid)
    return resultCreate(rows.map((row) => row.user_uuid))
  } catch {
    return resultErrorCreate(op, "Organization member lookup failed.")
  }
}
