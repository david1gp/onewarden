import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { twoFactor } from "../../database/schema/twoFactor.js"
import { eq } from "drizzle-orm"

export function twoFactorRecordDelete(database: DatabaseConnection, uuid: string): Result<void> {
  const op = "twoFactorRecordDelete"
  try {
    database.drizzle.delete(twoFactor).where(eq(twoFactor.uuid, uuid)).run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Two-factor provider delete failed.")
  }
}
