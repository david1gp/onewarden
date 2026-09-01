import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { devices } from "../../database/schema/devices.js"
import { eq } from "drizzle-orm"

export function identityDeviceClearPushTokenByUuid(database: DatabaseConnection, uuid: string): Result<void> {
  const op = "identityDeviceClearPushTokenByUuid"
  try {
    database.drizzle.update(devices).set({ pushToken: null }).where(eq(devices.uuid, uuid)).run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Push token removal failed.")
  }
}
