import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityAuthRequest } from "./identityAuthRequest.js"
import type { IdentityAuthRequestRow } from "./identityAuthRequestRow.js"
import { identityAuthRequestFromRow } from "./identityAuthRequestFromRow.js"
import { identityAuthRequestSelect } from "./identityAuthRequestSelect.js"

export function identityAuthRequestFindByUuid(
  database: DatabaseConnection,
  uuid: string,
): Result<IdentityAuthRequest | null> {
  const op = "identityAuthRequestFindByUuid"
  try {
    const row = database
      .query<IdentityAuthRequestRow, [string]>(
        `SELECT ${identityAuthRequestSelect} FROM auth_requests WHERE uuid = ? LIMIT 1`,
      )
      .get(uuid)
    return resultCreate(row === null ? null : identityAuthRequestFromRow(row))
  } catch {
    return resultErrorCreate(op, "Auth request lookup failed.")
  }
}
