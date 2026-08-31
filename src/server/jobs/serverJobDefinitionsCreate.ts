import type { Clock } from "../../shared/clock/clock.js"
import type { Logger } from "../../shared/logging/logger.js"
import type { ServerConfig } from "../config/serverConfigSchema.js"
import type { AttachmentFileStorageAdapter } from "../contexts/attachments/attachmentFileStorageAdapter.js"
import { cipherTrashPurge } from "../contexts/ciphers/cipherTrashPurge.js"
import { emergencyAccessReminderRun } from "../contexts/emergencyAccess/emergencyAccessReminderRun.js"
import { emergencyAccessTimeoutRun } from "../contexts/emergencyAccess/emergencyAccessTimeoutRun.js"
import { eventPurge } from "../contexts/events/eventPurge.js"
import { identityAuthRequestPurge } from "../contexts/identity/identityAuthRequestPurge.js"
import type { IdentityConfig } from "../contexts/identity/identityConfigSchema.js"
import type { IdentityMailAdapter } from "../contexts/identity/identityMailAdapter.js"
import { identitySsoAuthPurge } from "../contexts/identity/identitySsoAuthPurge.js"
import type { SendFileStorageAdapter } from "../contexts/sends/sendFileStorageAdapter.js"
import { sendPurge } from "../contexts/sends/sendPurge.js"
import { twoFactorIncompleteNotificationRun } from "../contexts/twoFactor/twoFactorIncompleteNotificationRun.js"
import type { DatabaseConnection } from "../database/database.js"
import type { ServerJob } from "./serverJob.js"

type ServerJobDefinitionsOptions = {
  clock: Clock
  database: DatabaseConnection
  attachmentStorage: AttachmentFileStorageAdapter
  identityConfig: IdentityConfig
  logger: Logger
  mail: IdentityMailAdapter
  sendStorage: SendFileStorageAdapter
  serverConfig: Pick<
    ServerConfig,
    | "JOB_AUTH_REQUEST_PURGE_INTERVAL"
    | "JOB_EMERGENCY_ACCESS_REMINDER_INTERVAL"
    | "JOB_EMERGENCY_ACCESS_TIMEOUT_INTERVAL"
    | "JOB_EVENT_PURGE_INTERVAL"
    | "JOB_INCOMPLETE_2FA_NOTIFICATION_INTERVAL"
    | "JOB_INCOMPLETE_SSO_PURGE_INTERVAL"
    | "JOB_SEND_PURGE_INTERVAL"
    | "JOB_TRASH_PURGE_INTERVAL"
  >
}

export function serverJobDefinitionsCreate(options: ServerJobDefinitionsOptions): ServerJob[] {
  const jobs: ServerJob[] = [
    {
      intervalMs: options.serverConfig.JOB_SEND_PURGE_INTERVAL * 1_000,
      name: "send-purge",
      run: async () => {
        const result = await sendPurge(options.database, options.clock, options.sendStorage)
        if (!result.success) options.logger.error("send.purge-failed", { errorMessage: result.errorMessage })
        return result
      },
    },
    {
      intervalMs: options.serverConfig.JOB_AUTH_REQUEST_PURGE_INTERVAL * 1_000,
      name: "auth-request-purge",
      run: () => {
        const result = identityAuthRequestPurge(options.database, options.clock)
        if (!result.success) options.logger.error("auth-request.purge-failed", { errorMessage: result.errorMessage })
        return result
      },
    },
  ]

  if (options.identityConfig.ORG_EVENTS_ENABLED && options.identityConfig.EVENTS_DAYS_RETAIN !== undefined) {
    jobs.push({
      intervalMs: options.serverConfig.JOB_EVENT_PURGE_INTERVAL * 1_000,
      name: "event-purge",
      run: () => {
        const result = eventPurge(options.database, options.clock, options.identityConfig.EVENTS_DAYS_RETAIN)
        if (!result.success) options.logger.error("event.purge-failed", { errorMessage: result.errorMessage })
        return result
      },
    })
  }

  jobs.push(
    {
      intervalMs: options.serverConfig.JOB_EMERGENCY_ACCESS_TIMEOUT_INTERVAL * 1_000,
      name: "emergency-access-timeout",
      run: async () => {
        const result = await emergencyAccessTimeoutRun({
          clock: options.clock,
          config: options.identityConfig,
          database: options.database,
          mail: options.mail,
        })
        if (!result.success)
          options.logger.error("emergency-access.timeout-failed", { errorMessage: result.errorMessage })
        return result
      },
    },
    {
      intervalMs: options.serverConfig.JOB_EMERGENCY_ACCESS_REMINDER_INTERVAL * 1_000,
      name: "emergency-access-reminder",
      run: async () => {
        const result = await emergencyAccessReminderRun({
          clock: options.clock,
          config: options.identityConfig,
          database: options.database,
          mail: options.mail,
        })
        if (!result.success)
          options.logger.error("emergency-access.reminder-failed", { errorMessage: result.errorMessage })
        return result
      },
    },
    {
      intervalMs: options.serverConfig.JOB_INCOMPLETE_2FA_NOTIFICATION_INTERVAL * 1_000,
      name: "two-factor-incomplete-notification",
      run: async () => {
        const result = await twoFactorIncompleteNotificationRun({
          clock: options.clock,
          config: options.identityConfig,
          database: options.database,
          mail: options.mail,
        })
        if (!result.success)
          options.logger.error("two-factor.incomplete-notification-failed", { errorMessage: result.errorMessage })
        return result
      },
    },
    {
      intervalMs: options.serverConfig.JOB_TRASH_PURGE_INTERVAL * 1_000,
      name: "trash-purge",
      run: async () => {
        const result = await cipherTrashPurge(options.database, options.clock, options.attachmentStorage)
        if (!result.success) options.logger.error("trash.purge-failed", { errorMessage: result.errorMessage })
        return result
      },
    },
    {
      intervalMs: options.serverConfig.JOB_INCOMPLETE_SSO_PURGE_INTERVAL * 1_000,
      name: "incomplete-sso-purge",
      run: () => {
        const result = identitySsoAuthPurge(options.database, options.clock)
        if (!result.success) options.logger.error("identity.sso-purge-failed", { errorMessage: result.errorMessage })
        return result
      },
    },
  )

  return jobs
}
