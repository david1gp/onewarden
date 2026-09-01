import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { authRequests } from "../../database/schema/authRequests.js"
import type { IdentityAuthRequest } from "./identityAuthRequest.js"
import { identityAuthRequestFromRow } from "./identityAuthRequestFromRow.js"
import { and, eq } from "drizzle-orm"

export function identityAuthRequestFindByUuidAndUser(
  database: DatabaseConnection,
  uuid: string,
  userUuid: string,
): Result<IdentityAuthRequest | null> {
  const op = "identityAuthRequestFindByUuidAndUser"
  try {
    const row = database.drizzle
      .select()
      .from(authRequests)
      .where(and(eq(authRequests.uuid, uuid), eq(authRequests.userUuid, userUuid)))
      .limit(1)
      .get()
    return resultCreate(row === undefined ? null : identityAuthRequestFromRow(row))
  } catch {
    return resultErrorCreate(op, "Auth request lookup failed.")
  }
}
