import { afterEach, expect, test } from "bun:test"
import { decodeJwt, decodeProtectedHeader, SignJWT } from "jose"
import { identityAccessTokenClaimsCreate } from "../../../src/server/contexts/identity/identityAccessTokenClaimsCreate.js"
import { identityAccessTokenClaimsDecode } from "../../../src/server/contexts/identity/identityAccessTokenClaimsDecode.js"
import { identityAccessTokenRevocationCheck } from "../../../src/server/contexts/identity/identityAccessTokenRevocationCheck.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"
import { identityDeviceIsMobile } from "../../../src/server/contexts/identity/identityDeviceIsMobile.js"
import { identityDeviceRefreshTokensRotateByUser } from "../../../src/server/contexts/identity/identityDeviceRefreshTokensRotateByUser.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import { identityDeviceTypeName } from "../../../src/server/contexts/identity/identityDeviceTypeName.js"
import { identityDeviceTypeParse } from "../../../src/server/contexts/identity/identityDeviceTypeParse.js"
import { identityRefreshTokenClaimsCreate } from "../../../src/server/contexts/identity/identityRefreshTokenClaimsCreate.js"
import { identityRefreshTokenClaimsDecode } from "../../../src/server/contexts/identity/identityRefreshTokenClaimsDecode.js"
import { identityTokenBundleCreate } from "../../../src/server/contexts/identity/identityTokenBundleCreate.js"
import { identityTokenRequestParse } from "../../../src/server/contexts/identity/identityTokenRequestParse.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const databases: Array<Parameters<typeof databaseClose>[0]> = []

function userCreate(uuid = "user-uuid", securityStamp = "security-stamp"): IdentityUser {
  return {
    uuid,
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: "2026-08-27T00:00:00.000Z",
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: `${uuid}@example.com`,
    emailNew: null,
    emailNewToken: null,
    name: "Test User",
    passwordHash: Uint8Array.from([1, 2, 3]),
    salt: Uint8Array.from([4, 5, 6]),
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "wrapped-user-key",
    privateKey: "encrypted-private-key",
    publicKey: "public-key",
    securityStamp,
    stampException: null,
    equivalentDomains: "[]",
    excludedGlobals: "[]",
    clientKdfType: 0,
    clientKdfIter: 100_000,
    clientKdfMemory: null,
    clientKdfParallelism: null,
    apiKey: null,
    avatarColor: null,
    externalId: null,
  }
}

function deviceCreate(uuid: string, userUuid: string, type: number, refreshToken: string): IdentityDevice {
  return {
    uuid,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    userUuid,
    name: "Test Device",
    type,
    pushUuid: null,
    pushToken: null,
    refreshToken,
    twoFactorRemember: null,
  }
}

