import { afterEach, expect, test } from "bun:test"
import { decodeJwt, SignJWT } from "jose"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"
import { identitySsoTokenBundleCreate } from "../../../src/server/contexts/identity/identitySsoTokenBundleCreate.js"
import type { IdentitySsoAuthenticatedUser } from "../../../src/server/contexts/identity/identitySsoAuthenticatedUserSchema.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const now = 1_787_875_200
const databases: unknown[] = []

function userCreate(): IdentityUser {
  return {
    uuid: "sso-user",
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: "2026-08-28T00:00:00.000Z",
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "sso@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "SSO User",
    passwordHash: new Uint8Array(),
    salt: new Uint8Array(),
    passwordIterations: 600_000,
    passwordHint: null,
    akey: "",
    privateKey: null,
    publicKey: null,
    securityStamp: "stamp",
    stampException: null,
    equivalentDomains: "[]",
    excludedGlobals: "[]",
    clientKdfType: 0,
    clientKdfIter: 600_000,
    clientKdfMemory: null,
    clientKdfParallelism: null,
    apiKey: null,
    avatarColor: null,
    externalId: null,
  }
}

function deviceCreate(type: number): IdentityDevice {
  return {
    uuid: "sso-device",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    userUuid: "sso-user",
    name: "SSO device",
    type,
    pushUuid: null,
    pushToken: null,
    refreshToken: "local-device-refresh",
    twoFactorRemember: null,
  }
}

function authenticatedUser(
  accessToken: string,
  refreshToken: string | null,
  expiresIn: number | null,
): IdentitySsoAuthenticatedUser {
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn,
    identifier: "https://idp.example/subject",
    email: "sso@example.com",
    email_verified: true,
    user_name: "SSO User",
  }
}

afterEach(() => {
  databases.splice(0)
})

test("SSO token bundle preserves provider JWT validity windows and wrapper claims", async () => {
  const providerAccess = await new SignJWT({ nbf: now + 10 })
    .setProtectedHeader({ typ: "JWT", alg: "RS256" })
    .setIssuer("https://idp.example")
    .setIssuedAt(now + 10)
    .setExpirationTime(now + 3_600)
    .sign(keyPair.privateKey)
  const providerRefresh = await new SignJWT({ nbf: now + 20 })
    .setProtectedHeader({ typ: "JWT", alg: "RS256" })
    .setIssuer("https://idp.example")
    .setIssuedAt(now + 20)
    .setExpirationTime(now + 86_400)
    .sign(keyPair.privateKey)
  const result = await identitySsoTokenBundleCreate(
    userCreate(),
    deviceCreate(7),
    "web",
    authenticatedUser(providerAccess, providerRefresh, null),
    "https://vault.example",
    keyPair.privateKey,
    clockTestCreate(now * 1_000),
    identityConfigCreate({ SSO_AUTHORITY: "https://idp.example" }),
  )

  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.accessClaims).toMatchObject({
    nbf: now + 10,
    exp: now + 3_600,
    iss: "https://vault.example|login",
    sub: "sso-user",
    scope: ["api", "offline_access"],
  })
  expect(result.data.refreshClaims).toEqual({
    nbf: now + 20,
    exp: now + 86_400,
    iss: "https://vault.example|login",
    sub: "sso",
    device_token: "local-device-refresh",
    token: { Refresh: providerRefresh },
  })
  expect(decodeJwt(result.data.accessToken) as Record<string, unknown>).toEqual(result.data.accessClaims)
  expect(decodeJwt(result.data.refreshToken) as Record<string, unknown>).toEqual(result.data.refreshClaims)
})

test("SSO token bundle falls back to opaque provider expiry and preserves an access-token refresh wrapper", async () => {
  const result = await identitySsoTokenBundleCreate(
    userCreate(),
    deviceCreate(7),
    "cli",
    authenticatedUser("opaque-access", null, 3_600),
    "https://vault.example",
    keyPair.privateKey,
    clockTestCreate(now * 1_000),
    identityConfigCreate({ SSO_AUTHORITY: "https://idp.example" }),
  )

  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.accessClaims.exp).toBe(now + 3_600)
  expect(result.data.refreshClaims).toMatchObject({
    nbf: now,
    exp: now + 3_600,
    token: { Access: "opaque-access" },
    sub: "sso",
  })
  expect(result.data.expiresIn).toBe(3_600)
})

test("SSO auth-only-not-session issues local session windows and rejects an opaque token without expiry", async () => {
  const authOnly = await identitySsoTokenBundleCreate(
    userCreate(),
    deviceCreate(0),
    "mobile",
    authenticatedUser("opaque-access", null, 3_600),
    "https://vault.example",
    keyPair.privateKey,
    clockTestCreate(now * 1_000),
    identityConfigCreate({ SSO_AUTH_ONLY_NOT_SESSION: true, SSO_AUTHORITY: "https://idp.example" }),
  )
  expect(authOnly.success).toBe(true)
  if (authOnly.success) {
    expect(authOnly.data.accessClaims).toMatchObject({ nbf: now, exp: now + 7_200 })
    expect(authOnly.data.refreshClaims).toMatchObject({
      nbf: now,
      exp: now + 90 * 24 * 60 * 60,
      sub: "sso",
      token: null,
    })
  }

  const invalid = await identitySsoTokenBundleCreate(
    userCreate(),
    deviceCreate(7),
    "web",
    authenticatedUser("opaque-access", null, null),
    "https://vault.example",
    keyPair.privateKey,
    clockTestCreate(now * 1_000),
    identityConfigCreate({ SSO_AUTHORITY: "https://idp.example" }),
  )
  expect(invalid).toMatchObject({ success: false, errorMessage: "Non jwt access_token and empty expires_in" })
})
