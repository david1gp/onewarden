import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"

export function identityDeviceClearPushTokenByUuid(database: DatabaseConnection, uuid: string): Result<void> {
  const op = "identityDeviceClearPushTokenByUuid"
  try {
    database.run("UPDATE devices SET push_token = NULL WHERE uuid = ?", [uuid])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Push token removal failed.")
  }
}
