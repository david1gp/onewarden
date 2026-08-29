import { type Result } from "#result"
import * as v from "valibot"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { IdentitySsoAuth } from "./identitySsoAuth.js"
import { identitySsoAuthenticatedUserSchema } from "./identitySsoAuthenticatedUserSchema.js"
import type { IdentitySsoAuthRow } from "./identitySsoAuthRow.js"
import { identitySsoCodeResponseErrorSchema } from "./identitySsoCodeResponseErrorSchema.js"

export function identitySsoAuthFromRow(row: IdentitySsoAuthRow): Result<IdentitySsoAuth> {
  const op = "identitySsoAuthFromRow"
  let codeResponseError: IdentitySsoAuth["codeResponseError"] = null
  let authResponse: IdentitySsoAuth["authResponse"] = null
  try {
    if (row.code_response_error !== null) {
      const parsed = v.safeParse(identitySsoCodeResponseErrorSchema, JSON.parse(row.code_response_error))
      if (!parsed.success) return resultErrorCreate(op, "SSO authorization error data is invalid.")
      codeResponseError = parsed.output
    }
    if (row.auth_response !== null) {
      const parsed = v.safeParse(identitySsoAuthenticatedUserSchema, JSON.parse(row.auth_response))
      if (!parsed.success) return resultErrorCreate(op, "SSO authentication data is invalid.")
      authResponse = parsed.output
    }
  } catch {
    return resultErrorCreate(op, "SSO authentication data is invalid.")
  }
  return resultCreate({
    state: row.state,
    clientChallenge: row.client_challenge,
    nonce: row.nonce,
    redirectUri: row.redirect_uri,
    codeResponse: row.code_response,
    codeResponseError,
    authResponse,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    bindingHash: row.binding_hash,
    ...(row.organization_uuid === undefined || row.organization_uuid === null
      ? {}
      : { organizationUuid: row.organization_uuid }),
  })
}
