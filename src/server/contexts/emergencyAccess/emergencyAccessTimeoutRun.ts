import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { emergencyAccessFindAllRecoveriesInitiated } from "./emergencyAccessFindAllRecoveriesInitiated.js"
import { emergencyAccessNotificationAdapterCreate } from "./emergencyAccessNotificationAdapterCreate.js"
import { emergencyAccessNotificationSend } from "./emergencyAccessNotificationSend.js"
import type { EmergencyAccessSchedulerOptions } from "./emergencyAccessSchedulerOptions.js"
import { emergencyAccessStatusUpdate } from "./emergencyAccessStatusUpdate.js"
import { identityUserFindByUuid } from "../identity/identityUserFindByUuid.js"

export async function emergencyAccessTimeoutRun(options: EmergencyAccessSchedulerOptions): Promise<Result<number>> {
  const op = "emergencyAccessTimeoutRun"
  if (!options.config.EMERGENCY_ACCESS_ALLOWED) return resultCreate(0)
  const accessesResult = emergencyAccessFindAllRecoveriesInitiated(options.database)
  if (!accessesResult.success) return accessesResult
  const notification = options.notification ?? emergencyAccessNotificationAdapterCreate()
  const now = options.clock.now()
  let approved = 0
  for (const access of accessesResult.data) {
    if (access.recoveryInitiatedAt === null) continue
    const dueAt = new Date(access.recoveryInitiatedAt).getTime() + access.waitTimeDays * 86_400_000
    if (dueAt > now.getTime()) continue
    const saveResult = emergencyAccessStatusUpdate(options.database, access, 4, now.toISOString())
    if (!saveResult.success) return saveResult
    if (!saveResult.data) continue
    approved += 1
    if (options.config.MAIL_ENABLED && access.granteeUuid !== null) {
      const grantorResult = identityUserFindByUuid(options.database, access.grantorUuid)
      if (!grantorResult.success) return grantorResult
      const granteeResult = identityUserFindByUuid(options.database, access.granteeUuid)
      if (!granteeResult.success) return granteeResult
      if (grantorResult.data === null || granteeResult.data === null)
        return resultErrorCreate(op, "Emergency access user lookup failed.")
      const timeoutMailResult = await emergencyAccessMailCall(() =>
        options.mail.sendEmergencyAccessRecoveryTimedOut?.(
          grantorResult.data?.email ?? "",
          granteeResult.data?.name ?? "",
          access.type === 0 ? "View" : "Takeover",
        ),
      )
      if (!timeoutMailResult.success) return timeoutMailResult
      const approvedMailResult = await emergencyAccessMailCall(() =>
        options.mail.sendEmergencyAccessRecoveryApproved?.(
          granteeResult.data?.email ?? "",
          grantorResult.data?.name ?? "",
        ),
      )
      if (!approvedMailResult.success) return approvedMailResult
    }
    await emergencyAccessNotificationSend(notification, {
      event: "timedOut",
      emergencyAccessId: access.uuid,
      status: access.status,
      type: access.type,
      revisionDate: access.updatedAt,
      userIds: [access.grantorUuid, ...(access.granteeUuid === null ? [] : [access.granteeUuid])],
    })
  }
  return resultCreate(approved)
}

async function emergencyAccessMailCall(
  call: (() => Promise<Result<void>> | undefined) | undefined,
): Promise<Result<void>> {
  if (call === undefined) return resultCreate(undefined)
  try {
    const result = await call()
    return result ?? resultCreate(undefined)
  } catch {
    return resultErrorCreate("emergencyAccessTimeoutMail", "Emergency access mail failed.")
  }
}
