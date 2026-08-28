import type { KeyInput } from "jose"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import type { IdentityMailAdapter } from "./identityMailAdapter.js"
import type { IdentitySsoAdapter } from "./identitySsoAdapter.js"
import type { PushRelayAdapter } from "../push/pushRelayAdapter.js"

export type IdentityRouteOptions = {
  clock: Clock
  config: IdentityConfig
  database: DatabaseConnection | undefined
  identifier: Identifier
  mail: IdentityMailAdapter
  privateKey: KeyInput | undefined
  publicKey: KeyInput | undefined
  publicOrigin: string | undefined
  push?: PushRelayAdapter
  rateLimiter: { check: (key: string) => Result<void> }
  sso?: IdentitySsoAdapter
}
