import { afterEach, expect, test } from "bun:test"
import { SignJWT } from "jose"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import type { IdentityMailAdapter } from "../../../src/server/contexts/identity/identityMailAdapter.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"
import type { Result } from "#result"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import fixtures from "../../fixtures/identityFixtures.json" with { type: "json" }

type MailCalls = {
  registerVerify: Array<{ email: string; token: string }>
  welcome: string[]
  welcomeMustVerify: Array<{ email: string; userId: string }>
}

type IdentityTestContext = {
  app: ReturnType<typeof serverAppCreate>
  calls: MailCalls
  database: DatabaseConnection
}

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const contexts: IdentityTestContext[] = []

function mailAdapterCreate(
  calls: MailCalls,
  failures?: {
    registerVerify?: boolean
    throwWelcome?: boolean
    throwWelcomeMustVerify?: boolean
    welcome?: boolean
    welcomeMustVerify?: boolean
  },
): IdentityMailAdapter {
  return {
    sendRegisterVerifyEmail: async (email, token) => {
      calls.registerVerify.push({ email, token })
      return failures?.registerVerify ? resultErrorCreate("testMail", "mail failed") : resultCreate(undefined)
    },
    sendWelcome: async (email) => {
      calls.welcome.push(email)
      if (failures?.throwWelcome) throw new Error("mail adapter threw")
      return failures?.welcome ? resultErrorCreate("testMail", "mail failed") : resultCreate(undefined)
    },
    sendWelcomeMustVerify: async (email, userId) => {
      calls.welcomeMustVerify.push({ email, userId })
      if (failures?.throwWelcomeMustVerify) throw new Error("mail adapter threw")
      return failures?.welcomeMustVerify ? resultErrorCreate("testMail", "mail failed") : resultCreate(undefined)
    },
  }
}

function identityTestContext(options?: {
  config?: Parameters<typeof identityConfigCreate>[0]
  failures?: {
    registerVerify?: boolean
    throwWelcome?: boolean
    throwWelcomeMustVerify?: boolean
    welcome?: boolean
    welcomeMustVerify?: boolean
  }
  rateLimiter?: { check: (key: string) => Result<void> }
}): IdentityTestContext {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const calls: MailCalls = { registerVerify: [], welcome: [], welcomeMustVerify: [] }
  const app = serverAppCreate({
    clock: clockTestCreate("2026-08-28T00:00:00.000Z"),
    database: databaseResult.data,
    identifier: identifierTestCreate([
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
      "00000000-0000-4000-8000-000000000003",
      "00000000-0000-4000-8000-000000000004",
    ]),
    identity: {
      config: identityConfigCreate(options?.config),
      mail: mailAdapterCreate(calls, options?.failures),
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      rateLimiter: options?.rateLimiter ?? {
        check: () => resultCreate(undefined),
      },
      publicOrigin: "https://vault.example/",
    },
  })
  const context = { app, calls, database: databaseResult.data }
  contexts.push(context)
  return context
}

async function requestJson(
  app: ReturnType<typeof serverAppCreate>,
  path: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<Response> {
  return app.request(`http://request.example${path}`, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
    method: "POST",
  })
}

function legacyPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...structuredClone(fixtures.legacyRegistration), ...overrides }
}

function currentPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...structuredClone(fixtures.currentRegistration), ...overrides }
}

async function invitationTokenCreate(kind: "emergency" | "organization", email: string, id: string): Promise<string> {
  const now = 1787875200
  const claims =
    kind === "emergency"
      ? {
          iss: "https://vault.example|emergencyaccessinvite",
          sub: "pending-user",
          nbf: now,
          exp: now + 7_200,
          email,
          emer_id: id,
          grantor_name: "Grantor",
          grantor_email: "grantor@example.com",
        }
      : {
          iss: "https://vault.example|invite",
          sub: "pending-user",
          nbf: now,
          exp: now + 7_200,
          email,
          org_id: "organization-123",
          member_id: id,
          invited_by_email: "owner@example.com",
        }
  return new SignJWT(claims).setProtectedHeader({ typ: "JWT", alg: "RS256" }).sign(keyPair.privateKey)
}

afterEach(() => {
  for (const context of contexts.splice(0)) databaseClose(context.database)
})