function databaseCreate() {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  databases.push(result.data)
  return result.data
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("identityDeviceTypeParse preserves numeric compatibility and mobile expiry classification", () => {
  expect(identityDeviceTypeParse("0")).toBe(0)
  expect(identityDeviceTypeParse("+1")).toBe(1)
  expect(identityDeviceTypeParse("-1")).toBe(-1)
  expect(identityDeviceTypeParse("iOS")).toBe(14)
  expect(identityDeviceTypeParse("2147483648")).toBe(14)
  expect(identityDeviceTypeParse(undefined)).toBe(14)
  expect(identityDeviceTypeName(1)).toBe("iOS")
  expect(identityDeviceTypeName(999)).toBe("Unknown Browser")
  expect(identityDeviceIsMobile(deviceCreate("mobile", "user-uuid", 0, "mobile-secret"))).toBe(true)
  expect(identityDeviceIsMobile(deviceCreate("desktop", "user-uuid", 7, "desktop-secret"))).toBe(false)
})

test("identityTokenRequestParse accepts upstream case-insensitive aliases", () => {
  const result = identityTokenRequestParse({
    GRANTTYPE: "password",
    CLIENTID: "web",
    PASSWORD: "password-hash",
    SCOPE: "api offline_access",
    USERNAME: "user@example.com",
    DEVICEIDENTIFIER: "device-uuid",
    DEVICENAME: "Browser",
    DEVICETYPE: "9",
    DEVICEPUSHTOKEN: "push-token",
    TWOFACTORPROVIDER: "1",
    TWOFACTORTOKEN: "123456",
    TWOFACTORREMEMBER: "true",
  })

  expect(result).toEqual({
    success: true,
    data: {
      grantType: "password",
      clientId: "web",
      password: "password-hash",
      scope: "api offline_access",
      username: "user@example.com",
      deviceIdentifier: "device-uuid",
      deviceName: "Browser",
      deviceType: "9",
      devicePushToken: "push-token",
      twoFactorProvider: "1",
      twoFactorToken: "123456",
      twoFactorRemember: "true",
      refreshToken: undefined,
      clientSecret: undefined,
      authRequest: undefined,
      code: undefined,
      codeVerifier: undefined,
      sendId: undefined,
      passwordHashB64: undefined,
    },
  })
})

test("identity token claims preserve exact names, casing, issuer, and validity windows", () => {
  const user = userCreate()
  const device = deviceCreate("device-uuid", user.uuid, 1, "refresh-secret")
  const config = identityConfigCreate({ MAIL_ENABLED: true })
  const now = 1_787_875_200

  expect(
    identityAccessTokenClaimsCreate(device, user, now, now + 7_200, "mobile", "https://vault.example", config),
  ).toEqual({
    nbf: now,
    exp: now + 7_200,
    iss: "https://vault.example|login",
    sub: "user-uuid",
    premium: true,
    name: "Test User",
    email: "user-uuid@example.com",
    email_verified: true,
    sstamp: "security-stamp",
    device: "device-uuid",
    devicetype: "iOS",
    client_id: "mobile",
    scope: ["api", "offline_access"],
    amr: ["Application"],
  })
  expect(
    identityAccessTokenClaimsCreate(device, user, now, now + 7_200, undefined, "https://vault.example", config)
      .client_id,
  ).toBe("undefined")
  expect(identityRefreshTokenClaimsCreate(device, now, "https://vault.example")).toEqual({
    nbf: now,
    exp: now + 90 * 24 * 60 * 60,
    iss: "https://vault.example|login",
    sub: "password",
    device_token: "refresh-secret",
    token: null,
  })
  expect(
    identityRefreshTokenClaimsCreate(
      deviceCreate("desktop", user.uuid, 7, "desktop-secret"),
      now,
      "https://vault.example",
    ).exp,
  ).toBe(now + 30 * 24 * 60 * 60)
})

test("identityTokenBundleCreate signs RS256 access and refresh tokens with fixed expiry", async () => {
  const user = userCreate()
  const device = deviceCreate("device-uuid", user.uuid, 7, "refresh-secret")
  const clock = clockTestCreate(1_787_875_200_000)
  const bundleResult = await identityTokenBundleCreate(
    user,
    device,
    "web",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    identityConfigCreate(),
  )

  expect(bundleResult.success).toBe(true)
  if (!bundleResult.success) return
  expect(bundleResult.data.expiresIn).toBe(7_200)
  expect(decodeProtectedHeader(bundleResult.data.accessToken)).toEqual({ typ: "JWT", alg: "RS256" })
  expect(decodeProtectedHeader(bundleResult.data.refreshToken)).toEqual({ typ: "JWT", alg: "RS256" })
  const decodedAccessClaims = decodeJwt(bundleResult.data.accessToken) as typeof bundleResult.data.accessClaims
  const decodedRefreshClaims = decodeJwt(bundleResult.data.refreshToken) as typeof bundleResult.data.refreshClaims
  expect(decodedAccessClaims).toEqual(bundleResult.data.accessClaims)
  expect(decodedRefreshClaims).toEqual(bundleResult.data.refreshClaims)

  const accessResult = await identityAccessTokenClaimsDecode(
    bundleResult.data.accessToken,
    keyPair.publicKey,
    "https://vault.example",
    clock,
  )
  const refreshResult = await identityRefreshTokenClaimsDecode(
    bundleResult.data.refreshToken,
    keyPair.publicKey,
    "https://vault.example",
    clock,
  )
  expect(accessResult).toEqual({ success: true, data: bundleResult.data.accessClaims })
  expect(refreshResult).toEqual({ success: true, data: bundleResult.data.refreshClaims })
})

test("identity token decoders reject bad signatures, issuers, expiry, and refresh auth methods", async () => {
  const user = userCreate()
  const device = deviceCreate("device-uuid", user.uuid, 7, "refresh-secret")
  const clock = clockTestCreate(1_787_875_200_000)
  const bundleResult = await identityTokenBundleCreate(
    user,
    device,
    "web",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    identityConfigCreate(),
  )
  expect(bundleResult.success).toBe(true)
  if (!bundleResult.success) return

  const invalidSignature = `${bundleResult.data.accessToken.slice(0, -1)}!`
  expect(
    (await identityAccessTokenClaimsDecode(invalidSignature, keyPair.publicKey, "https://vault.example", clock))
      .success,
  ).toBe(false)
  expect(
    (
      await identityAccessTokenClaimsDecode(
        bundleResult.data.accessToken,
        keyPair.publicKey,
        "https://other.example",
        clock,
      )
    ).success,
  ).toBe(false)
  expect(
    (
      await identityAccessTokenClaimsDecode(
        bundleResult.data.accessToken,
        keyPair.publicKey,
        "https://vault.example",
        clockTestCreate(1_787_875_200_000 + 7_231_000),
      )
    ).success,
  ).toBe(false)

  const invalidSubject = await new SignJWT({ ...bundleResult.data.refreshClaims, sub: "client_credentials" })
    .setProtectedHeader({ typ: "JWT", alg: "RS256" })
    .sign(keyPair.privateKey)
  expect(
    (await identityRefreshTokenClaimsDecode(invalidSubject, keyPair.publicKey, "https://vault.example", clock)).success,
  ).toBe(false)
})

test("identityAccessTokenRevocationCheck rejects deleted devices and changed security stamps", () => {
  const database = databaseCreate()
  const user = userCreate()
  const device = deviceCreate("device-uuid", user.uuid, 7, "refresh-secret")
  expect(identityUserSave(database, user).success).toBe(true)
  expect(identityDeviceSave(database, device, clockTestCreate("2026-08-28T00:00:00.000Z"), false).success).toBe(true)

  const claims = identityAccessTokenClaimsCreate(
    device,
    user,
    1_787_875_200,
    1_787_882_400,
    "web",
    "https://vault.example",
    identityConfigCreate(),
  )
  expect(identityAccessTokenRevocationCheck(database, claims)).toEqual({
    success: true,
    data: { userUuid: user.uuid, deviceUuid: device.uuid },
  })

  database.run("DELETE FROM devices WHERE uuid = ? AND user_uuid = ?", [device.uuid, user.uuid])
  expect(identityAccessTokenRevocationCheck(database, claims)).toMatchObject({
    success: false,
    errorMessage: "Access token has been revoked.",
  })

  expect(identityDeviceSave(database, device, clockTestCreate("2026-08-28T00:00:00.000Z"), false).success).toBe(true)
  database.run("UPDATE users SET security_stamp = ? WHERE uuid = ?", ["new-security-stamp", user.uuid])
  expect(identityAccessTokenRevocationCheck(database, claims)).toMatchObject({
    success: false,
    errorMessage: "Access token has been revoked.",
  })
})

test("identityDeviceRefreshTokensRotateByUser changes every matching persistent secret only", () => {
  const database = databaseCreate()
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const user = userCreate()
  const otherUser = userCreate("other-user", "other-security-stamp")
  const firstDevice = deviceCreate("device-one", user.uuid, 7, "first-secret")
  const secondDevice = deviceCreate("device-two", user.uuid, 1, "second-secret")
  const otherDevice = deviceCreate("device-other", otherUser.uuid, 7, "other-secret")
  for (const account of [user, otherUser]) expect(identityUserSave(database, account).success).toBe(true)
  for (const device of [firstDevice, secondDevice, otherDevice])
    expect(identityDeviceSave(database, device, clock, false).success).toBe(true)

  expect(identityDeviceRefreshTokensRotateByUser(database, user.uuid, clock).success).toBe(true)
  const rotated = database
    .query<{ uuid: string; refresh_token: string }, [string]>(
      "SELECT uuid, refresh_token FROM devices WHERE user_uuid = ? ORDER BY uuid",
    )
    .all(user.uuid)
  expect(rotated).toHaveLength(2)
  expect(rotated.map((device) => device.refresh_token)).not.toContain("first-secret")
  expect(rotated.map((device) => device.refresh_token)).not.toContain("second-secret")
  expect(database.query("SELECT refresh_token FROM devices WHERE uuid = ?").get(otherDevice.uuid)).toEqual({
    refresh_token: "other-secret",
  })
  expect(database.query("SELECT refresh_token FROM devices WHERE refresh_token = ?").get("first-secret")).toBeNull()
})
