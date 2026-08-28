import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { identityUserFromRow } from "./identityUserFromRow.js"
import type { IdentityUser } from "./identityUser.js"
import type { IdentityUserRow } from "./identityUserRow.js"

export function identitySsoUserFindByIdentifier(
  database: DatabaseConnection,
  identifier: string,
): Result<{ user: IdentityUser; identifier: string } | null> {
  const op = "identitySsoUserFindByIdentifier"
  try {
    const row = database
      .query<IdentityUserRow & { sso_identifier: string }, [string]>(
        `SELECT u.uuid, u.enabled, u.created_at, u.updated_at, u.verified_at,
           u.last_verifying_at, u.login_verify_count, u.email, u.email_new,
           u.email_new_token, u.name, u.password_hash, u.salt, u.password_iterations,
           u.password_hint, u.akey, u.private_key, u.public_key, u.security_stamp,
           u.stamp_exception, u.equivalent_domains, u.excluded_globals,
           u.client_kdf_type, u.client_kdf_iter, u.client_kdf_memory,
           u.client_kdf_parallelism, u.api_key, u.avatar_color, u.external_id,
           s.identifier AS sso_identifier
         FROM users u INNER JOIN sso_users s ON s.user_uuid = u.uuid
         WHERE s.identifier = ? LIMIT 1`,
      )
      .get(identifier)
    return resultCreate(row === null ? null : { user: identityUserFromRow(row), identifier: row.sso_identifier })
  } catch {
    return resultErrorCreate(op, "SSO user lookup failed.")
  }
}
