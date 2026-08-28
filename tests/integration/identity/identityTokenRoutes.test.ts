import { afterEach, expect, test } from "bun:test"
import { SignJWT } from "jose"
import * as v from "valibot"
import { identityAccessTokenClaimsDecode } from "../../../src/server/contexts/identity/identityAccessTokenClaimsDecode.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { identityDeviceRefreshTokensRotateByUser } from "../../../src/server/contexts/identity/identityDeviceRefreshTokensRotateByUser.js"
import type { IdentityMailAdapter } from "../../../src/server/contexts/identity/identityMailAdapter.js"
import { identityPasswordTokenResponseSchema } from "../../../src/server/contexts/identity/identityPasswordTokenResponseSchema.js"
import { identityRefreshTokenClaimsDecode } from "../../../src/server/contexts/identity/identityRefreshTokenClaimsDecode.js"
import { identityRefreshTokenResponseSchema } from "../../../src/server/contexts/identity/identityRefreshTokenResponseSchema.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import type { Clock } from "../../../src/shared/clock/clock.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { passwordHashCreate } from "../../../src/shared/crypto/passwordHashCreate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import type { Result } from "#result"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const contexts: IdentityTestContext[] = []

type TestClock = Clock & { advance: (seconds: number) => void }

type IdentityTestContext = {
  app: ReturnType<typeof serverAppCreate>
  clock: TestClock
  database: DatabaseConnection
  user: IdentityUser
}

const mail: IdentityMailAdapter = {
  sendRegisterVerifyEmail: async () => resultCreate(undefined),
  sendWelcome: async () => resultCreate(undefined),
  sendWelcomeMustVerify: async () => resultCreate(undefined),
}

function mutableClockCreate(value: string): TestClock {
  let current = new Date(value).getTime()
  return {
    now: () => new Date(current),
    advance: (seconds) => {
      current += seconds * 1_000
    },
  }
}

async function userCreate(): Promise<IdentityUser> {
  const salt = Uint8Array.from({ length: 64 }, (_, index) => index + 1)
  const passwordHashResult = await passwordHashCreate("correct-client-password-hash", salt, 100_000)
  if (!passwordHashResult.success) throw new Error(passwordHashResult.errorMessage)
  return {
    uuid: "00000000-0000-4000-8000-000000000010",
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
    securityStamp: "00000000-0000-4000-8000-000000000011",
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

async function identityTestContext(options?: {
  config?: Parameters<typeof identityConfigCreate>[0]
  rateLimiter?: { check: (key: string) => Result<void> }
}): Promise<IdentityTestContext> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  const user = await userCreate()
  const saveResult = identityUserSave(database, user)
  if (!saveResult.success) throw new Error(saveResult.errorMessage)
  const clock = mutableClockCreate("2026-08-28T00:00:00.000Z")
  const app = serverAppCreate({
    clock,
    database,
    identity: {
      clock,
      config: identityConfigCreate({ PASSWORD_ITERATIONS: 100_000, ...options?.config }),
      database,
      identifier: { uuid: () => "00000000-0000-4000-8000-000000000099" },
      mail,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      rateLimiter: options?.rateLimiter ?? { check: () => resultCreate(undefined) },
    },
  })
  const context = { app, clock, database, user }
  contexts.push(context)
  return context
}

async function requestForm(
  app: ReturnType<typeof serverAppCreate>,
  values: Record<string, string>,
  headers?: Record<string, string>,
): Promise<Response> {
  return app.request("https://vault.example/identity/connect/token", {
    body: new URLSearchParams(values).toString(),
    headers: { "content-type": "application/x-www-form-urlencoded", ...headers },
    method: "POST",
  })
}

function passwordForm(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    grant_type: "password",
    client_id: "web",
    password: "correct-client-password-hash",
    scope: "api offline_access",
    username: " Alice@Example.com ",
    device_identifier: "desktop-device",
    device_name: "Alice Desktop",
    device_type: "6",
    ...overrides,
  }
}

function expectInvalidGrant(response: Response): Promise<void> {
  return response.json().then((body: unknown) => {
    expect(response.status).toBe(400)
    expect(response.headers.get("content-type")).toBe("application/json")
    expect(body).toEqual({ error: "invalid_grant" })
  })
}

