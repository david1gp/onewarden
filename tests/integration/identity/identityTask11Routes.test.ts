import { afterEach, expect, test } from "bun:test"
import { decodeJwt } from "jose"
import * as v from "valibot"
import { identityAccountChangeEmailDataSchema } from "../../../src/server/contexts/identity/identityAccountChangeEmailDataSchema.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { identityDeleteAccountTokenCreate } from "../../../src/server/contexts/identity/identityDeleteAccountTokenCreate.js"
import { identityMailAdapterCreate } from "../../../src/server/contexts/identity/identityMailAdapterCreate.js"
import type { IdentityMailMessage } from "../../../src/server/contexts/identity/identityMailMessage.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import type { Result } from "#result"
import { identityVerifyEmailTokenCreate } from "../../../src/server/contexts/identity/identityVerifyEmailTokenCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import type { Clock } from "../../../src/shared/clock/clock.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { passwordHashCreate } from "../../../src/shared/crypto/passwordHashCreate.js"
import { passwordHashVerify } from "../../../src/shared/crypto/passwordHashVerify.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"

type MutableClock = Clock & { advance: (seconds: number) => void }

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const databases: DatabaseConnection[] = []

function mutableClockCreate(value: string): MutableClock {
  let current = new Date(value).getTime()
  return {
    now: () => new Date(current),
    advance: (seconds) => {
      current += seconds * 1_000
    },
  }
}

async function userCreate(overrides: Partial<IdentityUser> = {}): Promise<IdentityUser> {
  const salt = Uint8Array.from({ length: 64 }, (_, index) => index + 1)
  const passwordResult = await passwordHashCreate("current-password", salt, 100_000)
  if (!passwordResult.success) throw new Error(passwordResult.errorMessage)
  return {
    uuid: "task11-user",
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: "2026-08-27T00:00:00.000Z",
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "task11@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Task 11 User",
    passwordHash: passwordResult.data,
    salt,
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "initial-akey",
    privateKey: null,
    publicKey: null,
    securityStamp: "initial-security-stamp",
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
    ...overrides,
  }
}

type ContextOptions = {
  config?: Parameters<typeof identityConfigCreate>[0]
  user?: Partial<IdentityUser>
  rateLimiter?: { check: (key: string) => Result<void> }
}

async function contextCreate(options: ContextOptions = {}) {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  const user = await userCreate(options.user)
  const saveResult = identityUserSave(database, user)
  if (!saveResult.success) throw new Error(saveResult.errorMessage)
  const clock = mutableClockCreate("2026-08-28T00:00:00.000Z")
  const mail = identityMailAdapterCreate(clock)
  let identifier = 0
  const app = serverAppCreate({
    clock,
    database,
    identity: {
      clock,
      config: identityConfigCreate({ PASSWORD_ITERATIONS: 100_000, ...options.config }),
      database,
      identifier: { uuid: () => `generated-${++identifier}` },
      mail,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      rateLimiter: options.rateLimiter ?? { check: () => resultCreate<void>(undefined) },
    },
  })
  return { app, clock, database, mail, user }
}

async function passwordTokenCreate(
  app: ReturnType<typeof serverAppCreate>,
  options: { password?: string; username?: string; deviceIdentifier?: string } = {},
): Promise<Response> {
  return app.request("https://vault.example/identity/connect/token", {
    body: new URLSearchParams({
      grant_type: "password",
      client_id: "web",
      password: options.password ?? "current-password",
      scope: "api offline_access",
      username: options.username ?? "task11@example.com",
      device_identifier: options.deviceIdentifier ?? "task11-device",
      device_name: "Task 11 device",
      device_type: "7",
    }).toString(),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  })
}

async function requestJson(
  app: ReturnType<typeof serverAppCreate>,
  path: string,
  method: string,
  body: unknown,
  token?: string,
): Promise<Response> {
  return app.request(`https://vault.example${path}`, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
    },
    method,
  })
}

async function expectError(
  response: Response,
  status: number,
  message: string,
  validationErrors: Record<string, string[]> = { "": [message] },
): Promise<void> {
  expect(response.status).toBe(status)
  expect(response.headers.get("content-type")).toBe("application/json; charset=UTF-8")
  expect(await response.json()).toEqual({
    message,
    validationErrors,
    errorModel: { message, object: "error" },
    error: "",
    error_description: "",
    exceptionMessage: null,
    exceptionStackTrace: null,
    innerExceptionMessage: null,
    object: "error",
  })
}

