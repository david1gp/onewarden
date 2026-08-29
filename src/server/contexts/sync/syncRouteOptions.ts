import type { KeyInput } from "jose"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"

export type SyncRouteOptions = {
  clock: Clock
  config: IdentityConfig
  database: DatabaseConnection | undefined
  groupsEnabled: boolean
  publicKey: KeyInput | undefined
  publicOrigin: string | undefined
}