test("identity prelogin aliases and account creation expose the Bitwarden contract", async () => {
  const context = identityTestContext({ config: { PASSWORD_ITERATIONS: 100_000 } })
  const registration = await requestJson(context.app, "/identity/accounts/register", legacyPayload())

  expect(registration.status).toBe(200)
  expect(await registration.json()).toEqual({ object: "register", captchaBypassToken: "" })
  expect(context.calls).toEqual({ registerVerify: [], welcome: [], welcomeMustVerify: [] })

  const row = context.database
    .query(
      "SELECT email, name, length(password_hash) AS password_hash_length, length(salt) AS salt_length, password_hint, akey, private_key, public_key, client_kdf_type, client_kdf_iter, verified_at FROM users",
    )
    .get()
  expect(row).toMatchObject({
    email: "alice@example.com",
    name: "Alice Legacy",
    password_hash_length: 32,
    salt_length: 64,
    password_hint: "family name",
    akey: "legacy-wrapped-user-key",
    private_key: "legacy-encrypted-private-key",
    public_key: "legacy-public-key",
    client_kdf_type: 0,
    client_kdf_iter: 100000,
    verified_at: null,
  })

  for (const path of [
    "/api/accounts/prelogin",
    "/identity/accounts/prelogin",
    "/identity/accounts/prelogin/password",
  ]) {
    const response = await requestJson(context.app, path, { email: fixtures.emails.mixedCase })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      kdf: 0,
      kdfIterations: 100000,
      kdfMemory: null,
      kdfParallelism: null,
      kdfSettings: { iterations: 100000, kdfType: 0, memory: null, parallelism: null },
      salt: null,
    })
  }

  const unknown = await requestJson(context.app, "/api/accounts/prelogin", { email: "unknown@example.com" })
  expect(await unknown.json()).toEqual({
    kdf: 0,
    kdfIterations: 600000,
    kdfMemory: null,
    kdfParallelism: null,
    kdfSettings: { iterations: 600000, kdfType: 0, memory: null, parallelism: null },
    salt: null,
  })
})

test("registration accepts legacy aliases and current nested RegisterData", async () => {
  const context = identityTestContext({ config: { PASSWORD_ITERATIONS: 100_000 } })
  const legacy = await requestJson(context.app, "/identity/accounts/register", {
    ...structuredClone(fixtures.legacyAliases),
    masterPasswordHint: "alias hint",
  })
  const current = await requestJson(context.app, "/identity/accounts/register", currentPayload())

  expect(legacy.status).toBe(200)
  expect(current.status).toBe(200)
  expect(
    context.database.query("SELECT email, akey, private_key, client_kdf_iter FROM users ORDER BY email").all(),
  ).toEqual([
    {
      email: "current@example.com",
      akey: "current-wrapped-user-key",
      private_key: null,
      client_kdf_iter: 100000,
    },
    {
      email: "legacy@example.com",
      akey: "legacy-alias-key",
      private_key: "legacy-alias-encrypted-private-key",
      client_kdf_iter: 100000,
    },
  ])
})

test("registration persists Argon2 client KDF settings and prelogin returns them verbatim", async () => {
  const context = identityTestContext({ config: { PASSWORD_ITERATIONS: 100_000 } })
  const registration = await requestJson(
    context.app,
    "/identity/accounts/register",
    structuredClone(fixtures.argon2Registration),
  )
  expect(registration.status).toBe(200)

  const prelogin = await requestJson(context.app, "/identity/accounts/prelogin", {
    email: fixtures.argon2Registration.email,
  })
  expect(await prelogin.json()).toEqual({
    kdf: 1,
    kdfIterations: 3,
    kdfMemory: 64,
    kdfParallelism: 2,
    kdfSettings: { iterations: 3, kdfType: 1, memory: 64, parallelism: 2 },
    salt: null,
  })
})

