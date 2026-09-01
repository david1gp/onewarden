import { type Result } from "#result"
import * as v from "valibot"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { IdentitySsoAuth } from "./identitySsoAuth.js"
import { identitySsoAuthenticatedUserSchema } from "./identitySsoAuthenticatedUserSchema.js"
import type { SsoAuthRow } from "../../database/schema/ssoAuth.js"
import { identitySsoCodeResponseErrorSchema } from "./identitySsoCodeResponseErrorSchema.js"

export function identitySsoAuthFromRow(row: SsoAuthRow): Result<IdentitySsoAuth> {
  const op = "identitySsoAuthFromRow"
  let codeResponseError: IdentitySsoAuth["codeResponseError"] = null
  let authResponse: IdentitySsoAuth["authResponse"] = null
  try {
    if (row.codeResponseError !== null) {
      const parsed = v.safeParse(identitySsoCodeResponseErrorSchema, JSON.parse(row.codeResponseError))
      if (!parsed.success) return resultErrorCreate(op, "SSO authorization error data is invalid.")
      codeResponseError = parsed.output
    }
    if (row.authResponse !== null) {
      const parsed = v.safeParse(identitySsoAuthenticatedUserSchema, JSON.parse(row.authResponse))
      if (!parsed.success) return resultErrorCreate(op, "SSO authentication data is invalid.")
      authResponse = parsed.output
    }
  } catch {
    return resultErrorCreate(op, "SSO authentication data is invalid.")
  }
  return resultCreate({
    state: row.state,
    clientChallenge: row.clientChallenge,
    nonce: row.nonce,
    redirectUri: row.redirectUri,
    codeResponse: row.codeResponse,
    codeResponseError,
    authResponse,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    bindingHash: row.bindingHash,
    ...(row.organizationUuid === undefined || row.organizationUuid === null
      ? {}
      : { organizationUuid: row.organizationUuid }),
  })
}
