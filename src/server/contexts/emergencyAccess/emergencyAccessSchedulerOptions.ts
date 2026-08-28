import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { IdentityMailAdapter } from "../identity/identityMailAdapter.js"
import type { EmergencyAccessNotificationAdapter } from "./emergencyAccessNotificationAdapter.js"

export type EmergencyAccessSchedulerOptions = {
  clock: Clock
  config: IdentityConfig
  database: DatabaseConnection
  mail: IdentityMailAdapter
  notification?: EmergencyAccessNotificationAdapter
}
