import { afterEach, expect, test } from "bun:test"
import { Hono } from "hono"
import * as v from "valibot"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { identityPasswordTokenResponseSchema } from "../../../src/server/contexts/identity/identityPasswordTokenResponseSchema.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import { authenticationClientVersionMiddleware } from "../../../src/server/contexts/authentication/authenticationClientVersionMiddleware.js"
import { authenticationMiddleware } from "../../../src/server/contexts/authentication/authenticationMiddleware.js"
import { authenticationSecurityStampExceptionSet } from "../../../src/server/contexts/authentication/authenticationSecurityStampExceptionSet.js"
import { organizationAdminMiddleware } from "../../../src/server/contexts/organizations/organizationAdminMiddleware.js"
import { organizationManagerLooseMiddleware } from "../../../src/server/contexts/organizations/organizationManagerLooseMiddleware.js"
import { organizationManagerMiddleware } from "../../../src/server/contexts/organizations/organizationManagerMiddleware.js"
import { organizationMemberMiddleware } from "../../../src/server/contexts/organizations/organizationMemberMiddleware.js"
import { organizationOwnerMiddleware } from "../../../src/server/contexts/organizations/organizationOwnerMiddleware.js"
import { organizationMembershipStatus } from "../../../src/server/contexts/organizations/organizationMembershipStatus.js"
import { organizationMembershipType } from "../../../src/server/contexts/organizations/organizationMembershipType.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import type { Clock } from "../../../src/shared/clock/clock.js"
import { passwordHashCreate } from "../../../src/shared/crypto/passwordHashCreate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"

type MutableClock = Clock & { advance: (seconds: number) => void }

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const userUuid = "00000000-0000-4000-8000-000000000030"
const deviceUuid = "integration-device"
const organizationUuid = "00000000-0000-4000-8000-000000000031"
const membershipUuid = "00000000-0000-4000-8000-000000000032"
const collectionUuid = "00000000-0000-4000-8000-000000000033"
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

async function userCreate(): Promise<IdentityUser> {
  const salt = Uint8Array.from({ length: 64 }, (_, index) => index + 1)
  const passwordHashResult = await passwordHashCreate("integration-password", salt, 100_000)
  if (!passwordHashResult.success) throw new Error(passwordHashResult.errorMessage)
  return {
    uuid: userUuid,
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: "2026-08-27T00:00:00.000Z",
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "integration@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Integration User",
    passwordHash: passwordHashResult.data,
    salt,
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "akey",
    privateKey: null,
    publicKey: null,
    securityStamp: "integration-stamp",
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

async function integrationContextCreate(): Promise<{
  app: ReturnType<typeof serverAppCreate>
  clock: MutableClock
  database: DatabaseConnection
  user: IdentityUser
}> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  const user = await userCreate()
  const saveResult = identityUserSave(database, user)
  if (!saveResult.success) throw new Error(saveResult.errorMessage)
  const clock = mutableClockCreate("2026-08-28T00:00:00.000Z")
  const app = serverAppCreate({
    clock,
    database,
    identity: {
      clock,
      config: identityConfigCreate({ PASSWORD_ITERATIONS: 100_000 }),
      database,
      identifier: { uuid: () => deviceUuid },
      mail: {
        sendRegisterVerifyEmail: async () => resultCreate(undefined),
        sendWelcome: async () => resultCreate(undefined),
        sendWelcomeMustVerify: async () => resultCreate(undefined),
      },
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      rateLimiter: { check: () => resultCreate(undefined) },
    },
  })
  return { app, clock, database, user }
}

function authenticationOptions(context: Awaited<ReturnType<typeof integrationContextCreate>>, routeName?: string) {
  return {
    clock: context.clock,
    database: context.database,
    issuer: "https://vault.example",
    publicKey: keyPair.publicKey,
    routeName,
  }
}

async function accessTokenCreate(app: ReturnType<typeof serverAppCreate>): Promise<string> {
  const response = await app.request("https://vault.example/identity/connect/token", {
    body: new URLSearchParams({
      grant_type: "password",
      client_id: "web",
      password: "integration-password",
      scope: "api offline_access",
      username: "integration@example.com",
      device_identifier: deviceUuid,
      device_name: "Integration Device",
      device_type: "7",
    }).toString(),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  })
  expect(response.status).toBe(200)
  const parsed = v.safeParse(identityPasswordTokenResponseSchema, await response.json())
  if (!parsed.success) throw new Error("The password token response was invalid")
  return parsed.output.access_token
}

async function expectGuardError(response: Response, status: number, message: string): Promise<void> {
  expect(response.status).toBe(status)
  expect(response.headers.get("content-type")).toBe("application/json; charset=UTF-8")
  expect(await response.json()).toEqual({
    message,
    validationErrors: { "": [message] },
    errorModel: { message, object: "error" },
    error: "",
    error_description: "",
    exceptionMessage: null,
    exceptionStackTrace: null,
    innerExceptionMessage: null,
    object: "error",
  })
}

function organizationDataCreate(database: DatabaseConnection): void {
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    organizationUuid,
    "Integration Organization",
    "billing@example.com",
  ])
  database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      membershipUuid,
      userUuid,
      organizationUuid,
      0,
      "organization-key",
      organizationMembershipStatus.confirmed,
      organizationMembershipType.user,
    ],
  )
  database.run("INSERT INTO collections (uuid, org_uuid, name) VALUES (?, ?, ?)", [
    collectionUuid,
    organizationUuid,
    "Integration Collection",
  ])
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("authentication middleware accepts a password-grant access token and rejects missing, invalid, revoked, and stale tokens", async () => {
  const context = await integrationContextCreate()
  context.app.get(
    "/api/protected",
    authenticationMiddleware(authenticationOptions(context, "core.protected")),
    (requestContext) => {
      const authentication = requestContext.get("authentication")
      return requestContext.json({
        host: authentication?.host,
        ip: authentication?.ip,
        userUuid: authentication?.user.uuid,
      })
    },
  )
  const token = await accessTokenCreate(context.app)

  const valid = await context.app.request("https://vault.example/api/protected", {
    headers: { authorization: `Bearer ${token}`, host: "vault.example", "x-real-ip": "192.0.2.20" },
  })
  expect(valid.status).toBe(200)
  expect(await valid.json()).toEqual({ host: "https://vault.example", ip: "192.0.2.20", userUuid })

  await expectGuardError(
    await context.app.request("https://vault.example/api/protected"),
    401,
    "No access token provided",
  )
  await expectGuardError(
    await context.app.request("https://vault.example/api/protected", { headers: { authorization: "Bearer invalid" } }),
    401,
    "Invalid claim",
  )

  context.database.run("DELETE FROM devices WHERE uuid = ? AND user_uuid = ?", [deviceUuid, userUuid])
  await expectGuardError(
    await context.app.request("https://vault.example/api/protected", {
      headers: { authorization: `Bearer ${token}` },
    }),
    401,
    "Invalid device id",
  )

  const secondToken = await accessTokenCreate(context.app)
  context.database.run("UPDATE users SET security_stamp = ? WHERE uuid = ?", ["new-stamp", userUuid])
  await expectGuardError(
    await context.app.request("https://vault.example/api/protected", {
      headers: { authorization: `Bearer ${secondToken}` },
    }),
    401,
    "Invalid security stamp",
  )
})

