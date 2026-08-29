import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentitySsoAuth } from "./identitySsoAuth.js"
import { identitySsoAuthFromRow } from "./identitySsoAuthFromRow.js"
import type { IdentitySsoAuthRow } from "./identitySsoAuthRow.js"

export function identitySsoAuthFindByCode(
  database: DatabaseConnection,
  code: string,
  clock: Clock,
): Result<IdentitySsoAuth | null> {
  const op = "identitySsoAuthFindByCode"
  try {
    const oldest = new Date(clock.now().getTime() - 10 * 60 * 1_000).toISOString()
    const row = database
      .query<IdentitySsoAuthRow, [string, string]>(
        `SELECT state, client_challenge, nonce, redirect_uri, code_response,
           code_response_error, auth_response, created_at, updated_at, binding_hash, organization_uuid
         FROM sso_auth WHERE code_response = ? AND created_at >= ? LIMIT 1`,
      )
      .get(code, oldest)
    if (row === null) return resultCreate(null)
    const authResult = identitySsoAuthFromRow(row)
    if (!authResult.success) return resultErrorCreate(op, "SSO auth lookup failed.")
    return authResult
  } catch {
    return resultErrorCreate(op, "SSO auth lookup failed.")
  }
}