test("registration capability applies signup, whitelist, invitation, and existing-user rules", async () => {
  const disabled = identityTestContext({ config: { SIGNUPS_ALLOWED: false, PASSWORD_ITERATIONS: 100_000 } })
  const denied = await requestJson(
    disabled.app,
    "/identity/accounts/register",
    legacyPayload({ email: fixtures.emails.restricted }),
  )
  expect(denied.status).toBe(400)
  expect(await denied.json()).toEqual({
    message: "Registration not allowed or user already exists",
    validationErrors: { "": ["Registration not allowed or user already exists"] },
    errorModel: { message: "Registration not allowed or user already exists", object: "error" },
    error: "",
    error_description: "",
    exceptionMessage: null,
    exceptionStackTrace: null,
    innerExceptionMessage: null,
    object: "error",
  })

  const whitelisted = identityTestContext({
    config: { SIGNUPS_ALLOWED: false, SIGNUPS_DOMAINS_WHITELIST: "example.com", PASSWORD_ITERATIONS: 100_000 },
  })
  const allowedByDomain = await requestJson(
    whitelisted.app,
    "/identity/accounts/register",
    legacyPayload({ email: "white@example.com" }),
  )
  expect(allowedByDomain.status).toBe(200)

  const invited = identityTestContext({ config: { SIGNUPS_ALLOWED: false, PASSWORD_ITERATIONS: 100_000 } })
  invited.database.run("INSERT INTO invitations (email) VALUES (?)", [fixtures.emails.invited])
  const allowedByInvitation = await requestJson(
    invited.app,
    "/identity/accounts/register",
    legacyPayload({ email: fixtures.emails.invited }),
  )
  expect(allowedByInvitation.status).toBe(200)
  expect(
    invited.database.query("SELECT email FROM invitations WHERE email = ?").get(fixtures.emails.invited),
  ).toBeNull()

  const existing = identityTestContext({ config: { PASSWORD_ITERATIONS: 100_000 } })
  const first = await requestJson(
    existing.app,
    "/identity/accounts/register",
    legacyPayload({ email: "existing@example.com" }),
  )
  expect(first.status).toBe(200)
  existing.database.run("INSERT INTO invitations (email) VALUES (?)", ["existing@example.com"])
  const duplicate = await requestJson(
    existing.app,
    "/identity/accounts/register",
    legacyPayload({ email: "EXISTING@example.com" }),
  )
  expect(duplicate.status).toBe(400)
  expect(await duplicate.json()).toMatchObject({ message: "Registration not allowed or user already exists" })
  expect(existing.database.query("SELECT email FROM invitations WHERE email = ?").get("existing@example.com")).toEqual({
    email: "existing@example.com",
  })
})