test("security-stamp route exceptions use explicit route names, expire at the upstream boundary, and persist cleanup", async () => {
  const context = await integrationContextCreate()
  context.app.get(
    "/api/stamp-allowed",
    authenticationMiddleware(authenticationOptions(context, "accounts.password")),
    (requestContext) => requestContext.json({ allowed: true }),
  )
  context.app.get(
    "/api/stamp-denied",
    authenticationMiddleware(authenticationOptions(context, "accounts.profile")),
    (requestContext) => requestContext.json({ allowed: true }),
  )
  const token = await accessTokenCreate(context.app)
  authenticationSecurityStampExceptionSet(context.user, ["accounts.password"], context.clock)
  context.user.securityStamp = "new-stamp"
  expect(identityUserSave(context.database, context.user).success).toBe(true)

  const allowed = await context.app.request("https://vault.example/api/stamp-allowed", {
    headers: { authorization: `Bearer ${token}` },
  })
  expect(allowed.status).toBe(200)
  expect(await allowed.json()).toEqual({ allowed: true })
  await expectGuardError(
    await context.app.request("https://vault.example/api/stamp-denied", {
      headers: { authorization: `Bearer ${token}` },
    }),
    401,
    "Invalid security stamp: Current route and exception route do not match",
  )

  context.clock.advance(121)
  await expectGuardError(
    await context.app.request("https://vault.example/api/stamp-allowed", {
      headers: { authorization: `Bearer ${token}` },
    }),
    401,
    "Stamp exception is expired",
  )
  expect(context.database.query("SELECT stamp_exception FROM users WHERE uuid = ?").get(userUuid)).toEqual({
    stamp_exception: null,
  })
})

test("required client-version middleware preserves exact errors and parsed SemVer context", async () => {
  const app = new Hono()
  app.get("/api/versioned", authenticationClientVersionMiddleware(), (context) => {
    const version = context.get("clientVersion")
    return context.json(version)
  })

  await expectGuardError(
    await app.request("http://localhost/api/versioned"),
    401,
    "No Bitwarden-Client-Version header provided",
  )
  await expectGuardError(
    await app.request("http://localhost/api/versioned", { headers: { "Bitwarden-Client-Version": "2024.12" } }),
    401,
    "Invalid Bitwarden-Client-Version header provided",
  )
  const valid = await app.request("http://localhost/api/versioned", {
    headers: { "Bitwarden-Client-Version": "2024.12.0-beta.1+desktop" },
  })
  expect(valid.status).toBe(200)
  expect(await valid.json()).toEqual({
    build: ["desktop"],
    major: 2024,
    minor: 12,
    patch: 0,
    preRelease: ["beta", "1"],
    raw: "2024.12.0-beta.1+desktop",
  })
})

