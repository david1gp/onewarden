import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Organization } from "./organization.js"
import { organizationSelect } from "./organizationSelect.js"

export function organizationFindByUuid(database: DatabaseConnection, uuid: string): Result<Organization | null> {
  const op = "organizationFindByUuid"
  try {
    const row = database
      .query<Organization, [string]>(`SELECT ${organizationSelect} FROM organizations WHERE uuid = ? LIMIT 1`)
      .get(uuid)
    return resultCreate(row)
  } catch {
    return resultErrorCreate(op, "Organization lookup failed.")
  }
}
