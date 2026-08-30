import type { KeyInput } from "jose"
import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { EventAdapter } from "../events/eventAdapter.js"
import type { NotificationAdapter } from "../notifications/notificationAdapter.js"
import type { PushRelayAdapter } from "../push/pushRelayAdapter.js"
import type { TwoFactorAdapters } from "../twoFactor/twoFactorAdapters.js"
import type { IdentityClientIpConfiguration } from "./identityClientIpConfiguration.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import type { IdentityMailAdapter } from "./identityMailAdapter.js"
import type { IdentitySsoAdapter } from "./identitySsoAdapter.js"

export type IdentityRouteOptions = {
  clock: Clock
  clientIp?: IdentityClientIpConfiguration
  config: IdentityConfig
  database: DatabaseConnection | undefined
  anonymousAuthRequestResponseSend?: (userUuid: string, authRequestUuid: string) => void
  groupsEnabled?: boolean
  event?: EventAdapter
  identifier: Identifier
  mail: IdentityMailAdapter
  notification?: NotificationAdapter
  privateKey: KeyInput | undefined
  publicKey: KeyInput | undefined
  publicOrigin: string | undefined
  push?: PushRelayAdapter
  rateLimiter: { check: (key: string) => Result<void> }
  sso?: IdentitySsoAdapter
  twoFactor?: TwoFactorAdapters
}
