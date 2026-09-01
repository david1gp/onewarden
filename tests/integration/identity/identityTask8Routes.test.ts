import { afterEach, expect, test } from "bun:test"
import { decodeJwt, SignJWT } from "jose"
import * as v from "valibot"
import type { Result } from "#result"
import { eventType } from "../../../src/server/contexts/events/eventType.js"
import { identityAccessTokenClaimsDecode } from "../../../src/server/contexts/identity/identityAccessTokenClaimsDecode.js"
import { identityApiKeyTokenResponseSchema } from "../../../src/server/contexts/identity/identityApiKeyTokenResponseSchema.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import { identityOrganizationApiKeyAccessTokenClaimsDecode } from "../../../src/server/contexts/identity/identityOrganizationApiKeyAccessTokenClaimsDecode.js"
import { identityOrganizationApiKeySave } from "../../../src/server/contexts/identity/identityOrganizationApiKeySave.js"
import { identityOrganizationApiKeyTokenResponseSchema } from "../../../src/server/contexts/identity/identityOrganizationApiKeyTokenResponseSchema.js"
import { identityPasswordTokenResponseSchema } from "../../../src/server/contexts/identity/identityPasswordTokenResponseSchema.js"
import { identityRefreshTokenClaimsDecode } from "../../../src/server/contexts/identity/identityRefreshTokenClaimsDecode.js"
import type { IdentitySsoAdapter } from "../../../src/server/contexts/identity/identitySsoAdapter.js"
import type { IdentitySsoAuthenticatedUser } from "../../../src/server/contexts/identity/identitySsoAuthenticatedUserSchema.js"
import { identitySsoAuthFindByState } from "../../../src/server/contexts/identity/identitySsoAuthFindByState.js"
import { identitySsoAuthSave } from "../../../src/server/contexts/identity/identitySsoAuthSave.js"
import { identitySsoPrevalidateClaimsSchema } from "../../../src/server/contexts/identity/identitySsoPrevalidateClaimsSchema.js"
import { identitySsoUserSave } from "../../../src/server/contexts/identity/identitySsoUserSave.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import type { PushRelayAdapter } from "../../../src/server/contexts/push/pushRelayAdapter.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import type { Clock } from "../../../src/shared/clock/clock.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { passwordHashCreate } from "../../../src/shared/crypto/passwordHashCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import { sha256Hex } from "../../../src/shared/crypto/sha256Hex.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const contexts: Array<{ database: DatabaseConnection }> = []
const ssoClientVerifier = "client-verifier"
const ssoClientChallenge = "liA-bX0YDRBLal31U89D-fQmsxvzXL23GkFR9ukhLrI"

type SsoTestAdapter = IdentitySsoAdapter & {
  authorizeCalls: Array<Parameters<IdentitySsoAdapter["authorize"]>[0]>
  exchangeCalls: Array<Parameters<IdentitySsoAdapter["exchange"]>[0]>
}

type IdentityTask8Context = {
  app: ReturnType<typeof serverAppCreate>
  clock: Clock
  database: DatabaseConnection
  user: IdentityUser
  sso: SsoTestAdapter
}

function ssoUserCreate(overrides: Partial<IdentitySsoAuthenticatedUser> = {}): IdentitySsoAuthenticatedUser {
  return {
    refresh_token: null,
    access_token: "opaque-access-token",
    expires_in: 3_600,
    identifier: "https://idp.example/subject-1",
    email: "sso@example.com",
    email_verified: true,
    user_name: "SSO User",
    ...overrides,
  }
}

function ssoAdapterCreate(authenticatedUser = ssoUserCreate()): SsoTestAdapter {
  const authorizeCalls: Array<Parameters<IdentitySsoAdapter["authorize"]>[0]> = []
  const exchangeCalls: Array<Parameters<IdentitySsoAdapter["exchange"]>[0]> = []
  return {
    authorizeCalls,
    exchangeCalls,
    authorize: async (input) => {
      authorizeCalls.push(input)
      return resultCreate({ authorizationUrl: "https://idp.example/authorize?from=test", nonce: "provider-nonce" })
    },
    exchange: async (input) => {
      exchangeCalls.push(input)
      return resultCreate(authenticatedUser)
    },
  }
}

async function userCreate(overrides: Partial<IdentityUser> = {}): Promise<IdentityUser> {
  const salt = Uint8Array.from({ length: 64 }, (_, index) => index + 1)
  const passwordHashResult = await passwordHashCreate("client-password", salt, 100_000)
  if (!passwordHashResult.success) throw new Error(passwordHashResult.errorMessage)
  return {
    uuid: "user-uuid",
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: "2026-08-27T00:00:00.000Z",
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "alice@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Alice Example",
    passwordHash: passwordHashResult.data,
    salt,
    passwordIterations: 100_000,
    passwordHint: "hint",
    akey: "wrapped-user-key",
    privateKey: "encrypted-private-key",
    publicKey: "public-key",
    securityStamp: "security-stamp",
    stampException: null,
    equivalentDomains: "[]",
    excludedGlobals: "[]",
    clientKdfType: 0,
    clientKdfIter: 100_000,
    clientKdfMemory: null,
    clientKdfParallelism: null,
    apiKey: "personal-secret",
    avatarColor: null,
    externalId: null,
    ...overrides,
  }
}

