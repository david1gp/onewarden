import * as v from "valibot"
import { webSsoPendingSetupTtlMs } from "./webSsoPendingSetupTtlMs.js"

/**
 * A pending SSO first-login master-password setup.
 *
 * Holds the freshly issued access/refresh token and the account identity returned by the token
 * endpoint while the user chooses a master password. It is deliberately tab-scoped, bound to the
 * already validated SSO transaction `state`, and TTL-bounded, so a stale or cross-tab value can
 * never be replayed into a vault session.
 */
export const webSsoPendingSetupSchema = v.pipe(
  v.strictObject({
    state: v.pipe(v.string(), v.minLength(43), v.maxLength(128), v.regex(/^[A-Za-z0-9_-]+$/u)),
    email: v.pipe(v.string(), v.trim(), v.toLowerCase(), v.minLength(1), v.maxLength(256)),
    userId: v.pipe(v.string(), v.minLength(1)),
    accessToken: v.pipe(v.string(), v.minLength(1)),
    refreshToken: v.pipe(v.string(), v.minLength(1)),
    tokenExpiresAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
    kdf: v.pipe(v.number(), v.integer()),
    kdfIterations: v.pipe(v.number(), v.integer(), v.minValue(1)),
    kdfMemory: v.nullable(v.pipe(v.number(), v.integer())),
    kdfParallelism: v.nullable(v.pipe(v.number(), v.integer())),
    createdAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
    expiresAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
  }),
  v.check(
    (pending) => pending.expiresAt - pending.createdAt === webSsoPendingSetupTtlMs,
    "SSO first-login setup lifetime is invalid.",
  ),
)

export type WebSsoPendingSetup = v.InferOutput<typeof webSsoPendingSetupSchema>
