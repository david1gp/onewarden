import type { IdentityUser } from "../../src/server/contexts/identity/identityUser.js"

export function identityTestUserCreate(
  uuid: string,
  options: { name: string; passwordIterations: number },
): IdentityUser {
  const date = "2026-08-28T00:00:00.000Z"

  return {
    uuid,
    enabled: true,
    createdAt: date,
    updatedAt: date,
    verifiedAt: date,
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: `${uuid}@example.com`,
    emailNew: null,
    emailNewToken: null,
    name: options.name,
    passwordHash: new Uint8Array([1]),
    salt: new Uint8Array([2]),
    passwordIterations: options.passwordIterations,
    passwordHint: null,
    akey: "akey",
    privateKey: null,
    publicKey: null,
    securityStamp: `${uuid}-stamp`,
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
  }
}
