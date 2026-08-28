import type { Clock } from "../../../shared/clock/clock.js"
import type { Logger } from "../../../shared/logging/logger.js"
import type { IconCacheAdapter } from "./iconCacheAdapter.js"
import type { IconConfig } from "./iconConfigSchema.js"
import type { IconHttpAdapter } from "./iconHttpAdapter.js"

export type IconRouteOptions = {
  cache: IconCacheAdapter
  clock: Clock
  config: IconConfig
  http: IconHttpAdapter
  logger?: Logger
}
