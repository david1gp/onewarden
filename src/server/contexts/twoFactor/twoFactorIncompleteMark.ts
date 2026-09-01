import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import { twoFactorIncomplete, type TwoFactorIncompleteInsert } from "../../database/schema/twoFactorIncomplete.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"

export function twoFactorIncompleteMark(
  database: DatabaseConnection,
  userUuid: string,
  deviceUuid: string,
  deviceName: string,
  deviceType: number,
  ipAddress: string,
  clock: Clock,
  config: Pick<IdentityConfig, "MAIL_ENABLED" | "INCOMPLETE_2FA_TIME_LIMIT">,
): Result<void> {
  const op = "twoFactorIncompleteMark"
  if (!config.MAIL_ENABLED || (config.INCOMPLETE_2FA_TIME_LIMIT ?? 3) <= 0) return resultCreate(undefined)
  try {
    const values: TwoFactorIncompleteInsert = {
      userUuid,
      deviceUuid,
      deviceName,
      deviceType,
      loginTime: clock.now().toISOString(),
      ipAddress,
    }
    database.drizzle
      .insert(twoFactorIncomplete)
      .values(values)
      .onConflictDoNothing({ target: [twoFactorIncomplete.userUuid, twoFactorIncomplete.deviceUuid] })
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Incomplete two-factor login save failed.")
  }
}