afterEach(() => {
  for (const context of contexts.splice(0)) databaseClose(context.database)
})

test("password grant accepts form encoding and returns the complete signed Bitwarden response", async () => {
  const context = await identityTestContext()
  const response = await requestForm(context.app, passwordForm())

  expect(response.status).toBe(200)
  const body: unknown = await response.json()
  const responseResult = v.safeParse(identityPasswordTokenResponseSchema, body)
  expect(responseResult.success).toBe(true)
  if (!responseResult.success) return
  expect(responseResult.output).toMatchObject({
    expires_in: 7_200,
    token_type: "Bearer",
    PrivateKey: "encrypted-private-key",
    Kdf: 0,
    KdfIterations: 100_000,
    KdfMemory: null,
    KdfParallelism: null,
    ResetMasterPassword: false,
    ForcePasswordReset: false,
    MasterPasswordPolicy: { Object: "masterPasswordPolicy" },
    scope: "api offline_access",
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
    Key: "wrapped-user-key",
  })

  const accessResult = await identityAccessTokenClaimsDecode(
    responseResult.output.access_token,
    keyPair.publicKey,
    "https://vault.example",
    context.clock,
  )
  const refreshResult = await identityRefreshTokenClaimsDecode(
    responseResult.output.refresh_token,
    keyPair.publicKey,
    "https://vault.example",
    context.clock,
  )
  expect(accessResult.success).toBe(true)
  expect(refreshResult.success).toBe(true)
  if (!accessResult.success || !refreshResult.success) return
  expect(accessResult.data).toMatchObject({
    nbf: 1_787_875_200,
    exp: 1_787_882_400,
    iss: "https://vault.example|login",
    sub: context.user.uuid,
    premium: true,
    name: "Alice Example",
    email: "alice@example.com",
    email_verified: true,
    sstamp: context.user.securityStamp,
    device: "desktop-device",
    devicetype: "Windows",
    client_id: "web",
    scope: ["api", "offline_access"],
    amr: ["Application"],
  })
  expect(refreshResult.data).toMatchObject({
    nbf: 1_787_875_200,
    exp: 1_787_875_200 + 30 * 24 * 60 * 60,
    iss: "https://vault.example|login",
    sub: "password",
  })
  expect(typeof refreshResult.data.device_token).toBe("string")
  expect(
    context.database
      .query("SELECT uuid, user_uuid, name, atype, length(refresh_token) AS token_length FROM devices")
      .all(),
  ).toEqual([
    {
      uuid: "desktop-device",
      user_uuid: context.user.uuid,
      name: "Alice Desktop",
      atype: 6,
      token_length: 86,
    },
  ])
})

test("password grant rejects invalid credentials, disabled users, unsupported scope, and missing fields with compatible errors", async () => {
  const context = await identityTestContext()
  const invalidPassword = await requestForm(context.app, passwordForm({ password: "wrong-password" }))
  expect(invalidPassword.status).toBe(400)
  expect(await invalidPassword.json()).toMatchObject({ message: "Username or password is incorrect. Try again" })

  const unknownUsername = await requestForm(context.app, passwordForm({ username: "unknown@example.com" }))
  expect(unknownUsername.status).toBe(400)
  expect(await unknownUsername.json()).toMatchObject({ message: "Username or password is incorrect. Try again" })

  const unsupportedScope = await requestForm(context.app, passwordForm({ scope: "api" }))
  expect(unsupportedScope.status).toBe(400)
  expect(await unsupportedScope.json()).toMatchObject({ message: "Scope (api) not supported" })

  const missingDeviceType = await requestForm(context.app, passwordForm({ device_type: "" }))
  expect(missingDeviceType.status).toBe(200)

  for (const field of [
    "client_id",
    "password",
    "scope",
    "username",
    "device_identifier",
    "device_name",
    "device_type",
  ]) {
    const missingFieldForm = passwordForm()
    delete missingFieldForm[field]
    const missingField = await requestForm(context.app, missingFieldForm)
    expect(missingField.status).toBe(400)
    expect(await missingField.json()).toMatchObject({ message: `${field} cannot be blank` })
  }

  context.database.run("UPDATE users SET enabled = 0 WHERE uuid = ?", [context.user.uuid])
  const disabled = await requestForm(context.app, passwordForm())
  expect(disabled.status).toBe(400)
  expect(await disabled.json()).toMatchObject({ message: "This user has been disabled" })
})