test("organization guards compose authentication, membership status, role hierarchy, and collection access", async () => {
  const context = await integrationContextCreate()
  organizationDataCreate(context.database)
  const options = authenticationOptions(context)
  context.app.get(
    "/api/organizations/:organizationId/member",
    organizationMemberMiddleware(options),
    (requestContext) =>
      requestContext.json({
        organizationId: requestContext.get("organizationId"),
        type: requestContext.get("organizationMembership")?.type,
      }),
  )
  context.app.get(
    "/api/organizations/:organizationId/manager",
    organizationManagerLooseMiddleware(options),
    (requestContext) => requestContext.json({ manager: true }),
  )
  context.app.get(
    "/api/organizations/:organizationId/collections/:collectionId/manager",
    organizationManagerMiddleware({ ...options, groupsEnabled: true }),
    (requestContext) => requestContext.json({ manager: true }),
  )
  context.app.get("/api/organizations/:organizationId/admin", organizationAdminMiddleware(options), (requestContext) =>
    requestContext.json({ admin: true }),
  )
  context.app.get("/api/organizations/:organizationId/owner", organizationOwnerMiddleware(options), (requestContext) =>
    requestContext.json({ owner: true }),
  )
  const token = await accessTokenCreate(context.app)
  const headers = { authorization: `Bearer ${token}` }
  const memberPath = `https://vault.example/api/organizations/${organizationUuid}/member`

  const member = await context.app.request(memberPath, { headers })
  expect(member.status).toBe(200)
  expect(await member.json()).toEqual({ organizationId: organizationUuid, type: organizationMembershipType.user })
  await expectGuardError(
    await context.app.request(`https://vault.example/api/organizations/${organizationUuid}/manager`, { headers }),
    401,
    "You need to be a Manager, Admin or Owner to call this endpoint",
  )
  await expectGuardError(
    await context.app.request(
      `https://vault.example/api/organizations/${organizationUuid}/collections/${collectionUuid}/manager`,
      {
        headers,
      },
    ),
    401,
    "You need to be a Manager, Admin or Owner to call this endpoint",
  )

  context.database.run("UPDATE users_organizations SET status = ? WHERE uuid = ?", [
    organizationMembershipStatus.invited,
    membershipUuid,
  ])
  expect((await context.app.request(memberPath, { headers })).status).toBe(200)
  context.database.run("UPDATE users_organizations SET status = ?, atype = ? WHERE uuid = ?", [
    organizationMembershipStatus.confirmed,
    organizationMembershipType.manager,
    membershipUuid,
  ])
  expect(
    (await context.app.request(`https://vault.example/api/organizations/${organizationUuid}/manager`, { headers }))
      .status,
  ).toBe(200)
  await expectGuardError(
    await context.app.request(
      `https://vault.example/api/organizations/${organizationUuid}/collections/${collectionUuid}/manager`,
      {
        headers,
      },
    ),
    401,
    "The current user isn't a manager for this collection",
  )
  context.database.run("INSERT INTO users_collections (user_uuid, collection_uuid, manage) VALUES (?, ?, ?)", [
    userUuid,
    collectionUuid,
    1,
  ])
  expect(
    (
      await context.app.request(
        `https://vault.example/api/organizations/${organizationUuid}/collections/${collectionUuid}/manager`,
        { headers },
      )
    ).status,
  ).toBe(200)

  context.database.run("UPDATE users_organizations SET atype = ? WHERE uuid = ?", [
    organizationMembershipType.admin,
    membershipUuid,
  ])
  expect(
    (await context.app.request(`https://vault.example/api/organizations/${organizationUuid}/admin`, { headers }))
      .status,
  ).toBe(200)
  await expectGuardError(
    await context.app.request(`https://vault.example/api/organizations/${organizationUuid}/owner`, { headers }),
    401,
    "You need to be Owner to call this endpoint",
  )
  context.database.run("UPDATE users_organizations SET atype = ? WHERE uuid = ?", [
    organizationMembershipType.owner,
    membershipUuid,
  ])
  expect(
    (await context.app.request(`https://vault.example/api/organizations/${organizationUuid}/owner`, { headers }))
      .status,
  ).toBe(200)
  await expectGuardError(
    await context.app.request("https://vault.example/api/organizations/not-an-id/member", { headers }),
    401,
    "Error getting the organization id",
  )
  context.database.run("UPDATE users_organizations SET status = ? WHERE uuid = ?", [
    organizationMembershipStatus.revoked,
    membershipUuid,
  ])
  await expectGuardError(
    await context.app.request(memberPath, { headers }),
    401,
    "User status is either revoked or invalid.",
  )
})
