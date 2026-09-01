import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { inArray } from "drizzle-orm"
import { users } from "../../database/schema/users.js"

export function organizationCollectionRevisionUpdate(
  database: DatabaseConnection,
  userUuids: readonly string[],
  revisionDate: string,
): Result<void> {
  const op = "organizationCollectionRevisionUpdate"
  if (userUuids.length === 0) return resultCreate(undefined)
  try {
    database.drizzle.update(users).set({ updatedAt: revisionDate }).where(inArray(users.uuid, userUuids)).run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Collection user revision update failed.")
  }
}
