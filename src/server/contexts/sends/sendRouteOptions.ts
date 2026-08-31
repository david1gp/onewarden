import type { KeyInput } from "jose"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { PushRelayAdapter } from "../push/pushRelayAdapter.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { IdentityMailAdapter } from "../identity/identityMailAdapter.js"
import type { SendFileStorageAdapter } from "./sendFileStorageAdapter.js"
import type { SendNotificationAdapter } from "./sendNotificationAdapter.js"

export type SendRateLimiter = { check: (key: string) => Result<void> }

export type SendRouteOptions = {
  clock: Clock
  config?: Pick<IdentityConfig, "EMAIL_ATTEMPTS_LIMIT" | "EMAIL_EXPIRATION_TIME" | "EMAIL_TOKEN_SIZE">
  database: DatabaseConnection | undefined
  identifier: Identifier
  mail?: IdentityMailAdapter
  maxFileSizeBytes?: number
  notification?: SendNotificationAdapter
  privateKey: KeyInput | undefined
  publicKey: KeyInput | undefined
  publicOrigin: string | undefined
  push?: PushRelayAdapter
  quotaBytes?: number | null
  rateLimiter?: SendRateLimiter
  sendsAllowed?: boolean
  storage?: SendFileStorageAdapter
}
