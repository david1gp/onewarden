import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityAuthRequest } from "./identityAuthRequest.js"
import type { IdentityAuthRequestRow } from "./identityAuthRequestRow.js"
import { identityAuthRequestFromRow } from "./identityAuthRequestFromRow.js"
import { identityAuthRequestSelect } from "./identityAuthRequestSelect.js"

export function identityAuthRequestFindByUser(
  database: DatabaseConnection,
  userUuid: string,
): Result<IdentityAuthRequest[]> {
  const op = "identityAuthRequestFindByUser"
  try {
    const rows = database
      .query<IdentityAuthRequestRow, [string]>(
        `SELECT ${identityAuthRequestSelect} FROM auth_requests WHERE user_uuid = ?`,
      )
      .all(userUuid)
    return resultCreate(rows.map(identityAuthRequestFromRow))
  } catch {
    return resultErrorCreate(op, "Auth request lookup failed.")
  }
}
