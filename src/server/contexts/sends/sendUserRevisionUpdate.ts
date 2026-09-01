import { eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { users } from "../../database/schema/users.js"

export function sendUserRevisionUpdate(
  database: DatabaseConnection,
  userUuid: string,
  revisionDate: string,
): Result<void> {
  const op = "sendUserRevisionUpdate"
  try {
    database.drizzle.update(users).set({ updatedAt: revisionDate }).where(eq(users.uuid, userUuid)).run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "User revision update failed.")
  }
}
