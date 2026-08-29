import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentitySsoAuth } from "./identitySsoAuth.js"

export function identitySsoAuthSave(database: DatabaseConnection, auth: IdentitySsoAuth): Result<void> {
  const op = "identitySsoAuthSave"
  try {
    database.run(
      `INSERT INTO sso_auth (
         state, client_challenge, nonce, redirect_uri, code_response,
         code_response_error, auth_response, created_at, updated_at, binding_hash, organization_uuid
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(state) DO UPDATE SET
         client_challenge = excluded.client_challenge,
         nonce = excluded.nonce,
         redirect_uri = excluded.redirect_uri,
         code_response = excluded.code_response,
         code_response_error = excluded.code_response_error,
         auth_response = excluded.auth_response,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          binding_hash = excluded.binding_hash,
          organization_uuid = excluded.organization_uuid`,
      [
        auth.state,
        auth.clientChallenge,
        auth.nonce,
        auth.redirectUri,
        auth.codeResponse,
        auth.codeResponseError === null ? null : JSON.stringify(auth.codeResponseError),
        auth.authResponse === null ? null : JSON.stringify(auth.authResponse),
        auth.createdAt,
        auth.updatedAt,
        auth.bindingHash,
        auth.organizationUuid ?? null,
      ],
    )
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "SSO auth save failed.")
  }
}