function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` }
}

function lastMessage(messages: IdentityMailMessage[]): IdentityMailMessage {
  const message = messages.at(-1)
  if (message === undefined) throw new Error("Expected a mail message")
  return message
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("email change preserves exact casing, numeric/string tokens, password replacement, and session invalidation", async () => {
  const context = await contextCreate({ config: { MAIL_ENABLED: true, SIGNUPS_DOMAINS_WHITELIST: "example.com" } })
  const login = await passwordTokenCreate(context.app)
  expect(login.status).toBe(200)
  const loginBody = (await login.json()) as { access_token: string }

  const requested = await requestJson(
    context.app,
    "/api/accounts/email-token",
    "POST",
    { masterPasswordHash: "current-password", newEmail: "New@Example.com" },
    loginBody.access_token,
  )
  expect(requested.status).toBe(200)
  expect(await requested.text()).toBe("")
  const requestMessage = lastMessage(context.mail.messages)
  expect(requestMessage).toMatchObject({
    kind: "changeEmail",
    recipient: "New@Example.com",
    targetEmail: "New@Example.com",
    userId: "task11-user",
  })
  expect(requestMessage.token).toMatch(/^\d{6}$/)
  expect(
    context.database.query("SELECT email_new, email_new_token FROM users WHERE uuid = ?").get("task11-user"),
  ).toEqual({
    email_new: "New@Example.com",
    email_new_token: requestMessage.token,
  })

  context.database.run("UPDATE users SET email_new_token = ? WHERE uuid = ?", ["123456", "task11-user"])
  const completed = await requestJson(
    context.app,
    "/api/accounts/email",
    "POST",
    {
      masterPasswordHash: "current-password",
      newEmail: "New@Example.com",
      key: "new-akey",
      newMasterPasswordHash: "new-password",
      token: 123456,
    },
    loginBody.access_token,
  )
  expect(completed.status).toBe(200)
  expect(await completed.text()).toBe("")
  expect(
    context.database
      .query("SELECT email, email_new, email_new_token, akey FROM users WHERE uuid = ?")
      .get("task11-user"),
  ).toEqual({
    email: "New@Example.com",
    email_new: null,
    email_new_token: null,
    akey: "new-akey",
  })
  const stored = context.database
    .query<{ password_hash: Uint8Array; salt: Uint8Array }, [string]>(
      "SELECT password_hash, salt FROM users WHERE uuid = ?",
    )
    .get("task11-user")
  expect(stored).not.toBeNull()
  if (stored === null) return
  expect(await passwordHashVerify("new-password", stored.salt, stored.password_hash, 100_000)).toEqual({
    success: true,
    data: true,
  })
  await expectError(
    await context.app.request("https://vault.example/api/accounts/profile", {
      headers: authHeaders(loginBody.access_token),
    }),
    401,
    "Invalid security stamp",
  )
})

test("email workflows enforce settings, domain, pending state, token mismatch, and exact casing", async () => {
  const disabled = await contextCreate({ config: { EMAIL_CHANGE_ALLOWED: false } })
  const disabledLogin = await passwordTokenCreate(disabled.app)
  const disabledBody = (await disabledLogin.json()) as { access_token: string }
  await expectError(
    await requestJson(
      disabled.app,
      "/api/accounts/email-token",
      "POST",
      { masterPasswordHash: "current-password", newEmail: "new@example.com" },
      disabledBody.access_token,
    ),
    400,
    "Email change is not allowed.",
  )

  const context = await contextCreate({ config: { SIGNUPS_DOMAINS_WHITELIST: "example.com" } })
  const login = await passwordTokenCreate(context.app)
  const body = (await login.json()) as { access_token: string }
  await expectError(
    await requestJson(
      context.app,
      "/api/accounts/email-token",
      "POST",
      { masterPasswordHash: "wrong", newEmail: "new@other.example" },
      body.access_token,
    ),
    400,
    "Invalid password",
  )
  await expectError(
    await requestJson(
      context.app,
      "/api/accounts/email-token",
      "POST",
      { masterPasswordHash: "current-password", newEmail: "new@other.example" },
      body.access_token,
    ),
    400,
    "Email domain not allowed",
  )
  await expectError(
    await requestJson(
      context.app,
      "/api/accounts/email",
      "POST",
      {
        masterPasswordHash: "current-password",
        newEmail: "new@example.com",
        key: "key",
        newMasterPasswordHash: "password",
        token: "1",
      },
      body.access_token,
    ),
    400,
    "No email change pending",
  )
})

test("verification resend and verify endpoints use lifecycle JWT claims and reset verification counters", async () => {
  const context = await contextCreate({
    config: { MAIL_ENABLED: true, SIGNUPS_VERIFY: true },
    user: { verifiedAt: null, lastVerifyingAt: null, loginVerifyCount: 0 },
  })
  const login = await passwordTokenCreate(context.app)
  await expectError(login, 400, "Please verify your email before trying again")
  const resendMessage = lastMessage(context.mail.messages)
  expect(resendMessage.kind).toBe("verifyEmail")
  expect(resendMessage.token).toMatch(/^eyJ/u)
  const resendClaims = decodeJwt(resendMessage.token ?? "")
  expect(resendClaims).toMatchObject({
    iss: "https://vault.example|verifyemail",
    sub: "task11-user",
    nbf: 1_787_875_200,
  })
  expect(resendClaims.exp).toBe(1_787_875_200 + 120 * 3_600)
  expect(
    context.database.query("SELECT last_verifying_at, login_verify_count FROM users WHERE uuid = ?").get("task11-user"),
  ).toEqual({
    last_verifying_at: "2026-08-28T00:00:00.000Z",
    login_verify_count: 1,
  })

  const verified = await requestJson(context.app, "/api/accounts/verify-email-token", "POST", {
    userId: "task11-user",
    token: ` ${resendMessage.token}\n`,
  })
  expect(verified.status).toBe(200)
  expect(await verified.text()).toBe("")
  expect(
    context.database
      .query("SELECT verified_at, last_verifying_at, login_verify_count FROM users WHERE uuid = ?")
      .get("task11-user"),
  ).toEqual({
    verified_at: "2026-08-28T00:00:00.000Z",
    last_verifying_at: null,
    login_verify_count: 0,
  })
})

test("authenticated verification mail, token verification, and malformed claims preserve statuses", async () => {
  const context = await contextCreate({ config: { MAIL_ENABLED: true }, user: { verifiedAt: null } })
  const login = await passwordTokenCreate(context.app)
  expect(login.status).toBe(200)
  const loginBody = (await login.json()) as { access_token: string }
  const send = await context.app.request("https://vault.example/api/accounts/verify-email", {
    headers: authHeaders(loginBody.access_token),
    method: "POST",
  })
  expect(send.status).toBe(200)
  expect(await send.text()).toBe("")
  const message = lastMessage(context.mail.messages)
  const claims = decodeJwt(message.token ?? "")
  expect(claims).toMatchObject({
    iss: "https://vault.example|verifyemail",
    sub: "task11-user",
    nbf: 1_787_875_200,
    exp: 1_787_875_200 + 120 * 3_600,
  })

  const verified = await requestJson(context.app, "/api/accounts/verify-email-token", "POST", {
    userId: "task11-user",
    token: ` ${message.token} `,
  })
  expect(verified.status).toBe(200)
  expect(await verified.text()).toBe("")
  expect(
    context.database
      .query("SELECT verified_at, last_verifying_at, login_verify_count FROM users WHERE uuid = ?")
      .get("task11-user"),
  ).toEqual({
    verified_at: "2026-08-28T00:00:00.000Z",
    last_verifying_at: null,
    login_verify_count: 0,
  })

  await expectError(
    await requestJson(context.app, "/api/accounts/verify-email-token", "POST", {
      userId: "missing",
      token: message.token,
    }),
    400,
    "User doesn't exist",
  )
  await expectError(
    await requestJson(context.app, "/api/accounts/verify-email-token", "POST", { userId: "task11-user", token: "bad" }),
    400,
    "Invalid claim",
  )
})

test("password hints distinguish mail, local display, unknown users, aliases, and rate limits", async () => {
  const checks: string[] = []
  const mailed = await contextCreate({
    config: { MAIL_ENABLED: true },
    user: { passwordHint: "family name" },
    rateLimiter: {
      check: (key) => {
        checks.push(key)
        return resultCreate(undefined)
      },
    },
  })
  const hinted = await requestJson(mailed.app, "/api/accounts/password-hint", "POST", { email: "TASK11@EXAMPLE.COM" })
  expect(hinted.status).toBe(200)
  expect(await hinted.text()).toBe("")
  expect(lastMessage(mailed.mail.messages)).toMatchObject({ kind: "passwordHint", recipient: "TASK11@EXAMPLE.COM" })
  expect(checks).toEqual(["unknown"])
  const unknown = await requestJson(mailed.app, "/api/accounts/password-hint", "POST", { email: "missing@example.com" })
  expect(unknown.status).toBe(200)
  expect(mailed.mail.messages).toHaveLength(1)

  const local = await contextCreate({ config: { SHOW_PASSWORD_HINT: true }, user: { passwordHint: "  local hint  " } })
  await expectError(
    await requestJson(local.app, "/api/accounts/password-hint", "POST", { email: "task11@example.com" }),
    400,
    "Your password hint is:   local hint  ",
  )
  await expectError(
    await requestJson(local.app, "/api/accounts/password-hint", "POST", { Email: "task11@example.com" }),
    400,
    "Invalid request.",
    { email: ['Invalid key: Expected "email" but received undefined'] },
  )
})

test("deletion recovery signs, verifies, and consumes lifecycle tokens", async () => {
  const context = await contextCreate({ config: { MAIL_ENABLED: true } })
  const requested = await requestJson(context.app, "/api/accounts/delete-recover", "POST", {
    email: "TASK11@EXAMPLE.COM",
  })
  expect(requested.status).toBe(200)
  expect(await requested.text()).toBe("")
  const message = lastMessage(context.mail.messages)
  const claims = decodeJwt(message.token ?? "")
  expect(claims).toMatchObject({
    iss: "https://vault.example|delete",
    sub: "task11-user",
    nbf: 1_787_875_200,
    exp: 1_787_875_200 + 120 * 3_600,
  })

  const completed = await requestJson(context.app, "/api/accounts/delete-recover-token", "POST", {
    userId: "task11-user",
    token: `\n${message.token}\t`,
  })
  expect(completed.status).toBe(200)
  expect(await completed.text()).toBe("")
  expect(context.database.query("SELECT COUNT(*) AS count FROM users WHERE uuid = ?").get("task11-user")).toEqual({
    count: 0,
  })
  await expectError(
    await requestJson(context.app, "/api/accounts/delete-recover-token", "POST", {
      userId: "task11-user",
      token: message.token,
    }),
    400,
    "User doesn't exist",
  )

  const disabled = await contextCreate({ config: { MAIL_ENABLED: false } })
  await expectError(
    await requestJson(disabled.app, "/api/accounts/delete-recover", "POST", { email: "task11@example.com" }),
    400,
    "Please contact the administrator to delete your account",
  )
})

test("lifecycle request schemas preserve camelCase and numeric completion tokens", () => {
  expect(
    v.safeParse(identityAccountChangeEmailDataSchema, {
      masterPasswordHash: "password",
      newEmail: "new@example.com",
      key: "key",
      newMasterPasswordHash: "new-password",
      token: 123456,
    }).success,
  ).toBe(true)
  expect(
    v.safeParse(identityAccountChangeEmailDataSchema, {
      MasterPasswordHash: "password",
      newEmail: "new@example.com",
      key: "key",
      newMasterPasswordHash: "new-password",
      token: "123456",
    }).success,
  ).toBe(false)
})

test("lifecycle token creators use configured expiry and distinct issuers", async () => {
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const verifyResult = await identityVerifyEmailTokenCreate(
    "user-id",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    2,
  )
  const deleteResult = await identityDeleteAccountTokenCreate(
    "user-id",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    3,
  )
  expect(verifyResult.success).toBe(true)
  expect(deleteResult.success).toBe(true)
  if (!verifyResult.success || !deleteResult.success) return
  expect(decodeJwt(verifyResult.data)).toMatchObject({ iss: "https://vault.example|verifyemail", sub: "user-id" })
  expect(decodeJwt(verifyResult.data).exp).toBe(1_787_875_200 + 2 * 3_600)
  expect(decodeJwt(deleteResult.data)).toMatchObject({ iss: "https://vault.example|delete", sub: "user-id" })
  expect(decodeJwt(deleteResult.data).exp).toBe(1_787_875_200 + 3 * 3_600)
})
