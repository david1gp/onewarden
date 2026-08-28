import { afterEach, expect, test } from "bun:test"
import { identityOrganizationApiKeyFindByOrganizationUuid } from "../../../src/server/contexts/identity/identityOrganizationApiKeyFindByOrganizationUuid.js"
import { identityOrganizationApiKeySave } from "../../../src/server/contexts/identity/identityOrganizationApiKeySave.js"
import type { IdentitySsoAuth } from "../../../src/server/contexts/identity/identitySsoAuth.js"
import { identitySsoAuthFindByCode } from "../../../src/server/contexts/identity/identitySsoAuthFindByCode.js"
import { identitySsoAuthFindByState } from "../../../src/server/contexts/identity/identitySsoAuthFindByState.js"
import { identitySsoAuthSave } from "../../../src/server/contexts/identity/identitySsoAuthSave.js"
import { identitySsoUserSave } from "../../../src/server/contexts/identity/identitySsoUserSave.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"

const databases: DatabaseConnection[] = []

function databaseCreate(): DatabaseConnection {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  databases.push(result.data)
  return result.data
}

function authCreate(): IdentitySsoAuth {
  return {
    state: "state-value",
    clientChallenge: "client-challenge",
    nonce: "provider-nonce",
    redirectUri: "https://vault.example/sso-connector.html",
    codeResponse: "provider-code",
    codeResponseError: { error: "access_denied", error_description: "Denied" },
    authResponse: {
      refresh_token: "provider-refresh",
      access_token: "provider-access",
      expires_in: 3_600,
      identifier: "https://idp.example/subject",
      email: "user@example.com",
      email_verified: true,
      user_name: "User",
    },
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:01.000Z",
    bindingHash: "binding-hash",
  }
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("SSO auth persistence round-trips JSON fields and enforces the ten-minute lookup window", () => {
  const database = databaseCreate()
  const auth = authCreate()
  expect(identitySsoAuthSave(database, auth)).toEqual({ success: true, data: undefined })
  expect(identitySsoAuthFindByState(database, auth.state, clockTestCreate("2026-08-28T00:05:00.000Z"))).toEqual({
    success: true,
    data: auth,
  })
  expect(identitySsoAuthFindByCode(database, "provider-code", clockTestCreate("2026-08-28T00:05:00.000Z"))).toEqual({
    success: true,
    data: auth,
  })
  expect(identitySsoAuthFindByState(database, auth.state, clockTestCreate("2026-08-28T00:10:01.000Z"))).toEqual({
    success: true,
    data: null,
  })
})

test("organization API keys upsert by composite identity and SSO users preserve uniqueness", () => {
  const database = databaseCreate()
  const first = {
    uuid: "same-api-key",
    organizationUuid: "organization-one",
    type: 0,
    apiKey: "secret-one",
    revisionDate: "2026-08-28T00:00:00.000Z",
  }
  const second = { ...first, organizationUuid: "organization-two", apiKey: "secret-two" }
  expect(identityOrganizationApiKeySave(database, first)).toMatchObject({ success: true })
  expect(identityOrganizationApiKeySave(database, second)).toMatchObject({ success: true })
  expect(identityOrganizationApiKeyFindByOrganizationUuid(database, first.organizationUuid)).toMatchObject({
    success: true,
    data: first,
  })
  expect(identitySsoUserSave(database, { userUuid: "missing-user", identifier: "missing" })).toMatchObject({
    success: false,
  })
})