test("password grant blocks unverified users and records the verification reminder", async () => {
  const context = await identityTestContext({ config: { MAIL_ENABLED: true, SIGNUPS_VERIFY: true } })
  context.database.run("UPDATE users SET verified_at = NULL WHERE uuid = ?", [context.user.uuid])

  const response = await requestForm(context.app, passwordForm())

  expect(response.status).toBe(400)
  expect(await response.json()).toMatchObject({ message: "Please verify your email before trying again" })
  expect(
    context.database
      .query("SELECT last_verifying_at, login_verify_count FROM users WHERE uuid = ?")
      .get(context.user.uuid),
  ).toEqual({ last_verifying_at: "2026-08-28T00:00:00.000Z", login_verify_count: 1 })
  expect(context.database.query("SELECT COUNT(*) AS count FROM devices").get()).toEqual({ count: 0 })
})

test("password grant applies the unauthenticated rate limit to the resolved client IP", async () => {
  const checkedKeys: string[] = []
  const context = await identityTestContext({
    rateLimiter: {
      check: (key) => {
        checkedKeys.push(key)
        return {
          success: false,
          op: "testRateLimiter",
          errorMessage: "Too many requests",
          code: "platform.rate-limited",
          statusCode: 429,
        }
      },
    },
  })

  const response = await requestForm(context.app, passwordForm(), {
    "x-forwarded-for": "198.51.100.10, 198.51.100.11",
    "x-real-ip": "192.0.2.10",
  })

  expect(response.status).toBe(429)
  expect(await response.json()).toMatchObject({ message: "Too many requests" })
  expect(checkedKeys).toEqual(["192.0.2.10"])
})

test("password login reuses device identity and keeps the persistent refresh secret while updating usage", async () => {
  const context = await identityTestContext()
  const first = await requestForm(context.app, passwordForm())
  expect(first.status).toBe(200)
  const firstBody = (await first.json()) as { refresh_token: string }
  const firstDevice = context.database
    .query<{ name: string; atype: number; refresh_token: string; updated_at: string }, [string]>(
      "SELECT name, atype, refresh_token, updated_at FROM devices WHERE uuid = ?",
    )
    .get("desktop-device")
  expect(firstDevice).toEqual({
    name: "Alice Desktop",
    atype: 6,
    refresh_token: expect.any(String),
    updated_at: "2026-08-28T00:00:00.000Z",
  })
  if (firstDevice === null) return

  context.clock.advance(1)
  const second = await requestForm(context.app, passwordForm({ device_name: "Renamed Desktop", device_type: "1" }))
  expect(second.status).toBe(200)
  const secondBody = (await second.json()) as { refresh_token: string }
  expect(secondBody.refresh_token).not.toBe(firstBody.refresh_token)
  expect(
    context.database
      .query("SELECT name, atype, refresh_token, updated_at FROM devices WHERE uuid = ?")
      .get("desktop-device"),
  ).toEqual({
    name: "Alice Desktop",
    atype: 6,
    refresh_token: firstDevice.refresh_token,
    updated_at: "2026-08-28T00:00:01.000Z",
  })

  const mobile = await requestForm(context.app, passwordForm({ device_identifier: "mobile-device", device_type: "1" }))
  expect(mobile.status).toBe(200)
  const mobileBodyResult = v.safeParse(identityPasswordTokenResponseSchema, await mobile.json())
  expect(mobileBodyResult.success).toBe(true)
  if (!mobileBodyResult.success) return
  const mobileClaims = await identityRefreshTokenClaimsDecode(
    mobileBodyResult.output.refresh_token,
    keyPair.publicKey,
    "https://vault.example",
    context.clock,
  )
  expect(mobileClaims.success).toBe(true)
  if (!mobileClaims.success) return
  expect(mobileClaims.data.exp - mobileClaims.data.nbf).toBe(90 * 24 * 60 * 60)
})

