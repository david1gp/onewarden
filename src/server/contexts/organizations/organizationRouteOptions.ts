import type { KeyInput } from "jose"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { NotificationAdapter } from "../notifications/notificationAdapter.js"

export type OrganizationRouteOptions = {
  clock: Clock
  config: IdentityConfig
  database: DatabaseConnection | undefined
  groupsEnabled: boolean
  identifier: Identifier
  notification?: NotificationAdapter
  privateKey: KeyInput | undefined
  publicKey: KeyInput | undefined
  publicOrigin: string | undefined
}
