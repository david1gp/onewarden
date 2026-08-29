import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { IdentityMailAdapter } from "../identity/identityMailAdapter.js"
import { identityUserFindByUuid } from "../identity/identityUserFindByUuid.js"
import { twoFactorIncompleteComplete } from "./twoFactorIncompleteComplete.js"

type TwoFactorIncompleteNotificationOptions = {
  clock: Clock
  config: Pick<IdentityConfig, "MAIL_ENABLED" | "INCOMPLETE_2FA_TIME_LIMIT">
  database: DatabaseConnection
  mail: IdentityMailAdapter
}

type TwoFactorIncompleteRow = {
  device_name: string
  device_type: number
  device_uuid: string
  ip_address: string
  login_time: string
  user_uuid: string
}

export async function twoFactorIncompleteNotificationRun(
  options: TwoFactorIncompleteNotificationOptions,
): Promise<Result<number>> {
  const op = "twoFactorIncompleteNotificationRun"
  const timeLimit = options.config.INCOMPLETE_2FA_TIME_LIMIT ?? 3
  const sendNotification = options.mail.sendIncompleteTwoFactorLogin
  if (!options.config.MAIL_ENABLED || timeLimit <= 0 || sendNotification === undefined) return resultCreate(0)

  try {
    const cutoff = new Date(options.clock.now().getTime() - timeLimit * 60_000).toISOString()
    const rows = options.database
      .query<TwoFactorIncompleteRow, [string]>(
        `SELECT user_uuid, device_uuid, device_name, device_type, login_time, ip_address
         FROM twofactor_incomplete WHERE login_time < ? ORDER BY login_time`,
      )
      .all(cutoff)
    let notified = 0
    for (const row of rows) {
      const userResult = identityUserFindByUuid(options.database, row.user_uuid)
      if (!userResult.success) return userResult
      if (userResult.data === null) {
        const deleteResult = twoFactorIncompleteComplete(options.database, row.user_uuid, row.device_uuid)
        if (!deleteResult.success) return deleteResult
        continue
      }
      let sendResult: Result<void>
      try {
        sendResult = await sendNotification(
          userResult.data.email,
          row.ip_address,
          row.login_time,
          row.device_name,
          row.device_type,
        )
      } catch {
        return resultErrorCreate(op, "Incomplete two-factor notification failed.")
      }
      if (!sendResult.success) return sendResult
      const deleteResult = twoFactorIncompleteComplete(options.database, row.user_uuid, row.device_uuid)
      if (!deleteResult.success) return deleteResult
      notified += 1
    }
    return resultCreate(notified)
  } catch {
    return resultErrorCreate(op, "Incomplete two-factor notification lookup failed.")
  }
}
