import type { IdentityUser } from "./identityUser.js"
import type { IdentityUserRow } from "./identityUserRow.js"

export function identityUserFromRow(row: IdentityUserRow): IdentityUser {
  return {
    uuid: row.uuid,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    verifiedAt: row.verified_at,
    lastVerifyingAt: row.last_verifying_at,
    loginVerifyCount: row.login_verify_count,
    email: row.email,
    emailNew: row.email_new,
    emailNewToken: row.email_new_token,
    name: row.name,
    passwordHash: new Uint8Array(row.password_hash),
    salt: new Uint8Array(row.salt),
    passwordIterations: row.password_iterations,
    passwordHint: row.password_hint,
    akey: row.akey,
    privateKey: row.private_key,
    publicKey: row.public_key,
    securityStamp: row.security_stamp,
    stampException: row.stamp_exception,
    equivalentDomains: row.equivalent_domains,
    excludedGlobals: row.excluded_globals,
    clientKdfType: row.client_kdf_type,
    clientKdfIter: row.client_kdf_iter,
    clientKdfMemory: row.client_kdf_memory,
    clientKdfParallelism: row.client_kdf_parallelism,
    apiKey: row.api_key,
    avatarColor: row.avatar_color,
    externalId: row.external_id,
  }
}
