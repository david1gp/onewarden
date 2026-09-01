import { afterEach, expect, test } from "bun:test"
import { decodeJwt } from "jose"
import type { IdentityConfig } from "../../../src/server/contexts/identity/identityConfigSchema.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import type { IdentitySsoAdapter } from "../../../src/server/contexts/identity/identitySsoAdapter.js"
import type { IdentitySsoAuthenticatedUser } from "../../../src/server/contexts/identity/identitySsoAuthenticatedUserSchema.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"

const organizationUuid = "00000000-0000-4000-8000-000000000401"
const domainUuid = "00000000-0000-4000-8000-000000000402"
const ssoClientChallenge = "liA-bX0YDRBLal31U89D-fQmsxvzXL23GkFR9ukhLrI"
const databases: DatabaseConnection[] = []

type SsoTestAdapter = IdentitySsoAdapter & {
  authorizeCalls: Array<Parameters<IdentitySsoAdapter["authorize"]>[0]>
  exchangeCalls: Array<Parameters<IdentitySsoAdapter["exchange"]>[0]>
}

function ssoAdapterCreate(): SsoTestAdapter {
  const authorizeCalls: Array<Parameters<IdentitySsoAdapter["authorize"]>[0]> = []
  const exchangeCalls: Array<Parameters<IdentitySsoAdapter["exchange"]>[0]> = []
  const authenticatedUser: IdentitySsoAuthenticatedUser = {
    access_token: "organization-access-token",
    refresh_token: null,
    expires_in: 3_600,
    identifier: "https://organization-idp.example/member",
    email: "member@example.com",
    email_verified: true,
    user_name: "Organization Member",
  }
  return {
    authorizeCalls,
    exchangeCalls,
    authorize: async (input) => {
      authorizeCalls.push(input)
      return resultCreate({ authorizationUrl: "https://organization-idp.example/authorize", nonce: "nonce" })
    },
    exchange: async (input) => {
      exchangeCalls.push(input)
      return resultCreate(authenticatedUser)
    },
  }
}

