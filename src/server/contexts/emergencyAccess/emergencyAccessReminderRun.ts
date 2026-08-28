import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { emergencyAccessFindAllRecoveriesInitiated } from "./emergencyAccessFindAllRecoveriesInitiated.js"
import { emergencyAccessNotificationAdapterCreate } from "./emergencyAccessNotificationAdapterCreate.js"
import { emergencyAccessNotificationSend } from "./emergencyAccessNotificationSend.js"
import type { EmergencyAccessSchedulerOptions } from "./emergencyAccessSchedulerOptions.js"
import { emergencyAccessNotificationDateUpdate } from "./emergencyAccessNotificationDateUpdate.js"
import { identityUserFindByUuid } from "../identity/identityUserFindByUuid.js"

export async function emergencyAccessReminderRun(options: EmergencyAccessSchedulerOptions): Promise<Result<number>> {
  const op = "emergencyAccessReminderRun"
  if (!options.config.EMERGENCY_ACCESS_ALLOWED) return resultCreate(0)
  const accessesResult = emergencyAccessFindAllRecoveriesInitiated(options.database)
  if (!accessesResult.success) return accessesResult
  const notification = options.notification ?? emergencyAccessNotificationAdapterCreate()
  const now = options.clock.now()
  let reminded = 0
  for (const access of accessesResult.data) {
    if (access.recoveryInitiatedAt === null) continue
    const finalRecoveryReminderAt =
      new Date(access.recoveryInitiatedAt).getTime() + (access.waitTimeDays - 1) * 86_400_000
    const nextReminderAt =
      access.lastNotificationAt === null ? now.getTime() : new Date(access.lastNotificationAt).getTime() + 86_400_000
    if (finalRecoveryReminderAt > now.getTime() || nextReminderAt > now.getTime()) continue
    const saveResult = emergencyAccessNotificationDateUpdate(options.database, access, now.toISOString())
    if (!saveResult.success) return saveResult
    if (!saveResult.data) continue
    reminded += 1
    if (options.config.MAIL_ENABLED && access.granteeUuid !== null) {
      const grantorResult = identityUserFindByUuid(options.database, access.grantorUuid)
      if (!grantorResult.success) return grantorResult
      const granteeResult = identityUserFindByUuid(options.database, access.granteeUuid)
      if (!granteeResult.success) return granteeResult
      if (grantorResult.data === null || granteeResult.data === null)
        return resultErrorCreate(op, "Emergency access user lookup failed.")
      const mailResult = await emergencyAccessMailCall(() =>
        options.mail.sendEmergencyAccessRecoveryReminder?.(
          grantorResult.data?.email ?? "",
          granteeResult.data?.name ?? "",
          access.type === 0 ? "View" : "Takeover",
          "1",
        ),
      )
      if (!mailResult.success) return mailResult
    }
    await emergencyAccessNotificationSend(notification, {
      event: "reminder",
      emergencyAccessId: access.uuid,
      status: access.status,
      type: access.type,
      revisionDate: access.updatedAt,
      userIds: [access.grantorUuid],
    })
  }
  return resultCreate(reminded)
}

async function emergencyAccessMailCall(
  call: (() => Promise<Result<void>> | undefined) | undefined,
): Promise<Result<void>> {
  if (call === undefined) return resultCreate(undefined)
  try {
    const result = await call()
    return result ?? resultCreate(undefined)
  } catch {
    return resultErrorCreate("emergencyAccessReminderMail", "Emergency access mail failed.")
  }
}
