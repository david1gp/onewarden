import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityAuthRequest } from "./identityAuthRequest.js"
import type { IdentityAuthRequestRow } from "./identityAuthRequestRow.js"
import { identityAuthRequestFromRow } from "./identityAuthRequestFromRow.js"
import { identityAuthRequestSelect } from "./identityAuthRequestSelect.js"

export function identityAuthRequestFindByUserAndRequestedDevice(
  database: DatabaseConnection,
  userUuid: string,
  deviceUuid: string,
): Result<IdentityAuthRequest | null> {
  const op = "identityAuthRequestFindByUserAndRequestedDevice"
  try {
    const row = database
      .query<IdentityAuthRequestRow, [string, string]>(
        `SELECT ${identityAuthRequestSelect}
         FROM auth_requests
         WHERE user_uuid = ? AND request_device_identifier = ? AND approved IS NULL
         ORDER BY creation_date DESC
         LIMIT 1`,
      )
      .get(userUuid, deviceUuid)
    return resultCreate(row === null ? null : identityAuthRequestFromRow(row))
  } catch {
    return resultErrorCreate(op, "Auth request lookup failed.")
  }
}
