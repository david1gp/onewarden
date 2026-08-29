import type { KeyInput } from "jose"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { IdentityMailAdapter } from "../identity/identityMailAdapter.js"
import type { PushRelayAdapter } from "../push/pushRelayAdapter.js"
import type { AdminBackupAdapter } from "./adminBackupAdapter.js"
import type { AdminConfig } from "./adminConfigSchema.js"
import type { AdminConfigurationAdapter } from "./adminConfigurationAdapter.js"
import type { AdminDiagnosticsAdapter } from "./adminDiagnosticsAdapter.js"
import type { EventAdapter } from "../events/eventAdapter.js"

export type AdminRouteOptions = {
  clock: Clock
  config: AdminConfig
  database: DatabaseConnection | undefined
  databasePath?: string
  event?: EventAdapter
  identityConfig: IdentityConfig
  identifier: Identifier
  mail: IdentityMailAdapter
  privateKey: KeyInput | undefined
  publicKey: KeyInput | undefined
  publicOrigin?: string
  push?: PushRelayAdapter
  backup?: AdminBackupAdapter
  configuration?: AdminConfigurationAdapter
  diagnostics?: AdminDiagnosticsAdapter
  version?: string
  webVaultEnabled?: boolean
}
