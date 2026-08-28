import type { Clock } from "../../../shared/clock/clock.js"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { IdentityConfig } from "./identityConfigSchema.js"

type IdentityRateLimitState = {
  startedAt: number
  count: number
}

export function identityRateLimiter(config: IdentityConfig, clock: Clock): { check: (key: string) => Result<void> } {
  const states = new Map<string, IdentityRateLimitState>()
  return {
    check: (key) => {
      const now = clock.now().getTime()
      const state = states.get(key)
      if (state === undefined || now - state.startedAt >= config.UNAUTHENTICATED_RATELIMIT_SECONDS * 1_000) {
        states.set(key, { startedAt: now, count: 1 })
        return resultCreate(undefined)
      }
      if (state.count >= config.UNAUTHENTICATED_RATELIMIT_MAX_BURST) {
        return resultErrorCreate("identityRateLimiter", "Too many requests", {
          code: "platform.rate-limited",
          statusCode: 429,
        })
      }
      state.count += 1
      return resultCreate(undefined)
    },
  }
}
