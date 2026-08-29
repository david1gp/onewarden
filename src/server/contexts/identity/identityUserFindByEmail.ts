import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityUserRow } from "./identityUserRow.js"
import { identityUserFromRow } from "./identityUserFromRow.js"
import type { IdentityUser } from "./identityUser.js"

export function identityUserFindByEmail(database: DatabaseConnection, email: string): Result<IdentityUser | null> {
  const op = "identityUserFindByEmail"
  try {
    const row = database
      .query<IdentityUserRow, [string]>(
        `SELECT uuid, enabled, created_at, updated_at, verified_at, last_verifying_at,
          login_verify_count, email, email_new, email_new_token, name, password_hash,
          salt, password_iterations, password_hint, akey, private_key, public_key,
          security_stamp, stamp_exception, equivalent_domains, excluded_globals, totp_recover,
          client_kdf_type, client_kdf_iter, client_kdf_memory, client_kdf_parallelism,
          api_key, avatar_color, external_id
         FROM users WHERE email = ? LIMIT 1`,
      )
      .get(email.toLowerCase())
    return resultCreate(row === null ? null : identityUserFromRow(row))
  } catch {
    return resultErrorCreate(op, "User lookup failed.")
  }
}
