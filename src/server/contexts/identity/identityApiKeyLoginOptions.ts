import type { KeyInput } from "jose"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityConfig } from "./identityConfigSchema.js"

export type IdentityApiKeyLoginOptions = {
  clock: Clock
  config: IdentityConfig
  database: DatabaseConnection | undefined
  identifier: Identifier
  issuer: string
  privateKey: KeyInput | undefined
  rateLimiter: { check: (key: string) => Result<void> }
  clientIp: string
}
