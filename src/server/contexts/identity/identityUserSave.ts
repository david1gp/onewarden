import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityUser } from "./identityUser.js"

export function identityUserSave(database: DatabaseConnection, user: IdentityUser): Result<void> {
  const op = "identityUserSave"
  try {
    database.run(
      `INSERT INTO users (
        uuid, enabled, created_at, updated_at, verified_at, last_verifying_at,
        login_verify_count, email, email_new, email_new_token, name, password_hash,
        salt, password_iterations, password_hint, akey, private_key, public_key,
        security_stamp, stamp_exception, equivalent_domains, excluded_globals, totp_recover,
        client_kdf_type, client_kdf_iter, client_kdf_memory, client_kdf_parallelism,
        api_key, avatar_color, external_id
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT(uuid) DO UPDATE SET
        enabled = excluded.enabled,
        updated_at = excluded.updated_at,
        verified_at = excluded.verified_at,
        last_verifying_at = excluded.last_verifying_at,
        login_verify_count = excluded.login_verify_count,
        email = excluded.email,
        email_new = excluded.email_new,
        email_new_token = excluded.email_new_token,
        name = excluded.name,
        password_hash = excluded.password_hash,
        salt = excluded.salt,
        password_iterations = excluded.password_iterations,
        password_hint = excluded.password_hint,
        akey = excluded.akey,
        private_key = excluded.private_key,
        public_key = excluded.public_key,
        security_stamp = excluded.security_stamp,
        stamp_exception = excluded.stamp_exception,
        equivalent_domains = excluded.equivalent_domains,
        excluded_globals = excluded.excluded_globals,
        totp_recover = excluded.totp_recover,
        client_kdf_type = excluded.client_kdf_type,
        client_kdf_iter = excluded.client_kdf_iter,
        client_kdf_memory = excluded.client_kdf_memory,
        client_kdf_parallelism = excluded.client_kdf_parallelism,
        api_key = excluded.api_key,
        avatar_color = excluded.avatar_color,
        external_id = excluded.external_id`,
      [
        user.uuid,
        user.enabled ? 1 : 0,
        user.createdAt,
        user.updatedAt,
        user.verifiedAt,
        user.lastVerifyingAt,
        user.loginVerifyCount,
        user.email,
        user.emailNew,
        user.emailNewToken,
        user.name,
        user.passwordHash,
        user.salt,
        user.passwordIterations,
        user.passwordHint,
        user.akey,
        user.privateKey,
        user.publicKey,
        user.securityStamp,
        user.stampException,
        user.equivalentDomains,
        user.excludedGlobals,
        user.totpRecover ?? null,
        user.clientKdfType,
        user.clientKdfIter,
        user.clientKdfMemory,
        user.clientKdfParallelism,
        user.apiKey,
        user.avatarColor,
        user.externalId,
      ],
    )
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "User save failed.")
  }
}