test("refresh grant verifies JWTs, issues a new signed JWT, and preserves the device secret for reuse", async () => {
  const context = await identityTestContext()
  const login = await requestForm(context.app, passwordForm())
  const loginBody = (await login.json()) as { refresh_token: string }
  const originalRefreshToken = loginBody.refresh_token
  const originalDeviceToken = context.database
    .query<{ refresh_token: string }, [string]>("SELECT refresh_token FROM devices WHERE uuid = ?")
    .get("desktop-device")?.refresh_token
  expect(originalDeviceToken).toBeDefined()

  context.clock.advance(1)
  const refresh = await requestForm(context.app, {
    grant_type: "refresh_token",
    refresh_token: originalRefreshToken,
    client_id: "cli",
  })
  expect(refresh.status).toBe(200)
  const refreshBody: unknown = await refresh.json()
  const refreshResponseResult = v.safeParse(identityRefreshTokenResponseSchema, refreshBody)
  expect(refreshResponseResult.success).toBe(true)
  if (!refreshResponseResult.success || originalDeviceToken === undefined) return
  expect(refreshResponseResult.output.expires_in).toBe(7_200)
  const refreshedClaims = await identityRefreshTokenClaimsDecode(
    refreshResponseResult.output.refresh_token,
    keyPair.publicKey,
    "https://vault.example",
    context.clock,
  )
  expect(refreshedClaims.success).toBe(true)
  if (!refreshedClaims.success) return
  expect(refreshedClaims.data).toMatchObject({
    nbf: 1_787_875_201,
    exp: 1_787_875_201 + 30 * 24 * 60 * 60,
    sub: "password",
    device_token: originalDeviceToken,
  })
  expect(refreshedClaims.data.device_token).toBe(originalDeviceToken)
  expect(refreshResponseResult.output.refresh_token).not.toBe(originalRefreshToken)

  const oldTokenReuse = await requestForm(context.app, {
    grant_type: "refresh_token",
    refresh_token: originalRefreshToken,
  })
  expect(oldTokenReuse.status).toBe(200)
  expect(context.database.query("SELECT refresh_token FROM devices WHERE uuid = ?").get("desktop-device")).toEqual({
    refresh_token: originalDeviceToken,
  })

  expect(identityDeviceRefreshTokensRotateByUser(context.database, context.user.uuid, context.clock).success).toBe(true)
  await expectInvalidGrant(
    await requestForm(context.app, { grant_type: "refresh_token", refresh_token: originalRefreshToken }),
  )
})

test("refresh grant returns the exact invalid_grant contract for missing, expired, forged, and wrong-issuer tokens", async () => {
  const context = await identityTestContext()
  await expectInvalidGrant(await requestForm(context.app, { grant_type: "refresh_token" }))
  await expectInvalidGrant(await requestForm(context.app, { grant_type: "refresh_token", refresh_token: "not-a-jwt" }))

  const now = 1_787_875_200
  const expired = await new SignJWT({
    nbf: now - 100,
    exp: now - 31,
    iss: "https://vault.example|login",
    sub: "password",
    device_token: "missing-device",
    token: null,
  })
    .setProtectedHeader({ typ: "JWT", alg: "RS256" })
    .sign(keyPair.privateKey)
  await expectInvalidGrant(await requestForm(context.app, { grant_type: "refresh_token", refresh_token: expired }))

  const wrongSubject = await new SignJWT({
    nbf: now,
    exp: now + 100,
    iss: "https://vault.example|login",
    sub: "client_credentials",
    device_token: "missing-device",
    token: null,
  })
    .setProtectedHeader({ typ: "JWT", alg: "RS256" })
    .sign(keyPair.privateKey)
  await expectInvalidGrant(await requestForm(context.app, { grant_type: "refresh_token", refresh_token: wrongSubject }))

  const wrongIssuer = await new SignJWT({
    nbf: now,
    exp: now + 100,
    iss: "https://other.example|login",
    sub: "password",
    device_token: "missing-device",
    token: null,
  })
    .setProtectedHeader({ typ: "JWT", alg: "RS256" })
    .sign(keyPair.privateKey)
  await expectInvalidGrant(await requestForm(context.app, { grant_type: "refresh_token", refresh_token: wrongIssuer }))
})