function databaseCreate(): DatabaseConnection {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  const database = result.data
  databases.push(database)
  database.run("INSERT INTO organizations (uuid, name, billing_email, identifier) VALUES (?, ?, ?, ?)", [
    organizationUuid,
    "Organization",
    "billing@example.com",
    "organization-sso",
  ])
  database.run(
    `INSERT INTO organization_domains (
       uuid, org_uuid, txt, domain_name, creation_date, next_run_date, verified_date
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      domainUuid,
      organizationUuid,
      "bw=verified",
      "example.com",
      "2026-08-28T00:00:00.000Z",
      "2026-08-29T00:00:00.000Z",
      "2026-08-28T00:00:00.000Z",
    ],
  )
  database.run(
    `INSERT INTO organization_sso_configs (org_uuid, enabled, data, creation_date, revision_date)
     VALUES (?, ?, ?, ?, ?)`,
    [
      organizationUuid,
      1,
      JSON.stringify({
        authority: "https://organization-idp.example",
        clientId: "organization-client",
        clientSecret: "organization-secret",
      }),
      "2026-08-28T00:00:00.000Z",
      "2026-08-28T00:00:00.000Z",
    ],
  )
  return database
}

function configCreate(): IdentityConfig {
  return identityConfigCreate({ SSO_ENABLED: true, SSO_AUTHORITY: "https://global-idp.example" })
}

function bindingTokenRead(response: Response): string {
  const cookie = response.headers.get("set-cookie")
  if (cookie === null) throw new Error("SSO binding cookie missing")
  const token = /^VW_SSO_BINDING=([^;]+)/u.exec(cookie)?.[1]
  if (token === undefined) throw new Error("SSO binding token missing")
  return token
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("organization SSO uses a verified domain's stored provider and binds the token session to its organization", async () => {
  const database = databaseCreate()
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const sso = ssoAdapterCreate()
  const app = serverAppCreate({
    clock,
    database,
    identifier: identifierTestCreate(["organization-user", "organization-stamp"]),
    identity: {
      clock,
      config: configCreate(),
      database,
      identifier: identifierTestCreate(["organization-user", "organization-stamp"]),
      publicOrigin: "https://vault.example",
      rateLimiter: { check: () => resultCreate(undefined) },
      sso,
    },
  })

  const authorize = await app.request(
    `https://vault.example/identity/connect/authorize?client_id=web&redirect_uri=ignored&state=organization-state&code_challenge=${ssoClientChallenge}&code_challenge_method=S256&domain_hint=Example.COM`,
  )
  expect(authorize.status).toBe(307)
  expect(sso.authorizeCalls[0]?.configuration).toMatchObject({
    SSO_AUTHORITY: "https://organization-idp.example",
    SSO_CLIENT_ID: "organization-client",
    SSO_CLIENT_SECRET: "organization-secret",
  })
  expect(database.query("SELECT organization_uuid FROM sso_auth").get()).toEqual({
    organization_uuid: organizationUuid,
  })

  const bindingCookie = authorize.headers.get("set-cookie")
  const callback = await app.request(
    `https://vault.example/identity/connect/oidc-signin?code=organization-code&state=${btoa("organization-state")}`,
    { headers: { cookie: bindingCookie ?? "" } },
  )
  expect(callback.status).toBe(307)

  const token = await app.request("https://vault.example/identity/connect/token", {
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: "web",
      code: "organization-code",
      code_verifier: "client-verifier",
      device_identifier: "organization-device",
      device_name: "Organization Device",
      device_type: "9",
      scope: "api offline_access",
    }).toString(),
    headers: { "content-type": "application/x-www-form-urlencoded", "x-real-ip": "192.0.2.41" },
    method: "POST",
  })
  expect(token.status).toBe(200)
  expect(sso.exchangeCalls[0]?.configuration).toMatchObject({
    SSO_AUTHORITY: "https://organization-idp.example",
    SSO_CLIENT_ID: "organization-client",
  })
  const body = (await token.json()) as { refresh_token: string }
  expect(decodeJwt(body.refresh_token).organization_uuid).toBe(organizationUuid)
  expect(database.query("SELECT email FROM users WHERE email = ?").get("member@example.com")).toEqual({
    email: "member@example.com",
  })
})

test("organization SSO rejects a verified-domain session when the provider returns another domain", async () => {
  const database = databaseCreate()
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const sso = ssoAdapterCreate()
  sso.exchange = async (input) => {
    sso.exchangeCalls.push(input)
    return resultCreate({
      access_token: "organization-access-token",
      refresh_token: null,
      expires_in: 3_600,
      identifier: "https://organization-idp.example/other-member",
      email: "member@other.example",
      email_verified: true,
      user_name: "Other Member",
    })
  }
  const app = serverAppCreate({
    clock,
    database,
    identity: {
      clock,
      config: configCreate(),
      database,
      identifier: identifierTestCreate(["other-user"]),
      publicOrigin: "https://vault.example",
      rateLimiter: { check: () => resultCreate(undefined) },
      sso,
    },
  })
  const authorize = await app.request(
    `https://vault.example/identity/connect/authorize?client_id=web&redirect_uri=ignored&state=other-state&code_challenge=${ssoClientChallenge}&code_challenge_method=S256&domain_hint=example.com`,
  )
  const bindingToken = bindingTokenRead(authorize)
  const callback = await app.request(
    `https://vault.example/identity/connect/oidc-signin?code=other-code&state=${btoa("other-state")}`,
    { headers: { cookie: `VW_SSO_BINDING=${bindingToken}` } },
  )
  expect(callback.status).toBe(307)
  const token = await app.request("https://vault.example/identity/connect/token", {
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: "web",
      code: "other-code",
      code_verifier: "client-verifier",
      device_identifier: "other-device",
      device_name: "Other Device",
      device_type: "9",
      scope: "api offline_access",
    }).toString(),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  })
  expect(token.status).toBe(400)
  expect((await token.json()).message).toBe("Email domain not allowed")
})
