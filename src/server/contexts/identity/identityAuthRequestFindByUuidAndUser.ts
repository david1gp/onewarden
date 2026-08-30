import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityAuthRequest } from "./identityAuthRequest.js"
import type { IdentityAuthRequestRow } from "./identityAuthRequestRow.js"
import { identityAuthRequestFromRow } from "./identityAuthRequestFromRow.js"
import { identityAuthRequestSelect } from "./identityAuthRequestSelect.js"

export function identityAuthRequestFindByUuidAndUser(
  database: DatabaseConnection,
  uuid: string,
  userUuid: string,
): Result<IdentityAuthRequest | null> {
  const op = "identityAuthRequestFindByUuidAndUser"
  try {
    const row = database
      .query<IdentityAuthRequestRow, [string, string]>(
        `SELECT ${identityAuthRequestSelect}
         FROM auth_requests WHERE uuid = ? AND user_uuid = ? LIMIT 1`,
      )
      .get(uuid, userUuid)
    return resultCreate(row === null ? null : identityAuthRequestFromRow(row))
  } catch {
    return resultErrorCreate(op, "Auth request lookup failed.")
  }
}