async function contextCreate(
  options: {
    config?: Parameters<typeof identityConfigCreate>[0]
    user?: Partial<IdentityUser>
    ssoUser?: IdentitySsoAuthenticatedUser
    rateLimiter?: { check: (key: string) => Result<void> }
    push?: PushRelayAdapter
  } = {},
): Promise<IdentityTask8Context> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  const user = await userCreate(options.user)
  const userSaveResult = identityUserSave(database, user)
  if (!userSaveResult.success) throw new Error(userSaveResult.errorMessage)
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const sso = ssoAdapterCreate(options.ssoUser)
  const app = serverAppCreate({
    clock,
    database,
    identity: {
      clock,
      config: identityConfigCreate({ PASSWORD_ITERATIONS: 100_000, ...options.config }),
      database,
      identifier: { uuid: () => "new-user-uuid" },
      mail: {
        sendRegisterVerifyEmail: async () => resultCreate(undefined),
        sendWelcome: async () => resultCreate(undefined),
        sendWelcomeMustVerify: async () => resultCreate(undefined),
      },
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example/",
      ...(options.push === undefined ? {} : { push: options.push }),
      rateLimiter: options.rateLimiter ?? { check: () => resultCreate(undefined) },
      sso,
    },
  })
  const context = { app, clock, database, user, sso }
  contexts.push({ database })
  return context
}

async function requestForm(
  app: ReturnType<typeof serverAppCreate>,
  values: Record<string, string>,
  headers: Record<string, string> = {},
): Promise<Response> {
  return app.request("https://vault.example/identity/connect/token", {
    body: new URLSearchParams(values).toString(),
    headers: { "content-type": "application/x-www-form-urlencoded", ...headers },
    method: "POST",
  })
}

function apiKeyForm(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    grant_type: "client_credentials",
    client_id: "user.user-uuid",
    client_secret: "personal-secret",
    scope: "api",
    device_identifier: "api-device",
    device_name: "API device",
    device_type: "9",
    ...overrides,
  }
}

function ssoTokenForm(code: string, overrides: Record<string, string> = {}): Record<string, string> {
  return {
    grant_type: "authorization_code",
    client_id: "web",
    code,
    code_verifier: ssoClientVerifier,
    device_identifier: "sso-device",
    device_name: "SSO device",
    device_type: "9",
    scope: "api offline_access",
    ...overrides,
  }
}

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>
}

async function expectApiError(response: Response, status: number, message: string): Promise<void> {
  expect(response.status).toBe(status)
  expect(response.headers.get("content-type")).toBe("application/json; charset=UTF-8")
  expect(await responseJson(response)).toMatchObject({
    message,
    error: "",
    error_description: "",
    object: "error",
  })
}

afterEach(() => {
  for (const context of contexts.splice(0)) databaseClose(context.database)
})

test("personal API-key grant returns the exact account contract, claims, and persisted device", async () => {
  const context = await contextCreate()
  const response = await requestForm(context.app, apiKeyForm())

  expect(response.status).toBe(200)
  expect(response.headers.get("content-type")).toBe("application/json")
  const body = await responseJson(response)
  expect(Object.keys(body).sort()).toEqual([
    "AccountKeys",
    "ForcePasswordReset",
    "Kdf",
    "KdfIterations",
    "KdfMemory",
    "KdfParallelism",
    "Key",
    "PrivateKey",
    "ResetMasterPassword",
    "UserDecryptionOptions",
    "access_token",
    "expires_in",
    "scope",
    "token_type",
  ])
  const parsed = v.safeParse(identityApiKeyTokenResponseSchema, body)
  expect(parsed.success).toBe(true)
  if (!parsed.success) return
  expect(parsed.output).toMatchObject({
    expires_in: 7_200,
    token_type: "Bearer",
    Key: "wrapped-user-key",
    PrivateKey: "encrypted-private-key",
    Kdf: 0,
    KdfIterations: 100_000,
    KdfMemory: null,
    KdfParallelism: null,
    ResetMasterPassword: false,
    ForcePasswordReset: false,
    scope: "api",
    AccountKeys: {
      publicKeyEncryptionKeyPair: {
        wrappedPrivateKey: "encrypted-private-key",
        publicKey: "public-key",
        Object: "publicKeyEncryptionKeyPair",
      },
      Object: "privateKeys",
    },
    UserDecryptionOptions: {
      HasMasterPassword: true,
      MasterPasswordUnlock: {
        Kdf: { KdfType: 0, Iterations: 100_000, Memory: null, Parallelism: null },
        MasterKeyEncryptedUserKey: "wrapped-user-key",
        MasterKeyWrappedUserKey: "wrapped-user-key",
        Salt: "alice@example.com",
      },
      Object: "userDecryptionOptions",
    },
  })

  const accessResult = await identityAccessTokenClaimsDecode(
    parsed.output.access_token,
    keyPair.publicKey,
    "https://vault.example",
    context.clock,
  )
  expect(accessResult).toMatchObject({
    success: true,
    data: {
      nbf: 1_787_875_200,
      exp: 1_787_882_400,
      iss: "https://vault.example|login",
      sub: "user-uuid",
      device: "api-device",
      devicetype: "Chrome",
      client_id: "user.user-uuid",
      scope: ["api"],
      amr: ["Application"],
    },
  })
  expect(
    context.database
      .query("SELECT uuid, user_uuid, name, atype, length(refresh_token) AS token_length FROM devices")
      .all(),
  ).toEqual([{ uuid: "api-device", user_uuid: "user-uuid", name: "API device", atype: 9, token_length: 86 }])
})

