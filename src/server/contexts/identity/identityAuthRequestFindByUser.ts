import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { authRequests } from "../../database/schema/authRequests.js"
import type { IdentityAuthRequest } from "./identityAuthRequest.js"
import { identityAuthRequestFromRow } from "./identityAuthRequestFromRow.js"
import { eq } from "drizzle-orm"

export function identityAuthRequestFindByUser(
  database: DatabaseConnection,
  userUuid: string,
): Result<IdentityAuthRequest[]> {
  const op = "identityAuthRequestFindByUser"
  try {
    const rows = database.drizzle.select().from(authRequests).where(eq(authRequests.userUuid, userUuid)).all()
    return resultCreate(rows.map(identityAuthRequestFromRow))
  } catch {
    return resultErrorCreate(op, "Auth request lookup failed.")
  }
}