test("registration completes an invited incomplete user without replacing its account identity or salt", async () => {
  const context = identityTestContext({ config: { SIGNUPS_ALLOWED: false, PASSWORD_ITERATIONS: 100_000 } })
  const incompleteUser: IdentityUser = {
    uuid: "00000000-0000-4000-8000-000000000099",
    enabled: true,
    createdAt: "2026-08-27T00:00:00.000Z",
    updatedAt: "2026-08-27T00:00:00.000Z",
    verifiedAt: null,
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "incomplete@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Incomplete User",
    passwordHash: new Uint8Array(),
    salt: Uint8Array.from([1, 2, 3, 4]),
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "",
    privateKey: null,
    publicKey: null,
    securityStamp: "00000000-0000-4000-8000-000000000098",
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
  expect(identityUserSave(context.database, incompleteUser).success).toBe(true)
  context.database.run("INSERT INTO invitations (email) VALUES (?)", [incompleteUser.email])

  const response = await requestJson(
    context.app,
    "/identity/accounts/register",
    legacyPayload({ email: "INCOMPLETE@example.com", name: "Completed User" }),
  )
  expect(response.status).toBe(200)
  expect(
    context.database
      .query("SELECT uuid, salt, name, length(password_hash) AS password_hash_length FROM users WHERE email = ?")
      .get(incompleteUser.email),
  ).toMatchObject({
    uuid: incompleteUser.uuid,
    salt: incompleteUser.salt,
    name: "Completed User",
    password_hash_length: 32,
  })
})

test("registration consumes an invitation before applying password KDF validation", async () => {
  const context = identityTestContext({ config: { SIGNUPS_ALLOWED: false, PASSWORD_ITERATIONS: 100_000 } })
  context.database.run("INSERT INTO invitations (email) VALUES (?)", [fixtures.emails.invited])

  const response = await requestJson(
    context.app,
    "/identity/accounts/register",
    legacyPayload({ email: fixtures.emails.invited, kdfIterations: 99_999 }),
  )
  expect(response.status).toBe(400)
  expect(await response.json()).toMatchObject({ message: "PBKDF2 KDF iterations must be at least 100000." })
  expect(
    context.database.query("SELECT email FROM invitations WHERE email = ?").get(fixtures.emails.invited),
  ).toBeNull()
})

test("verification capability returns a JSON token without mail and finish preserves its verification state", async () => {
  const context = identityTestContext({
    config: { MAIL_ENABLED: false, SIGNUPS_VERIFY: true, PASSWORD_ITERATIONS: 100_000 },
  })
  const tokenResponse = await requestJson(
    context.app,
    "/identity/accounts/register/send-verification-email",
    fixtures.verification,
  )
  expect(tokenResponse.status).toBe(200)
  const token = await tokenResponse.json()
  expect(typeof token).toBe("string")
  expect(context.calls.registerVerify).toEqual([])

  const finish = await requestJson(
    context.app,
    "/identity/accounts/register/finish",
    legacyPayload({
      email: fixtures.verification.email,
      emailVerificationToken: token,
      name: "Submitted Name",
    }),
  )
  expect(finish.status).toBe(200)
  expect(await finish.json()).toEqual({ object: "register", captchaBypassToken: "" })
  expect(
    context.database
      .query("SELECT name, verified_at, last_verifying_at FROM users WHERE email = ?")
      .get(fixtures.verification.email),
  ).toMatchObject({
    name: "Verified User",
    verified_at: null,
    last_verifying_at: null,
  })
})

test("verification email capability only permits disabled-signup invitations when mail is disabled", async () => {
  const denied = identityTestContext({ config: { SIGNUPS_ALLOWED: false } })
  const deniedResponse = await requestJson(denied.app, "/identity/accounts/register/send-verification-email", {
    email: fixtures.emails.invited,
  })
  expect(deniedResponse.status).toBe(400)

  const invited = identityTestContext({ config: { SIGNUPS_ALLOWED: false } })
  invited.database.run("INSERT INTO invitations (email) VALUES (?)", [fixtures.emails.invited])
  const invitedResponse = await requestJson(invited.app, "/identity/accounts/register/send-verification-email", {
    email: fixtures.emails.invited,
  })
  expect(invitedResponse.status).toBe(200)
  expect(typeof (await invitedResponse.json())).toBe("string")

  const mail = identityTestContext({ config: { SIGNUPS_ALLOWED: false, MAIL_ENABLED: true, SIGNUPS_VERIFY: true } })
  mail.database.run("INSERT INTO invitations (email) VALUES (?)", [fixtures.emails.invited])
  const mailResponse = await requestJson(mail.app, "/identity/accounts/register/send-verification-email", {
    email: fixtures.emails.invited,
  })
  expect(mailResponse.status).toBe(400)
})

test("verification mail and welcome mail follow enabled-mail behavior and failure semantics", async () => {
  const mail = identityTestContext({
    config: { MAIL_ENABLED: true, SIGNUPS_VERIFY: true, PASSWORD_ITERATIONS: 100_000 },
  })
  const verification = await requestJson(
    mail.app,
    "/identity/accounts/register/send-verification-email",
    fixtures.verification,
  )
  expect(verification.status).toBe(204)
  expect(await verification.text()).toBe("")
  expect(mail.calls.registerVerify).toHaveLength(1)

  const registration = await requestJson(
    mail.app,
    "/identity/accounts/register",
    legacyPayload({ email: "mail@example.com" }),
  )
  expect(registration.status).toBe(200)
  expect(mail.calls.welcomeMustVerify).toHaveLength(1)
  expect(
    mail.database.query("SELECT verified_at, last_verifying_at FROM users WHERE email = ?").get("mail@example.com"),
  ).toEqual({
    verified_at: null,
    last_verifying_at: "2026-08-28T00:00:00.000Z",
  })
  const privateKeyUserVerification = await requestJson(
    mail.app,
    "/identity/accounts/register/send-verification-email",
    { email: "mail@example.com", name: "Mail User" },
  )
  expect(privateKeyUserVerification.status).toBe(204)
  expect(mail.calls.registerVerify).toHaveLength(1)

  const welcomeFailure = identityTestContext({
    config: { MAIL_ENABLED: true, PASSWORD_ITERATIONS: 100_000 },
    failures: { welcome: true },
  })
  const welcomeRegistration = await requestJson(
    welcomeFailure.app,
    "/identity/accounts/register",
    legacyPayload({ email: "welcome-failure@example.com" }),
  )
  expect(welcomeRegistration.status).toBe(200)
  expect(
    welcomeFailure.database.query("SELECT email FROM users WHERE email = ?").get("welcome-failure@example.com"),
  ).toEqual({
    email: "welcome-failure@example.com",
  })
  const throwingWelcome = identityTestContext({
    config: { MAIL_ENABLED: true, PASSWORD_ITERATIONS: 100_000 },
    failures: { throwWelcome: true },
  })
  const throwingWelcomeRegistration = await requestJson(
    throwingWelcome.app,
    "/identity/accounts/register",
    legacyPayload({ email: "throwing-welcome@example.com" }),
  )
  expect(throwingWelcomeRegistration.status).toBe(200)
  expect(
    throwingWelcome.database.query("SELECT email FROM users WHERE email = ?").get("throwing-welcome@example.com"),
  ).toEqual({ email: "throwing-welcome@example.com" })

  const verificationFailure = identityTestContext({
    config: { MAIL_ENABLED: true, SIGNUPS_VERIFY: true },
    failures: { registerVerify: true },
  })
  const failedMail = await requestJson(
    verificationFailure.app,
    "/identity/accounts/register/send-verification-email",
    fixtures.verification,
  )
  expect(failedMail.status).toBe(400)
  expect(await failedMail.json()).toMatchObject({ message: "Error sending verification email." })
})

test("registration returns exact validation, format, KDF, and token errors", async () => {
  const context = identityTestContext({ config: { PASSWORD_ITERATIONS: 100_000 } })
  const invalidJson = await context.app.request("http://request.example/identity/accounts/register", {
    body: "not-json",
    headers: { "content-type": "application/json" },
    method: "POST",
  })
  expect(invalidJson.status).toBe(400)
  expect(await invalidJson.json()).toMatchObject({ message: "Request body must be valid JSON." })

  const format = await requestJson(context.app, "/identity/accounts/register", { email: "format@example.com" })
  expect(format.status).toBe(422)
  expect(await format.json()).toMatchObject({ message: "Unexpected RegisterData format" })

  const lowPbkdf2 = await requestJson(
    context.app,
    "/identity/accounts/register",
    legacyPayload({ email: "low@example.com", kdfIterations: 99_999 }),
  )
  expect(lowPbkdf2.status).toBe(400)
  expect(await lowPbkdf2.json()).toMatchObject({ message: "PBKDF2 KDF iterations must be at least 100000." })

  const invalidEmail = await requestJson(
    context.app,
    "/identity/accounts/register",
    legacyPayload({ email: "two@ats@example.com" }),
  )
  expect(invalidEmail.status).toBe(400)
  expect(await invalidEmail.json()).toMatchObject({
    message: "User email two@ats@example.com is not a valid email address",
  })

  const invalidArgon = await requestJson(
    context.app,
    "/identity/accounts/register",
    legacyPayload({ email: "argon-invalid@example.com", kdf: 1, kdfIterations: 1, kdfMemory: 14, kdfParallelism: 1 }),
  )
  expect(invalidArgon.status).toBe(400)
  expect(await invalidArgon.json()).toMatchObject({ message: "Argon2 memory must be between 15 MB and 1024 MB." })

  const mismatchedCurrent = currentPayload()
  const unlock = mismatchedCurrent.masterPasswordUnlock as { kdf: { kdfIterations: number } }
  unlock.kdf.kdfIterations = 200_000
  const mismatchedCurrentResponse = await requestJson(context.app, "/identity/accounts/register", mismatchedCurrent)
  expect(mismatchedCurrentResponse.status).toBe(422)
  expect(await mismatchedCurrentResponse.json()).toMatchObject({ message: "Unexpected RegisterData format" })

  const tokenResponse = await requestJson(
    context.app,
    "/identity/accounts/register/send-verification-email",
    fixtures.verification,
  )
  const token = await tokenResponse.json()
  const mismatchedEmail = await requestJson(
    context.app,
    "/identity/accounts/register/finish",
    legacyPayload({ email: "other@example.com", emailVerificationToken: token }),
  )
  expect(mismatchedEmail.status).toBe(400)
  expect(await mismatchedEmail.json()).toMatchObject({ message: "Email verification token does not match email" })

  const missingToken = await requestJson(
    context.app,
    "/identity/accounts/register/finish",
    legacyPayload({ email: "missing-token@example.com" }),
  )
  expect(missingToken.status).toBe(400)
  expect(await missingToken.json()).toMatchObject({ message: "Registration is missing required parameters" })
})

test("registration accepts organization and emergency invite verification variants", async () => {
  const context = identityTestContext({ config: { SIGNUPS_ALLOWED: false, PASSWORD_ITERATIONS: 100_000 } })
  const organizationToken = await invitationTokenCreate(
    "organization",
    fixtures.organizationInvite.email,
    fixtures.organizationInvite.organizationUserId,
  )
  const organization = await requestJson(
    context.app,
    "/identity/accounts/register/finish",
    legacyPayload({
      email: fixtures.organizationInvite.email,
      organizationUserId: fixtures.organizationInvite.organizationUserId,
      orgInviteToken: organizationToken,
    }),
  )
  expect(organization.status).toBe(200)
  expect(
    context.database.query("SELECT verified_at FROM users WHERE email = ?").get(fixtures.organizationInvite.email),
  ).toEqual({
    verified_at: "2026-08-28T00:00:00.000Z",
  })

  const emergencyToken = await invitationTokenCreate(
    "emergency",
    fixtures.emergencyInvite.email,
    fixtures.emergencyInvite.emergencyAccessId,
  )
  const emergency = await requestJson(
    context.app,
    "/identity/accounts/register/finish",
    legacyPayload({
      email: fixtures.emergencyInvite.email,
      acceptEmergencyAccessId: fixtures.emergencyInvite.emergencyAccessId,
      acceptEmergencyAccessInviteToken: emergencyToken,
    }),
  )
  expect(emergency.status).toBe(200)
  expect(
    context.database.query("SELECT verified_at FROM users WHERE email = ?").get(fixtures.emergencyInvite.email),
  ).toEqual({
    verified_at: "2026-08-28T00:00:00.000Z",
  })

  const disabled = identityTestContext({
    config: { SIGNUPS_ALLOWED: false, EMERGENCY_ACCESS_ALLOWED: false, PASSWORD_ITERATIONS: 100_000 },
  })
  const disabledEmergency = await requestJson(
    disabled.app,
    "/identity/accounts/register/finish",
    legacyPayload({
      email: fixtures.emergencyInvite.email,
      acceptEmergencyAccessId: fixtures.emergencyInvite.emergencyAccessId,
      acceptEmergencyAccessInviteToken: emergencyToken,
    }),
  )
  expect(disabledEmergency.status).toBe(400)
  expect(await disabledEmergency.json()).toMatchObject({ message: "Emergency access is not enabled." })
})

test("verification email route applies the unauthenticated IP rate limit before parsing", async () => {
  const context = identityTestContext({
    rateLimiter: {
      check: (() => {
        let count = 0
        return () => {
          count += 1
          return count === 1
            ? resultCreate(undefined)
            : resultErrorCreate("testRateLimiter", "Too many requests", {
                code: "platform.rate-limited",
                statusCode: 429,
              })
        }
      })(),
    },
  })
  const first = await requestJson(
    context.app,
    "/identity/accounts/register/send-verification-email",
    fixtures.verification,
    {
      "x-real-ip": "192.0.2.10",
    },
  )
  const second = await requestJson(
    context.app,
    "/identity/accounts/register/send-verification-email",
    { malformed: true },
    {
      "x-real-ip": "192.0.2.10",
    },
  )
  expect(first.status).toBe(200)
  expect(second.status).toBe(429)
  expect(await second.json()).toMatchObject({ message: "Too many requests" })
})
