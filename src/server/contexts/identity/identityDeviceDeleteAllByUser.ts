import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { devices } from "../../database/schema/devices.js"
import { eq } from "drizzle-orm"

export function identityDeviceDeleteAllByUser(database: DatabaseConnection, userUuid: string): Result<void> {
  const op = "identityDeviceDeleteAllByUser"
  try {
    database.drizzle.delete(devices).where(eq(devices.userUuid, userUuid)).run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Device deletion failed.")
  }
}
