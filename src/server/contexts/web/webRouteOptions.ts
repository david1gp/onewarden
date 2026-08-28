import type { Clock } from "../../../shared/clock/clock.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { DatabaseConnection } from "../../database/database.js"

export type WebRouteOptions = {
  clock: Clock
  config: IdentityConfig
  database: DatabaseConnection | undefined
  publicOrigin: string | undefined
  staticFolder?: string
  version?: string
  webVaultEnabled?: boolean
  webVaultFolder?: string
}
