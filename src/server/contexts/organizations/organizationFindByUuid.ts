import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Organization } from "./organization.js"
import { organizationFromRow } from "./organizationFromRow.js"
import type { OrganizationRow } from "./organizationRow.js"

export function organizationFindByUuid(database: DatabaseConnection, uuid: string): Result<Organization | null> {
  const op = "organizationFindByUuid"
  try {
    const row = database
      .query<OrganizationRow, [string]>(
        "SELECT uuid, name, billing_email, private_key, public_key FROM organizations WHERE uuid = ? LIMIT 1",
      )
      .get(uuid)
    return resultCreate(row === null ? null : organizationFromRow(row))
  } catch {
    return resultErrorCreate(op, "Organization lookup failed.")
  }
}
