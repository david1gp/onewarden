import { expect, test } from "bun:test"
import type { ServerConfig } from "../../../src/server/config/serverConfigSchema.js"
import type { AttachmentFileStorageAdapter } from "../../../src/server/contexts/attachments/attachmentFileStorageAdapter.js"
import type { IdentityConfig } from "../../../src/server/contexts/identity/identityConfigSchema.js"
import type { IdentityMailAdapter } from "../../../src/server/contexts/identity/identityMailAdapter.js"
import type { SendFileStorageAdapter } from "../../../src/server/contexts/sends/sendFileStorageAdapter.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { serverJobDefinitionsCreate } from "../../../src/server/jobs/serverJobDefinitionsCreate.js"
import type { Clock } from "../../../src/shared/clock/clock.js"
import type { Logger } from "../../../src/shared/logging/logger.js"

const serverConfig = {
  JOB_AUTH_REQUEST_PURGE_INTERVAL: 2,
  JOB_EMERGENCY_ACCESS_REMINDER_INTERVAL: 3,
  JOB_EMERGENCY_ACCESS_TIMEOUT_INTERVAL: 4,
  JOB_EVENT_PURGE_INTERVAL: 5,
  JOB_INCOMPLETE_2FA_NOTIFICATION_INTERVAL: 6,
  JOB_INCOMPLETE_SSO_PURGE_INTERVAL: 7,
  JOB_SEND_PURGE_INTERVAL: 1,
  JOB_TRASH_PURGE_INTERVAL: 8,
} satisfies Pick<
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

const identityConfig = {
  EVENTS_DAYS_RETAIN: 30,
  ORG_EVENTS_ENABLED: true,
} as IdentityConfig

function serverJobDefinitionsCreateOptions() {
  return {
    clock: { now: () => new Date() } as Clock,
    database: {} as DatabaseConnection,
    attachmentStorage: {} as AttachmentFileStorageAdapter,
    identityConfig,
    logger: {} as Logger,
    mail: {} as IdentityMailAdapter,
    sendStorage: {} as SendFileStorageAdapter,
    serverConfig,
  }
}

test("serverJobDefinitionsCreate registers current jobs with configured millisecond intervals", () => {
  const jobs = serverJobDefinitionsCreate(serverJobDefinitionsCreateOptions())

  expect(jobs.map(({ name, intervalMs }) => ({ name, intervalMs }))).toEqual([
    { name: "send-purge", intervalMs: 1_000 },
    { name: "auth-request-purge", intervalMs: 2_000 },
    { name: "event-purge", intervalMs: 5_000 },
    { name: "emergency-access-timeout", intervalMs: 4_000 },
    { name: "emergency-access-reminder", intervalMs: 3_000 },
    { name: "two-factor-incomplete-notification", intervalMs: 6_000 },
    { name: "trash-purge", intervalMs: 8_000 },
    { name: "incomplete-sso-purge", intervalMs: 7_000 },
  ])
})

test("serverJobDefinitionsCreate does not register event purge when organization events are unavailable", () => {
  const jobs = serverJobDefinitionsCreate({
    ...serverJobDefinitionsCreateOptions(),
    identityConfig: { ...identityConfig, EVENTS_DAYS_RETAIN: undefined, ORG_EVENTS_ENABLED: false },
  })

  expect(jobs.map(({ name }) => name)).not.toContain("event-purge")
})