test("personal API-key grant emits a user login event when organization events are enabled", async () => {
  const context = await contextCreate({ config: { ORG_EVENTS_ENABLED: true } })
  const response = await requestForm(context.app, apiKeyForm())

  expect(response.status).toBe(200)
  expect(context.database.query("SELECT event_type, user_uuid, act_user_uuid FROM event").all()).toEqual([
    { act_user_uuid: context.user.uuid, event_type: eventType.userLoggedIn, user_uuid: context.user.uuid },
  ])
})

test("personal API-key grant omits empty account keys and preserves API-key aliases", async () => {
  const context = await contextCreate({
    user: { akey: "", privateKey: null, publicKey: null, passwordHash: new Uint8Array() },
  })
  const response = await requestForm(context.app, {
    GRANTTYPE: "client_credentials",
    CLIENTID: "user.user-uuid",
    CLIENTSECRET: "personal-secret",
    SCOPE: "api",
    DEVICEIDENTIFIER: "alias-device",
    DEVICENAME: "Alias device",
    DEVICETYPE: "iOS",
  })

  expect(response.status).toBe(200)
  const body = await responseJson(response)
  expect(body.Key).toBeUndefined()
  expect(body.AccountKeys).toBeNull()
  expect(body.UserDecryptionOptions).toMatchObject({ HasMasterPassword: false, MasterPasswordUnlock: null })
  expect(body).not.toHaveProperty("refresh_token")
})

test("personal and organization API-key grants preserve exact validation and rate-limit errors", async () => {
  const checkedKeys: string[] = []
  const context = await contextCreate({
    rateLimiter: {
      check: (key) => {
        checkedKeys.push(key)
        return resultCreate(undefined)
      },
    },
  })

  await expectApiError(
    await requestForm(context.app, apiKeyForm({ client_id: "application.user-uuid" })),
    400,
    "Malformed client_id",
  )
  await expectApiError(
    await requestForm(context.app, apiKeyForm({ client_id: "user.unknown" })),
    400,
    "Invalid client_id",
  )
  await expectApiError(
    await requestForm(context.app, apiKeyForm({ client_secret: "wrong-secret" })),
    400,
    "Incorrect client_secret",
  )
  context.database.run("UPDATE users SET enabled = 0 WHERE uuid = ?", [context.user.uuid])
  await expectApiError(await requestForm(context.app, apiKeyForm()), 400, "This user has been disabled (API key login)")
  expect(checkedKeys).toEqual(["unknown", "unknown", "unknown", "unknown"])

  const missing = apiKeyForm()
  delete missing.device_type
  await expectApiError(await requestForm(context.app, missing), 400, "device_type cannot be blank")
  await expectApiError(await requestForm(context.app, apiKeyForm({ scope: "unsupported" })), 400, "Scope not supported")
})

test("organization API-key grant persists on its composite key and emits exact claims", async () => {
  const context = await contextCreate()
  const saveResult = identityOrganizationApiKeySave(context.database, {
    uuid: "organization-api-key",
    organizationUuid: "organization-uuid",
    type: 0,
    apiKey: "organization-secret",
    revisionDate: "2026-08-28T00:00:00.000Z",
  })
  expect(saveResult).toEqual({ success: true, data: undefined })
  expect(
    identityOrganizationApiKeySave(context.database, {
      uuid: "organization-api-key",
      organizationUuid: "organization-uuid",
      type: 1,
      apiKey: "rotated-secret",
      revisionDate: "2026-08-28T00:00:01.000Z",
    }),
  ).toEqual({ success: true, data: undefined })
  expect(
    context.database.query("SELECT uuid, org_uuid, atype, api_key, revision_date FROM organization_api_key").all(),
  ).toEqual([
    {
      uuid: "organization-api-key",
      org_uuid: "organization-uuid",
      atype: 1,
      api_key: "rotated-secret",
      revision_date: "2026-08-28T00:00:01.000Z",
    },
  ])

  const response = await requestForm(context.app, {
    ...apiKeyForm(),
    client_id: "organization.organization-uuid",
    client_secret: "rotated-secret",
    scope: "api.organization",
  })
  expect(response.status).toBe(200)
  expect(response.headers.get("content-type")).toBe("application/json")
  const body = await responseJson(response)
  expect(body).toEqual({
    access_token: expect.any(String),
    expires_in: 3_600,
    token_type: "Bearer",
    scope: "api.organization",
  })
  const parsed = v.safeParse(identityOrganizationApiKeyTokenResponseSchema, body)
  expect(parsed.success).toBe(true)
  if (!parsed.success) return
  const claimsResult = await identityOrganizationApiKeyAccessTokenClaimsDecode(
    parsed.output.access_token,
    keyPair.publicKey,
    "https://vault.example",
    context.clock,
  )
  expect(claimsResult).toEqual({
    success: true,
    data: {
      nbf: 1_787_875_200,
      exp: 1_787_878_800,
      iss: "https://vault.example|api.organization",
      sub: "organization-api-key",
      client_id: "organization.organization-uuid",
      client_sub: "organization-uuid",
      scope: ["api.organization"],
    },
  })
})

