import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function identitySsoAuthDelete(database: DatabaseConnection, state: string): Result<void> {
  const op = "identitySsoAuthDelete"
  try {
    database.run("DELETE FROM sso_auth WHERE state = ?", [state])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "SSO auth delete failed.")
  }
}
