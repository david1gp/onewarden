import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import type { IdentityUser } from "../identity/identityUser.js"

export function organizationMembershipPendingUserCreate(
  email: string,
  clock: Clock,
  config: IdentityConfig,
  identifier: Identifier,
): Result<IdentityUser> {
  const saltResult = secureRandomBytes(64)
  if (!saltResult.success) return saltResult
  const now = clock.now().toISOString()
  return resultCreate({
    uuid: identifier.uuid(),
    enabled: true,
    createdAt: now,
    updatedAt: now,
    verifiedAt: null,
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email,
    emailNew: null,
    emailNewToken: null,
    name: email,
    passwordHash: new Uint8Array(),
    salt: saltResult.data,
    passwordIterations: config.PASSWORD_ITERATIONS,
    passwordHint: null,
    akey: "",
    privateKey: null,
    publicKey: null,
    securityStamp: identifier.uuid(),
    stampException: null,
    equivalentDomains: "[]",
    excludedGlobals: "[]",
    clientKdfType: 0,
    clientKdfIter: 600_000,
    clientKdfMemory: null,
    clientKdfParallelism: null,
    apiKey: null,
    avatarColor: null,
    externalId: null,
  })
}