test("authorization-code SSO grant completes authorize, bound callback, linking, claims, and cleanup", async () => {
  const context = await contextCreate({
    config: { SSO_ENABLED: true, SSO_AUTHORITY: "https://idp.example" },
    user: { email: "local@example.com" },
    ssoUser: ssoUserCreate({ email: "alice@example.com" }),
  })
  const authorize = await context.app.request(
    `https://vault.example/identity/connect/authorize?client_id=web&redirect_uri=ignored&response_type=code&scope=openid&state=state-value&code_challenge=${ssoClientChallenge}&code_challenge_method=S256&response_mode=query&domain_hint=example.com&ssoToken=prevalidate`,
  )
  expect(authorize.status).toBe(307)
  expect(authorize.headers.get("location")).toBe("https://idp.example/authorize?from=test")
  const bindingCookie = authorize.headers.get("set-cookie")
  expect(bindingCookie).toMatch(
    /^VW_SSO_BINDING=[A-Za-z0-9_-]+; Path=\/identity\/connect\/; Max-Age=600; SameSite=Lax; HttpOnly; Secure$/,
  )
  if (bindingCookie === null) return
  const bindingToken = /^VW_SSO_BINDING=([^;]+)/.exec(bindingCookie)?.[1]
  if (bindingToken === undefined) return
  expect(context.sso.authorizeCalls).toEqual([
    {
      clientId: "web",
      rawRedirectUri: "ignored",
      redirectUri: "https://vault.example/sso-connector.html",
      state: "state-value",
      clientChallenge: ssoClientChallenge,
    },
  ])
  expect(
    context.database.query("SELECT client_challenge, nonce, redirect_uri, binding_hash FROM sso_auth").get(),
  ).toMatchObject({
    client_challenge: ssoClientChallenge,
    nonce: "provider-nonce",
    redirect_uri: "https://vault.example/sso-connector.html",
  })
  const bindingHashResult = await sha256Hex(bindingToken)
  expect(bindingHashResult.success).toBe(true)
  if (bindingHashResult.success)
    expect(context.database.query("SELECT binding_hash FROM sso_auth").get()).toEqual({
      binding_hash: bindingHashResult.data,
    })

  const callbackState = btoa("state-value")
  const callback = await context.app.request(
    `https://vault.example/identity/connect/oidc-signin?code=provider-code&state=${callbackState}`,
    {
      headers: { cookie: bindingCookie },
    },
  )
  expect(callback.status).toBe(307)
  expect(callback.headers.get("location")).toBe(
    "https://vault.example/sso-connector.html?code=provider-code&state=state-value&scope=api+offline_access&iss=https%3A%2F%2Fvault.example",
  )
  expect(callback.headers.get("set-cookie")).toBe(
    "VW_SSO_BINDING=; Path=/identity/connect/; Max-Age=0; SameSite=Lax; HttpOnly; Secure",
  )
  expect(context.database.query("SELECT code_response, code_response_error FROM sso_auth").get()).toEqual({
    code_response: "provider-code",
    code_response_error: null,
  })

  const token = await requestForm(context.app, ssoTokenForm("provider-code"), { "x-real-ip": "192.0.2.40" })
  expect(token.status).toBe(200)
  expect(token.headers.get("content-type")).toBe("application/json")
  const body = await responseJson(token)
  const parsed = v.safeParse(identityPasswordTokenResponseSchema, body)
  expect(parsed.success).toBe(true)
  if (!parsed.success) return
  expect(parsed.output.scope).toBe("api offline_access")
  expect(parsed.output.Key).toBeUndefined()
  expect(context.sso.exchangeCalls).toHaveLength(1)
  expect(context.sso.exchangeCalls[0]).toMatchObject({ code: "provider-code", codeVerifier: "client-verifier" })
  expect(
    context.database.query("SELECT email, name, verified_at FROM users WHERE uuid = ?").get("new-user-uuid"),
  ).toEqual({
    email: "alice@example.com",
    name: "SSO User",
    verified_at: "2026-08-28T00:00:00.000Z",
  })
  expect(context.database.query("SELECT user_uuid, identifier FROM sso_users").all()).toEqual([
    { user_uuid: "new-user-uuid", identifier: "https://idp.example/subject-1" },
  ])
  expect(context.database.query("SELECT COUNT(*) AS count FROM sso_auth").get()).toEqual({ count: 0 })
  await expectApiError(
    await requestForm(context.app, ssoTokenForm("provider-code")),
    400,
    "Invalid code cannot retrieve sso auth",
  )

  const accessClaims = await identityAccessTokenClaimsDecode(
    parsed.output.access_token,
    keyPair.publicKey,
    "https://vault.example",
    context.clock,
  )
  expect(accessClaims).toMatchObject({
    success: true,
    data: {
      iss: "https://vault.example|login",
      sub: "new-user-uuid",
      email: "alice@example.com",
      email_verified: true,
      client_id: "web",
      scope: ["api", "offline_access"],
    },
  })
  const refreshClaims = await identityRefreshTokenClaimsDecode(
    parsed.output.refresh_token,
    keyPair.publicKey,
    "https://vault.example",
    context.clock,
  )
  expect(refreshClaims).toMatchObject({
    success: true,
    data: { sub: "sso", token: { Access: "opaque-access-token" } },
  })
})

test("disabled SSO authorize rejects before creating state or a binding cookie", async () => {
  const context = await contextCreate()
  const response = await context.app.request(
    "https://vault.example/identity/connect/authorize?client_id=web&redirect_uri=ignored&response_type=code&scope=openid&state=disabled-state&code_challenge=invalid&code_challenge_method=S256",
  )
  await expectApiError(response, 400, "SSO sign-in is not available")
  expect(response.headers.get("set-cookie")).toBeNull()
  expect(context.sso.authorizeCalls).toHaveLength(0)
  expect(context.database.query("SELECT COUNT(*) AS count FROM sso_auth").get()).toEqual({ count: 0 })
})

