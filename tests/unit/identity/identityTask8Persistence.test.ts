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
  expect(
    database.query("SELECT code_response_error, auth_response FROM sso_auth WHERE state = ?").get(auth.state),
  ).toEqual({
    code_response_error: JSON.stringify(auth.codeResponseError),
    auth_response: JSON.stringify(auth.authResponse),
  })
})

test("SSO persistence hides malformed serialized data and organization keys upsert by composite identity", () => {
  const database = databaseCreate()
  database.run(
    `INSERT INTO sso_auth (state, client_challenge, nonce, redirect_uri, code_response_error, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      "malformed",
      "challenge",
      "nonce",
      "https://vault.example",
      "not-json",
      "2026-08-28T00:00:00.000Z",
      "2026-08-28T00:00:00.000Z",
    ],
  )
  expect(identitySsoAuthFindByState(database, "malformed", clockTestCreate("2026-08-28T00:01:00.000Z"))).toMatchObject({
    success: false,
    errorMessage: "SSO auth lookup failed.",
  })

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
  expect(identityOrganizationApiKeyFindByOrganizationUuid(database, second.organizationUuid)).toMatchObject({
    success: true,
    data: second,
  })
})

test("SSO user persistence enforces the user foreign key and globally unique provider identifier", () => {
  const database = databaseCreate()
  for (const uuid of ["user-one", "user-two"]) {
    database.run(
      `INSERT INTO users (uuid, created_at, updated_at, email, name, password_hash, salt, password_iterations, akey, security_stamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid,
        "2026-08-28T00:00:00.000Z",
        "2026-08-28T00:00:00.000Z",
        `${uuid}@example.com`,
        uuid,
        new Uint8Array(),
        new Uint8Array(),
        600_000,
        "",
        `${uuid}-stamp`,
      ],
    )
  }
  expect(identitySsoUserSave(database, { userUuid: "missing-user", identifier: "missing" })).toMatchObject({
    success: false,
  })
  expect(identitySsoUserSave(database, { userUuid: "user-one", identifier: "provider-id" })).toMatchObject({
    success: true,
  })
  expect(identitySsoUserSave(database, { userUuid: "user-two", identifier: "provider-id" })).toMatchObject({
    success: false,
  })
  expect(database.query("SELECT user_uuid, identifier FROM sso_users").all()).toEqual([
    { user_uuid: "user-one", identifier: "provider-id" },
  ])
})
