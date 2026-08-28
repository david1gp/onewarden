import { decodeJwt, SignJWT } from "jose"
import { expect, test } from "bun:test"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"
import type { IdentityRefreshTokenClaims } from "../../../src/server/contexts/identity/identityRefreshTokenClaimsSchema.js"
import { identitySsoTokenBundleCreate } from "../../../src/server/contexts/identity/identitySsoTokenBundleCreate.js"
import type { IdentitySsoAuthenticatedUser } from "../../../src/server/contexts/identity/identitySsoAuthenticatedUserSchema.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const now = 1_787_875_200

const user: IdentityUser = {
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
const device: IdentityDevice = {
  uuid: "sso-device",
  createdAt: "2026-08-28T00:00:00.000Z",
  updatedAt: "2026-08-28T00:00:00.000Z",
  userUuid: "sso-user",
  name: "SSO device",
  type: 7,
  pushUuid: null,
  pushToken: null,
  refreshToken: "local-device-refresh",
  twoFactorRemember: null,
}
const authenticatedUser: IdentitySsoAuthenticatedUser = {
  access_token: "opaque-access",
  refresh_token: null,
  expires_in: 3_600,
  identifier: "https://idp.example/subject",
  email: "sso@example.com",
  email_verified: true,
  user_name: "SSO User",
}

test("SSO token bundle preserves provider JWT windows and access-token refresh wrappers", async () => {
  const providerAccess = await new SignJWT({ nbf: now + 10 })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer("https://idp.example")
    .setIssuedAt(now + 10)
    .setExpirationTime(now + 3_600)
    .sign(keyPair.privateKey)
  const result = await identitySsoTokenBundleCreate(
    user,
    device,
    "web",
    { ...authenticatedUser, access_token: providerAccess },
    "https://vault.example",
    keyPair.privateKey,
    clockTestCreate(now * 1_000),
    identityConfigCreate({ SSO_AUTHORITY: "https://idp.example" }),
  )
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.accessClaims).toMatchObject({ nbf: now + 10, exp: now + 3_600 })
  expect(result.data.refreshClaims).toMatchObject({ sub: "sso", token: { Access: providerAccess } })
  expect(decodeJwt<IdentityRefreshTokenClaims>(result.data.refreshToken)).toEqual(result.data.refreshClaims)
})