test("SSO callback error stores the provider error and authorization-code exchange returns its exact error", async () => {
  const context = await contextCreate({ config: { SSO_ENABLED: true } })
  const authorize = await context.app.request(
    `https://vault.example/identity/connect/authorize?clientid=web&redirecturi=ignored&responsetype=code&state=error-state&codechallenge=${ssoClientChallenge}&codechallengemethod=S256`,
  )
  const bindingCookie = authorize.headers.get("set-cookie")
  if (bindingCookie === null) return
  const callback = await context.app.request(
    `https://vault.example/identity/connect/oidc-signin?state=${btoa("error-state")}&error=access_denied&error_description=Denied`,
    { headers: { cookie: bindingCookie } },
  )
  expect(callback.status).toBe(307)
  expect(callback.headers.get("location")).toContain(`code=${encodeURIComponent(btoa("error-state"))}`)
  expect(context.database.query("SELECT code_response, code_response_error FROM sso_auth").get()).toEqual({
    code_response: btoa("error-state"),
    code_response_error: JSON.stringify({ error: "access_denied", error_description: "Denied" }),
  })
  await expectApiError(
    await requestForm(context.app, ssoTokenForm(btoa("error-state"))),
    400,
    "SSO authorization failed: access_denied, Denied",
  )
  expect(context.sso.exchangeCalls).toHaveLength(0)
  expect(context.database.query("SELECT COUNT(*) AS count FROM sso_auth").get()).toEqual({ count: 0 })
})

test("cached SSO responses still require the PKCE verifier before consuming the authorization", async () => {
  const context = await contextCreate({ config: { SSO_ENABLED: true } })
  expect(
    identitySsoAuthSave(context.database, {
      state: "cached-state",
      clientChallenge: ssoClientChallenge,
      nonce: "nonce",
      redirectUri: "https://vault.example/sso-connector.html",
      codeResponse: "cached-code",
      codeResponseError: null,
      authResponse: ssoUserCreate({ email: "  Cached@Example.COM  " }),
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
      bindingHash: null,
    }),
  ).toMatchObject({ success: true })

  await expectApiError(
    await requestForm(context.app, ssoTokenForm("cached-code", { code_verifier: "wrong-verifier" })),
    400,
    "PKCE client challenge failed",
  )
  expect(context.sso.exchangeCalls).toHaveLength(0)
  expect(context.database.query("SELECT COUNT(*) AS count FROM sso_auth").get()).toEqual({ count: 1 })
  const valid = await requestForm(context.app, ssoTokenForm("cached-code"))
  expect(valid.status).toBe(200)
  expect(context.database.query("SELECT email FROM users WHERE uuid = ?").get("new-user-uuid")).toEqual({
    email: "cached@example.com",
  })
  expect(context.database.query("SELECT COUNT(*) AS count FROM sso_auth").get()).toEqual({ count: 0 })
})

