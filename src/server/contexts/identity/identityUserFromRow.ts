import type { IdentityUser } from "./identityUser.js"
import type { UserRow } from "../../database/schema/users.js"

export function identityUserFromRow(row: UserRow): IdentityUser {
  return {
    uuid: row.uuid,
    enabled: row.enabled,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    verifiedAt: row.verifiedAt,
    lastVerifyingAt: row.lastVerifyingAt,
    loginVerifyCount: row.loginVerifyCount,
    email: row.email,
    emailNew: row.emailNew,
    emailNewToken: row.emailNewToken,
    name: row.name,
    passwordHash: new Uint8Array(row.passwordHash),
    salt: new Uint8Array(row.salt),
    passwordIterations: row.passwordIterations,
    passwordHint: row.passwordHint,
    akey: row.akey,
    privateKey: row.privateKey,
    publicKey: row.publicKey,
    ...(row.totpRecover === null ? {} : { totpRecover: row.totpRecover }),
    securityStamp: row.securityStamp,
    stampException: row.stampException,
    equivalentDomains: row.equivalentDomains,
    excludedGlobals: row.excludedGlobals,
    clientKdfType: row.clientKdfType,
    clientKdfIter: row.clientKdfIter,
    clientKdfMemory: row.clientKdfMemory,
    clientKdfParallelism: row.clientKdfParallelism,
    apiKey: row.apiKey,
    avatarColor: row.avatarColor,
    externalId: row.externalId,
  }
}
