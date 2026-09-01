import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { authRequests } from "../../database/schema/authRequests.js"
import type { IdentityAuthRequest } from "./identityAuthRequest.js"
import { eq } from "drizzle-orm"

export function identityAuthRequestDelete(
  database: DatabaseConnection,
  request: IdentityAuthRequest | string,
): Result<void> {
  const op = "identityAuthRequestDelete"
  try {
    const uuid = typeof request === "string" ? request : request.uuid
    database.drizzle.delete(authRequests).where(eq(authRequests.uuid, uuid)).run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Auth request delete failed.")
  }
}