test("SSO provider exchange retries only while its failure is transient", async () => {
  const context = await contextCreate({ config: { SSO_ENABLED: true } })
  expect(
    identitySsoAuthSave(context.database, {
      state: "retry-state",
      clientChallenge: ssoClientChallenge,
      nonce: "nonce",
      redirectUri: "https://vault.example/sso-connector.html",
      codeResponse: "retry-code",
      codeResponseError: null,
      authResponse: null,
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
      bindingHash: null,
    }),
  ).toMatchObject({ success: true })
  let attempts = 0
  context.sso.exchange = async (input) => {
    context.sso.exchangeCalls.push(input)
    attempts += 1
    if (attempts === 1)
      return resultErrorCreate("testSsoExchange", "Provider unavailable", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    return resultCreate(ssoUserCreate({ email: "retry@example.com" }))
  }

  await expectApiError(await requestForm(context.app, ssoTokenForm("retry-code")), 503, "Provider unavailable")
  expect(context.database.query("SELECT COUNT(*) AS count FROM sso_auth").get()).toEqual({ count: 1 })
  const retry = await requestForm(context.app, ssoTokenForm("retry-code"))
  expect(retry.status).toBe(200)
  expect(attempts).toBe(2)
  expect(context.database.query("SELECT COUNT(*) AS count FROM sso_auth").get()).toEqual({ count: 0 })
})

test("SSO late push failure leaves the authorization retryable and successful replay is rejected", async () => {
  let failRegistration = true
  const push: PushRelayAdapter = {
    registerDevice: async () =>
      failRegistration
        ? resultErrorCreate("testPush", "Provider unavailable", { code: "platform.unavailable", statusCode: 503 })
        : resultCreate(undefined),
    unregisterDevice: async () => resultCreate(undefined),
    dispatch: async () => undefined,
  }
  const context = await contextCreate({
    config: { SSO_ENABLED: true },
    push,
    ssoUser: ssoUserCreate({ email: "alice@example.com", identifier: "existing-sso-id" }),
  })
  expect(
    identitySsoUserSave(context.database, { userUuid: context.user.uuid, identifier: "existing-sso-id" }),
  ).toMatchObject({ success: true })
  expect(
    identityDeviceSave(
      context.database,
      {
        uuid: "sso-device",
        createdAt: "2026-08-27T00:00:00.000Z",
        updatedAt: "2026-08-27T00:00:01.000Z",
        userUuid: context.user.uuid,
        name: "SSO device",
        type: 9,
        pushUuid: "push-uuid",
        pushToken: "push-token",
        refreshToken: "device-refresh-token",
        twoFactorRemember: null,
      },
      context.clock,
      false,
    ),
  ).toMatchObject({ success: true })
  expect(
    identitySsoAuthSave(context.database, {
      state: "late-failure-state",
      clientChallenge: ssoClientChallenge,
      nonce: "nonce",
      redirectUri: "https://vault.example/sso-connector.html",
      codeResponse: "late-failure-code",
      codeResponseError: null,
      authResponse: null,
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
      bindingHash: null,
    }),
  ).toMatchObject({ success: true })

  await expectApiError(await requestForm(context.app, ssoTokenForm("late-failure-code")), 503, "Provider unavailable")
  expect(context.database.query("SELECT COUNT(*) AS count FROM sso_auth").get()).toEqual({ count: 1 })
  expect(context.sso.exchangeCalls).toHaveLength(1)

  failRegistration = false
  const retry = await requestForm(context.app, ssoTokenForm("late-failure-code"))
  expect(retry.status).toBe(200)
  expect(context.sso.exchangeCalls).toHaveLength(1)
  expect(context.database.query("SELECT COUNT(*) AS count FROM sso_auth").get()).toEqual({ count: 0 })
  await expectApiError(
    await requestForm(context.app, ssoTokenForm("late-failure-code")),
    400,
    "Invalid code cannot retrieve sso auth",
  )
})

test("concurrent SSO exchanges serialize before atomically consuming one authorization", async () => {
  const context = await contextCreate({
    config: { SSO_ENABLED: true },
    ssoUser: ssoUserCreate({ email: "alice@example.com", identifier: "concurrent-sso-id" }),
  })
  let exchangeStartedResolve!: () => void
  let exchangeRelease!: () => void
  const exchangeStarted = new Promise<void>((resolve) => {
    exchangeStartedResolve = resolve
  })
  const exchangeGate = new Promise<void>((resolve) => {
    exchangeRelease = resolve
  })
  context.sso.exchange = async (input) => {
    context.sso.exchangeCalls.push(input)
    exchangeStartedResolve()
    await exchangeGate
    return resultCreate(ssoUserCreate({ email: "alice@example.com", identifier: "concurrent-sso-id" }))
  }
  expect(
    identitySsoUserSave(context.database, { userUuid: context.user.uuid, identifier: "concurrent-sso-id" }),
  ).toMatchObject({ success: true })
  expect(
    identitySsoAuthSave(context.database, {
      state: "concurrent-state",
      clientChallenge: ssoClientChallenge,
      nonce: "nonce",
      redirectUri: "https://vault.example/sso-connector.html",
      codeResponse: "concurrent-code",
      codeResponseError: null,
      authResponse: null,
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
      bindingHash: null,
    }),
  ).toMatchObject({ success: true })

  const first = requestForm(context.app, ssoTokenForm("concurrent-code"))
  await exchangeStarted
  const second = requestForm(context.app, ssoTokenForm("concurrent-code"))
  await Promise.resolve()
  exchangeRelease()
  const responses = await Promise.all([first, second])
  expect(responses.map((response) => response.status).sort()).toEqual([200, 400])
  expect(context.sso.exchangeCalls).toHaveLength(1)
  expect(context.database.query("SELECT COUNT(*) AS count FROM sso_auth").get()).toEqual({ count: 0 })
})

test("SSO canonicalizes provider email before lookup and creation", async () => {
  const context = await contextCreate({
    config: { SSO_ENABLED: true },
    user: { email: "local@example.com" },
    ssoUser: ssoUserCreate({ email: "  Alice@EXAMPLE.COM  " }),
  })
  expect(
    identitySsoAuthSave(context.database, {
      state: "canonical-email-state",
      clientChallenge: ssoClientChallenge,
      nonce: "nonce",
      redirectUri: "https://vault.example/sso-connector.html",
      codeResponse: "canonical-email-code",
      codeResponseError: null,
      authResponse: null,
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
      bindingHash: null,
    }),
  ).toMatchObject({ success: true })

  const response = await requestForm(context.app, ssoTokenForm("canonical-email-code"))
  expect(response.status).toBe(200)
  expect(context.database.query("SELECT email FROM users WHERE uuid = ?").get("new-user-uuid")).toEqual({
    email: "alice@example.com",
  })
})

test("SSO rejects empty and malformed provider email before lookup or creation", async () => {
  for (const [index, email] of ["   ", "malformed-email"].entries()) {
    const context = await contextCreate({ config: { SSO_ENABLED: true }, ssoUser: ssoUserCreate({ email }) })
    expect(
      identitySsoAuthSave(context.database, {
        state: `invalid-email-state-${index}`,
        clientChallenge: ssoClientChallenge,
        nonce: "nonce",
        redirectUri: "https://vault.example/sso-connector.html",
        codeResponse: `invalid-email-code-${index}`,
        codeResponseError: null,
        authResponse: null,
        createdAt: "2026-08-28T00:00:00.000Z",
        updatedAt: "2026-08-28T00:00:00.000Z",
        bindingHash: null,
      }),
    ).toMatchObject({ success: true })

    await expectApiError(
      await requestForm(context.app, ssoTokenForm(`invalid-email-code-${index}`)),
      400,
      "SSO provider returned an invalid email",
    )
    expect(context.database.query("SELECT COUNT(*) AS count FROM sso_auth").get()).toEqual({ count: 0 })
  }
})

test("SSO linking rejects duplicate email identities and disabled users without consuming the authorization", async () => {
  const duplicate = await contextCreate({ config: { SSO_ENABLED: true }, ssoUser: ssoUserCreate() })
  const duplicateUser = await userCreate({ uuid: "duplicate-user", email: "sso@example.com" })
  expect(identityUserSave(duplicate.database, duplicateUser)).toMatchObject({ success: true })
  expect(
    identitySsoUserSave(duplicate.database, { userUuid: duplicateUser.uuid, identifier: "existing-id" }),
  ).toMatchObject({ success: true })
  expect(
    identitySsoAuthSave(duplicate.database, {
      state: "duplicate-state",
      clientChallenge: ssoClientChallenge,
      nonce: "nonce",
      redirectUri: "https://vault.example/sso-connector.html",
      codeResponse: "code",
      codeResponseError: null,
      authResponse: null,
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
      bindingHash: null,
    }),
  ).toMatchObject({ success: true })
  await expectApiError(await requestForm(duplicate.app, ssoTokenForm("code")), 400, "Existing SSO user with same email")
  expect(duplicate.database.query("SELECT COUNT(*) AS count FROM sso_auth").get()).toEqual({ count: 1 })

  const disabled = await contextCreate({
    config: { SSO_ENABLED: true },
    user: { email: "sso@example.com", enabled: false },
    ssoUser: ssoUserCreate(),
  })
  expect(
    identitySsoUserSave(disabled.database, { userUuid: disabled.user.uuid, identifier: disabled.user.uuid }),
  ).toMatchObject({ success: true })
  expect(
    identitySsoAuthSave(disabled.database, {
      state: "disabled-state",
      clientChallenge: ssoClientChallenge,
      nonce: "nonce",
      redirectUri: "https://vault.example/sso-connector.html",
      codeResponse: "disabled-code",
      codeResponseError: null,
      authResponse: null,
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
      bindingHash: null,
    }),
  ).toMatchObject({ success: true })
  await expectApiError(
    await requestForm(disabled.app, ssoTokenForm("disabled-code")),
    400,
    "This user has been disabled",
  )
  expect(disabled.database.query("SELECT COUNT(*) AS count FROM sso_auth").get()).toEqual({ count: 1 })
  expect(identitySsoAuthFindByState(disabled.database, "disabled-state", disabled.clock).data).not.toBeNull()
})

test("SSO prevalidation is gated and signs the exact short-lived claims", async () => {
  const disabled = await contextCreate()
  await expectApiError(
    await disabled.app.request("https://vault.example/identity/sso/prevalidate"),
    400,
    "SSO sign-in is not available",
  )
  const enabled = await contextCreate({ config: { SSO_ENABLED: true } })
  const response = await enabled.app.request("https://vault.example/identity/sso/prevalidate")
  expect(response.status).toBe(200)
  expect(response.headers.get("content-type")).toBe("application/json")
  const body = await responseJson(response)
  const token = body.token
  expect(typeof token).toBe("string")
  if (typeof token !== "string") return
  const claims = decodeJwt(token)
  const parsed = v.safeParse(identitySsoPrevalidateClaimsSchema, claims)
  expect(parsed).toMatchObject({
    success: true,
    output: { nbf: 1_787_875_200, exp: 1_787_875_320, iss: "https://vault.example|sso", sub: "vaultwarden" },
  })
})

test("SSO refresh grants exchange provider refresh tokens and keep the SSO subject and wrapper", async () => {
  const context = await contextCreate({
    config: { SSO_ENABLED: true, SSO_AUTHORITY: "https://idp.example" },
    ssoUser: ssoUserCreate({ refresh_token: "provider-refresh" }),
  })
  expect(
    identitySsoAuthSave(context.database, {
      state: "refresh-state",
      clientChallenge: ssoClientChallenge,
      nonce: "nonce",
      redirectUri: "https://vault.example/sso-connector.html",
      codeResponse: "sso-code",
      codeResponseError: null,
      authResponse: null,
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
      bindingHash: null,
    }),
  ).toMatchObject({ success: true })
  context.sso.refresh = async (refreshToken) => {
    expect(refreshToken).toBe("provider-refresh")
    return resultCreate({
      access_token: "new-provider-access",
      refresh_token: "new-provider-refresh",
      expires_in: 1_800,
    })
  }
  const login = await requestForm(context.app, ssoTokenForm("sso-code"))
  expect(login.status).toBe(200)
  const loginBody = await responseJson(login)
  const refresh = await requestForm(context.app, {
    grant_type: "refresh_token",
    refresh_token: String(loginBody.refresh_token),
    client_id: "desktop",
  })
  expect(refresh.status).toBe(200)
  const refreshBody = await responseJson(refresh)
  expect(refreshBody).toMatchObject({ expires_in: 1_800, token_type: "Bearer", scope: "api offline_access" })
  const refreshClaims = await identityRefreshTokenClaimsDecode(
    String(refreshBody.refresh_token),
    keyPair.publicKey,
    "https://vault.example",
    context.clock,
  )
  expect(refreshClaims).toMatchObject({
    success: true,
    data: { sub: "sso", token: { Refresh: "new-provider-refresh" } },
  })
})

test("SSO access-token refresh ignores forged provider JWT timing claims", async () => {
  const now = 1_787_875_200
  const forgedProviderAccess = await new SignJWT({ nbf: now + 365 * 24 * 60 * 60 })
    .setProtectedHeader({ typ: "JWT", alg: "RS256" })
    .setIssuer("https://idp.example")
    .setIssuedAt(now + 365 * 24 * 60 * 60)
    .setExpirationTime(now + 365 * 24 * 60 * 60)
    .sign(keyPair.privateKey)
  const context = await contextCreate({
    config: { SSO_ENABLED: true, SSO_AUTHORITY: "https://idp.example" },
    ssoUser: ssoUserCreate({
      access_token: forgedProviderAccess,
      email: "alice@example.com",
      identifier: "access-token-sso-id",
    }),
  })
  expect(
    identitySsoUserSave(context.database, { userUuid: context.user.uuid, identifier: "access-token-sso-id" }),
  ).toMatchObject({ success: true })
  expect(
    identitySsoAuthSave(context.database, {
      state: "access-token-state",
      clientChallenge: ssoClientChallenge,
      nonce: "nonce",
      redirectUri: "https://vault.example/sso-connector.html",
      codeResponse: "access-token-code",
      codeResponseError: null,
      authResponse: null,
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
      bindingHash: null,
    }),
  ).toMatchObject({ success: true })

  const login = await requestForm(context.app, ssoTokenForm("access-token-code"))
  expect(login.status).toBe(200)
  const loginBody = await responseJson(login)
  const initialAccessClaims = await identityAccessTokenClaimsDecode(
    String(loginBody.access_token),
    keyPair.publicKey,
    "https://vault.example",
    context.clock,
  )
  expect(initialAccessClaims).toMatchObject({ success: true, data: { nbf: now, exp: now + 3_600 } })

  const localRefreshClaims = decodeJwt(String(loginBody.refresh_token))
  const deviceToken = localRefreshClaims.device_token
  expect(typeof deviceToken).toBe("string")
  if (typeof deviceToken !== "string") return
  const forgedLocalRefresh = await new SignJWT({
    device_token: deviceToken,
    sub: "sso",
    token: { Access: forgedProviderAccess },
  })
    .setProtectedHeader({ typ: "JWT", alg: "RS256" })
    .setIssuer("https://vault.example|login")
    .setNotBefore(now)
    .setIssuedAt(now)
    .setExpirationTime(now + 365 * 24 * 60 * 60)
    .sign(keyPair.privateKey)
  context.sso.validateAccessToken = async () => resultCreate(undefined)
  const refresh = await requestForm(context.app, {
    grant_type: "refresh_token",
    refresh_token: forgedLocalRefresh,
    client_id: "web",
  })
  expect(refresh.status).toBe(200)
  const refreshBody = await responseJson(refresh)
  const refreshedAccessClaims = await identityAccessTokenClaimsDecode(
    String(refreshBody.access_token),
    keyPair.publicKey,
    "https://vault.example",
    context.clock,
  )
  expect(refreshedAccessClaims).toMatchObject({ success: true, data: { nbf: now, exp: now + 3_600 } })
})

test("SSO auth-only-not-session refreshes as a local SSO session instead of a password grant", async () => {
  const context = await contextCreate({ config: { SSO_ENABLED: true, SSO_AUTH_ONLY_NOT_SESSION: true } })
  expect(
    identitySsoAuthSave(context.database, {
      state: "auth-only-state",
      clientChallenge: ssoClientChallenge,
      nonce: "nonce",
      redirectUri: "https://vault.example/sso-connector.html",
      codeResponse: "auth-only-code",
      codeResponseError: null,
      authResponse: null,
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
      bindingHash: null,
    }),
  ).toMatchObject({ success: true })
  const login = await requestForm(context.app, ssoTokenForm("auth-only-code"))
  expect(login.status).toBe(200)
  const loginBody = await responseJson(login)
  const refresh = await requestForm(context.app, {
    grant_type: "refresh_token",
    refresh_token: String(loginBody.refresh_token),
    client_id: "web",
  })
  expect(refresh.status).toBe(200)
  const refreshClaims = await identityRefreshTokenClaimsDecode(
    String((await responseJson(refresh)).refresh_token),
    keyPair.publicKey,
    "https://vault.example",
    context.clock,
  )
  expect(refreshClaims).toMatchObject({ success: true, data: { sub: "sso", token: null } })
})

test("password and refresh grants remain available after task-8 routes are registered", async () => {
  const context = await contextCreate()
  const password = await requestForm(context.app, {
    grant_type: "password",
    client_id: "web",
    password: "client-password",
    scope: "api offline_access",
    username: "ALICE@EXAMPLE.COM",
    device_identifier: "password-device",
    device_name: "Password device",
    device_type: "7",
  })
  expect(password.status).toBe(200)
  const passwordBody = await responseJson(password)
  expect(passwordBody.scope).toBe("api offline_access")
  const refresh = await requestForm(context.app, {
    grant_type: "refresh_token",
    refresh_token: String(passwordBody.refresh_token),
    client_id: "web",
  })
  expect(refresh.status).toBe(200)
  expect(await responseJson(refresh)).toMatchObject({ token_type: "Bearer", scope: "api offline_access" })
  const orgClaims = decodeJwt(
    String(
      (
        await responseJson(
          await requestForm(context.app, {
            ...apiKeyForm(),
            client_id: "user.user-uuid",
          }),
        )
      ).access_token,
    ),
  )
  expect(orgClaims.scope).toEqual(["api"])
})
