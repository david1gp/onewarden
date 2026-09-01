import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { authRequests } from "../../database/schema/authRequests.js"
import type { IdentityAuthRequest } from "./identityAuthRequest.js"
import { identityAuthRequestFromRow } from "./identityAuthRequestFromRow.js"
import { eq } from "drizzle-orm"

export function identityAuthRequestFindByUuid(
  database: DatabaseConnection,
  uuid: string,
): Result<IdentityAuthRequest | null> {
  const op = "identityAuthRequestFindByUuid"
  try {
    const row = database.drizzle.select().from(authRequests).where(eq(authRequests.uuid, uuid)).limit(1).get()
    return resultCreate(row === undefined ? null : identityAuthRequestFromRow(row))
  } catch {
    return resultErrorCreate(op, "Auth request lookup failed.")
  }
}
