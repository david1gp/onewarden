import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { ssoAuth, type SsoAuthInsert } from "../../database/schema/ssoAuth.js"
import type { IdentitySsoAuth } from "./identitySsoAuth.js"

export function identitySsoAuthSave(database: DatabaseConnection, auth: IdentitySsoAuth): Result<void> {
  const op = "identitySsoAuthSave"
  try {
    const values: SsoAuthInsert = {
      state: auth.state,
      clientChallenge: auth.clientChallenge,
      nonce: auth.nonce,
      redirectUri: auth.redirectUri,
      codeResponse: auth.codeResponse,
      codeResponseError: auth.codeResponseError === null ? null : JSON.stringify(auth.codeResponseError),
      authResponse: auth.authResponse === null ? null : JSON.stringify(auth.authResponse),
      createdAt: auth.createdAt,
      updatedAt: auth.updatedAt,
      bindingHash: auth.bindingHash,
      organizationUuid: auth.organizationUuid ?? null,
    }
    database.drizzle
      .insert(ssoAuth)
      .values(values)
      .onConflictDoUpdate({
        target: ssoAuth.state,
        set: {
          clientChallenge: values.clientChallenge,
          nonce: values.nonce,
          redirectUri: values.redirectUri,
          codeResponse: values.codeResponse,
          codeResponseError: values.codeResponseError,
          authResponse: values.authResponse,
          createdAt: values.createdAt,
          updatedAt: values.updatedAt,
          bindingHash: values.bindingHash,
          organizationUuid: values.organizationUuid,
        },
      })
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "SSO auth save failed.")
  }
}
