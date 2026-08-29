import type { KeyInput } from "jose"
import type { Clock } from "../../../shared/clock/clock.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { IdentityMailAdapter } from "../identity/identityMailAdapter.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { NotificationAdapter } from "../notifications/notificationAdapter.js"

export type OrganizationPublicRouteOptions = {
  clock: Clock
  config: IdentityConfig
  database: DatabaseConnection | undefined
  groupsEnabled: boolean
  identifier: Identifier
  mail: IdentityMailAdapter
  notification?: NotificationAdapter
  privateKey: KeyInput | undefined
  publicKey: KeyInput | undefined
  publicOrigin: string | undefined
}
