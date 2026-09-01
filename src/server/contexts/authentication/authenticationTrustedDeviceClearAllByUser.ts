import type { Result } from "#result"
import { eq } from "drizzle-orm"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { devices } from "../../database/schema/devices.js"

export function authenticationTrustedDeviceClearAllByUser(
  database: DatabaseConnection,
  userUuid: string,
): Result<void> {
  const op = "authenticationTrustedDeviceClearAllByUser"
  try {
    database.drizzle.update(devices).set({ twofactorRemember: null }).where(eq(devices.userUuid, userUuid)).run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Trusted-device token clear failed.")
  }
}
