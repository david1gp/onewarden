import { afterEach, expect, test } from "bun:test"
import * as v from "valibot"
import type { IdentityAuthRequest } from "../../../src/server/contexts/identity/identityAuthRequest.js"
import { identityAuthRequestSave } from "../../../src/server/contexts/identity/identityAuthRequestSave.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import { identityPasswordTokenResponseSchema } from "../../../src/server/contexts/identity/identityPasswordTokenResponseSchema.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import { organizationMembershipStatus } from "../../../src/server/contexts/organizations/organizationMembershipStatus.js"
import { organizationMembershipType } from "../../../src/server/contexts/organizations/organizationMembershipType.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import type { Clock } from "../../../src/shared/clock/clock.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { base64UrlEncode } from "../../../src/shared/crypto/base64UrlEncode.js"
import { passwordHashCreate } from "../../../src/shared/crypto/passwordHashCreate.js"
import { passwordHashVerify } from "../../../src/shared/crypto/passwordHashVerify.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"

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
    uuid: "task10-user",
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: "2026-08-27T00:00:00.000Z",
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "task10@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Task 10 User",
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

async function contextCreate(
  options: { user?: Partial<IdentityUser>; config?: Parameters<typeof identityConfigCreate>[0] } = {},
) {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  const user = await userCreate(options.user)
  const saveResult = identityUserSave(database, user)
  if (!saveResult.success) throw new Error(saveResult.errorMessage)
  const clock = mutableClockCreate("2026-08-28T00:00:00.000Z")
  let identifier = 0
  const app = serverAppCreate({
    clock,
    database,
    identity: {
      clock,
      config: identityConfigCreate({ PASSWORD_ITERATIONS: 100_000, ...options.config }),
      database,
      identifier: { uuid: () => `generated-${++identifier}` },
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      rateLimiter: { check: () => resultCreate(undefined) },
    },
  })
  return { app, clock, database, user }
}

async function passwordTokenCreate(
  app: ReturnType<typeof serverAppCreate>,
  overrides: Record<string, string> = {},
): Promise<string> {
  const response = await app.request("https://vault.example/identity/connect/token", {
    body: new URLSearchParams({
      grant_type: "password",
      client_id: "web",
      password: "current-password",
      scope: "api offline_access",
      username: "task10@example.com",
      device_identifier: "task10-device",
      device_name: "Task 10 device",
      device_type: "7",
      ...overrides,
    }).toString(),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  })
  expect(response.status).toBe(200)
  const parsed = v.safeParse(identityPasswordTokenResponseSchema, await response.json())
  if (!parsed.success) throw new Error("Password token response was invalid")
  return parsed.output.access_token
}

async function requestJson(
  app: ReturnType<typeof serverAppCreate>,
  path: string,
  method: string,
  body: unknown,
  token?: string,
  headers: Record<string, string> = {},
): Promise<Response> {
  return app.request(`https://vault.example${path}`, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
      ...headers,
    },
    method,
  })
}

async function expectError(response: Response, status: number, message: string): Promise<void> {
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

async function expectValidationError(response: Response, details: Record<string, string[]>): Promise<void> {
  expect(response.status).toBe(400)
  expect(response.headers.get("content-type")).toBe("application/json; charset=UTF-8")
  expect(await response.json()).toMatchObject({
    message: "Invalid request.",
    validationErrors: details,
    errorModel: { message: "Invalid request.", object: "error" },
    error: "",
    error_description: "",
    object: "error",
  })
}

function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` }
}

function kdfData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { kdf: 0, kdfIterations: 100_000, kdfMemory: null, kdfParallelism: null, ...overrides }
}

function deviceCreate(userUuid: string, uuid: string, type = 7): IdentityDevice {
  return {
    uuid,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    userUuid,
    name: `${uuid} name`,
    type,
    pushUuid: `${uuid}-push`,
    pushToken: null,
    refreshToken: `${uuid}-refresh`,
    twoFactorRemember: null,
  }
}

function authRequestCreate(
  userUuid: string,
  uuid: string,
  requestDeviceIdentifier: string,
  overrides: Partial<IdentityAuthRequest> = {},
): IdentityAuthRequest {
  return {
    uuid,
    userUuid,
    organizationUuid: null,
    requestDeviceIdentifier,
    deviceType: 7,
    requestIp: "192.0.2.20",
    responseDeviceId: null,
    accessCode: `${uuid}-access-code`,
    publicKey: `${uuid}-public-key`,
    encKey: null,
    masterPasswordHash: null,
    approved: null,
    creationDate: "2026-08-28T00:00:00.000Z",
    responseDate: null,
    authenticationDate: null,
    ...overrides,
  }
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("profile, avatar, keys, public keys, aliases, casing, and persistence match the account contract", async () => {
  const context = await contextCreate()
  const token = await passwordTokenCreate(context.app)

  expect(
    await (
      await context.app.request("https://vault.example/api/accounts/profile", { headers: authHeaders(token) })
    ).json(),
  ).toEqual({
    _status: 0,
    accountKeys: null,
    id: "task10-user",
    name: "Task 10 User",
    email: "task10@example.com",
    emailVerified: true,
    premium: true,
    premiumFromOrganization: false,
    culture: "en-US",
    twoFactorEnabled: false,
    key: "initial-akey",
    privateKey: null,
    securityStamp: "initial-security-stamp",
    organizations: [],
    providers: [],
    providerOrganizations: [],
    forcePasswordReset: false,
    avatarColor: null,
    usesKeyConnector: false,
    creationDate: "2026-08-28T00:00:00.000Z",
    object: "profile",
  })

  const acceptedName = "é".repeat(25)
  const putProfile = await requestJson(context.app, "/api/accounts/profile", "PUT", { name: acceptedName }, token)
  expect(putProfile.status).toBe(200)
  expect((await putProfile.json()).name).toBe(acceptedName)
  const postProfile = await requestJson(context.app, "/api/accounts/profile", "POST", { name: "Post profile" }, token)
  expect(postProfile.status).toBe(200)
  expect((await postProfile.json()).name).toBe("Post profile")
  await expectError(
    await requestJson(context.app, "/api/accounts/profile", "PUT", { name: `${acceptedName}a` }, token),
    400,
    "The field Name must be a string with a maximum length of 50.",
  )

  const avatar = await requestJson(context.app, "/api/accounts/avatar", "PUT", { avatarColor: "#123456" }, token)
  expect(avatar.status).toBe(200)
  expect((await avatar.json()).avatarColor).toBe("#123456")
  await expectError(
    await requestJson(context.app, "/api/accounts/avatar", "PUT", { avatarColor: "#12345" }, token),
    400,
    "The field AvatarColor must be a HTML/Hex color code with a length of 7 characters",
  )
  expect(
    (await (await requestJson(context.app, "/api/accounts/avatar", "PUT", { avatarColor: null }, token)).json())
      .avatarColor,
  ).toBeNull()

  const keys = await requestJson(
    context.app,
    "/api/accounts/keys",
    "POST",
    { encryptedPrivateKey: "encrypted-private-key", publicKey: "public-key" },
    token,
  )
  expect(await keys.json()).toEqual({ privateKey: "encrypted-private-key", publicKey: "public-key", object: "keys" })
  expect(
    context.database
      .query("SELECT name, avatar_color, private_key, public_key FROM users WHERE uuid = ?")
      .get("task10-user"),
  ).toEqual({
    name: "Post profile",
    avatar_color: null,
    private_key: "encrypted-private-key",
    public_key: "public-key",
  })
  expect(
    await (
      await context.app.request("https://vault.example/api/users/task10-user/public-key", {
        headers: authHeaders(token),
      })
    ).json(),
  ).toEqual({ userId: "task10-user", publicKey: "public-key", object: "userKey" })
  await expectError(
    await context.app.request("https://vault.example/api/users/missing/public-key", { headers: authHeaders(token) }),
    404,
    "User doesn't exist",
  )

  const otherUser = await userCreate({ uuid: "other-user", email: "other@example.com", publicKey: null })
  expect(identityUserSave(context.database, otherUser).success).toBe(true)
  await expectError(
    await context.app.request("https://vault.example/api/users/other-user/public-key", { headers: authHeaders(token) }),
    404,
    "User has no public_key",
  )
})

test("set-password, password changes, KDF changes, exact errors, revision dates, and authentication invalidation persist", async () => {
  const context = await contextCreate()
  const token = await passwordTokenCreate(context.app)
  const revisionBefore = await context.app.request("https://vault.example/api/accounts/revision-date", {
    headers: authHeaders(token),
  })
  expect(await revisionBefore.json()).toBe(new Date("2026-08-28T00:00:00.000Z").getTime())

  const setPassword = await requestJson(
    context.app,
    "/api/accounts/set-password",
    "POST",
    {
      ...kdfData(),
      key: "set-password-key",
      keys: { encryptedPrivateKey: "set-private", publicKey: "set-public" },
      masterPasswordHash: "set-password",
      masterPasswordHint: " set hint ",
    },
    token,
  )
  expect(await setPassword.json()).toEqual({ object: "set-password", captchaBypassToken: "" })
  expect(
    context.database
      .query("SELECT akey, password_hint, private_key, public_key, client_kdf_type FROM users WHERE uuid = ?")
      .get("task10-user"),
  ).toEqual({
    akey: "set-password-key",
    password_hint: "set hint",
    private_key: "set-private",
    public_key: "set-public",
    client_kdf_type: 0,
  })
  await expectError(
    await requestJson(
      context.app,
      "/api/accounts/set-password",
      "POST",
      { ...kdfData(), key: "again", masterPasswordHash: "again" },
      token,
    ),
    400,
    "Account already initialized, cannot set password",
  )

  await expectError(
    await requestJson(context.app, "/api/accounts/password", "POST", { masterPasswordHash: "wrong" }, token),
    400,
    "Invalid password",
  )
  const legacyPassword = await requestJson(
    context.app,
    "/api/accounts/password",
    "POST",
    {
      masterPasswordHash: "set-password",
      newMasterPasswordHash: "next-password",
      key: "next-key",
      masterPasswordHint: "next hint",
    },
    token,
  )
  expect(legacyPassword.status).toBe(200)
  expect(await legacyPassword.text()).toBe("")
  const storedUser = context.database
    .query<{ password_hash: Uint8Array; salt: Uint8Array }, [string]>(
      "SELECT password_hash, salt FROM users WHERE uuid = ?",
    )
    .get("task10-user")
  expect(storedUser).not.toBeNull()
  if (storedUser === null) return
  expect(await passwordHashVerify("next-password", storedUser.salt, storedUser.password_hash, 100_000)).toEqual({
    success: true,
    data: true,
  })
  expect(context.database.query("SELECT akey, password_hint FROM users WHERE uuid = ?").get("task10-user")).toEqual({
    akey: "next-key",
    password_hint: "next hint",
  })
  await expectError(
    await context.app.request("https://vault.example/api/accounts/profile", { headers: authHeaders(token) }),
    401,
    "Invalid security stamp: Current route and exception route do not match",
  )

  const newToken = await passwordTokenCreate(context.app, {
    password: "next-password",
    device_identifier: "next-device",
  })
  const kdfErrorBody = {
    masterPasswordHash: "next-password",
    authenticationData: {
      salt: "task10@example.com",
      kdf: kdfData(),
      masterPasswordAuthenticationHash: "next-kdf-password",
    },
    unlockData: {
      salt: "task10@example.com",
      kdf: kdfData({ kdfIterations: 100_001 }),
      masterKeyWrappedUserKey: "next-kdf-key",
    },
  }
  await expectError(
    await requestJson(context.app, "/api/accounts/password", "POST", kdfErrorBody, newToken),
    400,
    "KDF settings must be equal for authentication and unlock",
  )
  await expectError(
    await requestJson(
      context.app,
      "/api/accounts/password",
      "POST",
      { ...kdfErrorBody, unlockData: { ...kdfErrorBody.unlockData, kdf: kdfData(), salt: "wrong@example.com" } },
      newToken,
    ),
    400,
    "Invalid master password salt",
  )

  const kdf = await requestJson(
    context.app,
    "/api/accounts/kdf",
    "POST",
    {
      masterPasswordHash: "next-password",
      authenticationData: {
        salt: "task10@example.com",
        kdf: { kdfType: 1, iterations: 2, memory: 15, parallelism: 1 },
        masterPasswordAuthenticationHash: "argon-password",
      },
      unlockData: {
        salt: "task10@example.com",
        kdf: { kdfType: 1, iterations: 2, memory: 15, parallelism: 1 },
        masterKeyWrappedUserKey: "argon-key",
      },
    },
    newToken,
  )
  expect(kdf.status).toBe(200)
  expect(await kdf.text()).toBe("")
  expect(
    context.database
      .query(
        "SELECT client_kdf_type, client_kdf_iter, client_kdf_memory, client_kdf_parallelism FROM users WHERE uuid = ?",
      )
      .get("task10-user"),
  ).toEqual({
    client_kdf_type: 1,
    client_kdf_iter: 2,
    client_kdf_memory: 15,
    client_kdf_parallelism: 1,
  })
  await expectError(
    await context.app.request("https://vault.example/api/accounts/profile", { headers: authHeaders(newToken) }),
    401,
    "Invalid security stamp: Current route and exception route do not match",
  )
})

test("KDF validation, verify-password casing, password aliases, API-key generation/rotation, and grant authentication are exact", async () => {
  const context = await contextCreate()
  const token = await passwordTokenCreate(context.app)

  await expectValidationError(
    await requestJson(context.app, "/api/accounts/kdf", "POST", { masterPasswordHash: "current-password" }, token),
    {
      authenticationData: ['Invalid key: Expected "authenticationData" but received undefined'],
      unlockData: ['Invalid key: Expected "unlockData" but received undefined'],
    },
  )
  const invalidKdf = {
    masterPasswordHash: "current-password",
    authenticationData: {
      salt: "task10@example.com",
      kdf: kdfData({ kdfIterations: 99_999 }),
      masterPasswordAuthenticationHash: "x",
    },
    unlockData: { salt: "task10@example.com", kdf: kdfData({ kdfIterations: 99_999 }), masterKeyWrappedUserKey: "x" },
  }
  await expectError(
    await requestJson(context.app, "/api/accounts/kdf", "POST", invalidKdf, token),
    400,
    "PBKDF2 KDF iterations must be at least 100000.",
  )
  await expectError(
    await requestJson(
      context.app,
      "/api/accounts/kdf",
      "POST",
      {
        ...invalidKdf,
        authenticationData: {
          ...invalidKdf.authenticationData,
          kdf: kdfData({ kdf: 1, kdfIterations: 1, kdfMemory: null, kdfParallelism: 1 }),
        },
        unlockData: {
          ...invalidKdf.unlockData,
          kdf: kdfData({ kdf: 1, kdfIterations: 1, kdfMemory: null, kdfParallelism: 1 }),
        },
      },
      token,
    ),
    400,
    "Argon2 memory parameter is required.",
  )

  const verify = await requestJson(
    context.app,
    "/api/accounts/verify-password",
    "POST",
    { masterPasswordHash: "current-password" },
    token,
  )
  expect(await verify.json()).toEqual({ Object: "masterPasswordPolicy" })
  await expectError(
    await requestJson(context.app, "/api/accounts/verify-password", "POST", { masterPasswordHash: "wrong" }, token),
    400,
    "Invalid password",
  )

  const apiKey = await requestJson(
    context.app,
    "/api/accounts/api-key",
    "POST",
    { MasterPasswordHash: "current-password" },
    token,
  )
  const apiKeyBody = (await apiKey.json()) as { apiKey: string; revisionDate: string; object: string }
  expect(apiKey.status).toBe(200)
  const generatedApiKey = apiKeyBody.apiKey
  expect(apiKeyBody.object).toBe("apiKey")
  expect(generatedApiKey).toMatch(/^[A-Za-z0-9]{30}$/)
  expect(apiKeyBody.revisionDate).toBe("2026-08-28T00:00:00.000Z")
  expect(context.database.query("SELECT api_key FROM users WHERE uuid = ?").get("task10-user")).toEqual({
    api_key: generatedApiKey,
  })

  const apiGrant = await context.app.request("https://vault.example/identity/connect/token", {
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: "user.task10-user",
      client_secret: generatedApiKey,
      scope: "api",
      device_identifier: "api-device",
      device_name: "API device",
      device_type: "9",
    }).toString(),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  })
  expect(apiGrant.status).toBe(200)
  const rotated = await requestJson(
    context.app,
    "/api/accounts/rotate-api-key",
    "POST",
    { masterPasswordHash: "current-password" },
    token,
  )
  const rotatedBody = (await rotated.json()) as { apiKey: string; revisionDate: string; object: string }
  const rotatedApiKey = rotatedBody.apiKey
  expect(rotatedBody.object).toBe("apiKey")
  expect(rotatedApiKey).toMatch(/^[A-Za-z0-9]{30}$/)
  expect(rotatedApiKey).not.toBe(generatedApiKey)
  const oldApiGrant = await context.app.request("https://vault.example/identity/connect/token", {
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: "user.task10-user",
      client_secret: generatedApiKey,
      scope: "api",
      device_identifier: "old-api-device",
      device_name: "Old API device",
      device_type: "9",
    }).toString(),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  })
  await expectError(oldApiGrant, 400, "Incorrect client_secret")
})

test("security stamp and account deletion deauthorize sessions, preserve aliases, enforce owner safety, and clean relationships", async () => {
  const context = await contextCreate()
  const token = await passwordTokenCreate(context.app)
  await passwordTokenCreate(context.app, { device_identifier: "second-device", device_name: "Second device" })
  await expectError(
    await requestJson(context.app, "/api/accounts/security-stamp", "POST", { masterPasswordHash: "wrong" }, token),
    400,
    "Invalid password",
  )
  const stampBefore = context.database
    .query<{ security_stamp: string }, [string]>("SELECT security_stamp FROM users WHERE uuid = ?")
    .get("task10-user")?.security_stamp
  const stamped = await requestJson(
    context.app,
    "/api/accounts/security-stamp",
    "POST",
    { MasterPasswordHash: "current-password" },
    token,
  )
  expect(stamped.status).toBe(200)
  expect(await stamped.text()).toBe("")
  const stampAfter = context.database
    .query<{ security_stamp: string }, [string]>("SELECT security_stamp FROM users WHERE uuid = ?")
    .get("task10-user")?.security_stamp
  expect(stampAfter).not.toBe(stampBefore)
  expect(
    context.database.query("SELECT COUNT(*) AS count FROM devices WHERE user_uuid = ?").get("task10-user"),
  ).toEqual({ count: 0 })

  const deletion = await contextCreate()
  const deletionToken = await passwordTokenCreate(deletion.app)
  deletion.database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    "delete-org",
    "Delete org",
    "delete@example.com",
  ])
  deletion.database.run(
    "INSERT INTO users_organizations (uuid, user_uuid, org_uuid, akey, status, atype) VALUES (?, ?, ?, ?, ?, ?)",
    [
      "delete-membership",
      "task10-user",
      "delete-org",
      "org-key",
      organizationMembershipStatus.confirmed,
      organizationMembershipType.user,
    ],
  )
  deletion.database.run("INSERT INTO collections (uuid, org_uuid, name) VALUES (?, ?, ?)", [
    "delete-collection",
    "delete-org",
    "Delete collection",
  ])
  deletion.database.run("INSERT INTO users_collections (user_uuid, collection_uuid) VALUES (?, ?)", [
    "task10-user",
    "delete-collection",
  ])
  deletion.database.run(
    "INSERT INTO groups (uuid, organizations_uuid, name, creation_date, revision_date) VALUES (?, ?, ?, ?, ?)",
    ["delete-group", "delete-org", "Delete group", "2026-08-28T00:00:00.000Z", "2026-08-28T00:00:00.000Z"],
  )
  deletion.database.run("INSERT INTO groups_users (groups_uuid, users_organizations_uuid) VALUES (?, ?)", [
    "delete-group",
    "delete-membership",
  ])
  deletion.database.run("INSERT INTO folders (uuid, created_at, updated_at, user_uuid, name) VALUES (?, ?, ?, ?, ?)", [
    "delete-folder",
    "2026-08-28T00:00:00.000Z",
    "2026-08-28T00:00:00.000Z",
    "task10-user",
    "Delete folder",
  ])
  deletion.database.run("INSERT INTO folders_ciphers (cipher_uuid, folder_uuid) VALUES (?, ?)", [
    "delete-cipher",
    "delete-folder",
  ])
  deletion.database.run("INSERT INTO invitations (email) VALUES (?)", ["task10@example.com"])
  deletion.database.run("INSERT INTO sso_users (user_uuid, identifier) VALUES (?, ?)", ["task10-user", "delete-sso"])
  const deleted = await requestJson(
    deletion.app,
    "/api/accounts/delete",
    "POST",
    { masterPasswordHash: "current-password" },
    deletionToken,
  )
  expect(deleted.status).toBe(200)
  expect(await deleted.text()).toBe("")
  for (const table of [
    "users",
    "devices",
    "users_organizations",
    "users_collections",
    "groups_users",
    "folders",
    "folders_ciphers",
    "invitations",
    "sso_users",
  ]) {
    expect(deletion.database.query(`SELECT COUNT(*) AS count FROM ${table}`).get()).toEqual({ count: 0 })
  }

  const owner = await contextCreate()
  const ownerToken = await passwordTokenCreate(owner.app)
  owner.database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    "owner-org",
    "Owner org",
    "owner@example.com",
  ])
  owner.database.run(
    "INSERT INTO users_organizations (uuid, user_uuid, org_uuid, akey, status, atype) VALUES (?, ?, ?, ?, ?, ?)",
    [
      "owner-membership",
      "task10-user",
      "owner-org",
      "owner-key",
      organizationMembershipStatus.confirmed,
      organizationMembershipType.owner,
    ],
  )
  await expectError(
    await requestJson(owner.app, "/api/accounts", "DELETE", { masterPasswordHash: "current-password" }, ownerToken),
    400,
    "Can't delete last owner",
  )
  expect(owner.database.query("SELECT COUNT(*) AS count FROM users WHERE uuid = ?").get("task10-user")).toEqual({
    count: 1,
  })
})

test("device list/get/update/clear-token and known-device aliases preserve ownership, casing, statuses, and persistence", async () => {
  const context = await contextCreate()
  const token = await passwordTokenCreate(context.app)
  await passwordTokenCreate(context.app, {
    device_identifier: "second-device",
    device_name: "Second device",
    device_type: "iOS",
  })
  const foreignUser = await userCreate({ uuid: "foreign-user", email: "foreign@example.com" })
  expect(identityUserSave(context.database, foreignUser).success).toBe(true)
  const authRequests = [
    authRequestCreate("task10-user", "older-pending", "task10-device", {
      creationDate: "2026-08-28T00:01:00.000Z",
    }),
    authRequestCreate("task10-user", "newest-pending", "task10-device", {
      creationDate: "2026-08-28T00:02:00.000Z",
    }),
    authRequestCreate("task10-user", "approved-request", "task10-device", {
      approved: true,
      creationDate: "2026-08-28T00:03:00.000Z",
    }),
    authRequestCreate("task10-user", "rejected-request", "task10-device", {
      approved: false,
      creationDate: "2026-08-28T00:04:00.000Z",
    }),
    authRequestCreate("task10-user", "other-device-request", "other-device", {
      creationDate: "2026-08-28T00:05:00.000Z",
    }),
    authRequestCreate("foreign-user", "other-user-request", "task10-device", {
      creationDate: "2026-08-28T00:06:00.000Z",
    }),
    authRequestCreate("task10-user", "deleted-request", "task10-device", {
      creationDate: "2026-08-28T00:07:00.000Z",
    }),
  ]
  for (const request of authRequests) {
    expect(identityAuthRequestSave(context.database, request)).toEqual({ success: true, data: undefined })
  }
  context.database.run("DELETE FROM auth_requests WHERE uuid = ?", ["deleted-request"])

  const devices = await context.app.request("https://vault.example/api/devices", { headers: authHeaders(token) })
  expect(await devices.json()).toEqual({
    data: [
      {
        id: "task10-device",
        name: "Task 10 device",
        type: 7,
        identifier: "task10-device",
        creationDate: "2026-08-28T00:00:00.000Z",
        devicePendingAuthRequest: {
          id: "newest-pending",
          creationDate: "2026-08-28T00:02:00.000Z",
        },
        isTrusted: false,
        encryptedPublicKey: null,
        encryptedUserKey: null,
        object: "device",
      },
      {
        id: "second-device",
        name: "Second device",
        type: 14,
        identifier: "second-device",
        creationDate: "2026-08-28T00:00:00.000Z",
        devicePendingAuthRequest: null,
        isTrusted: false,
        encryptedPublicKey: null,
        encryptedUserKey: null,
        object: "device",
      },
    ],
    continuationToken: null,
    object: "list",
  })
  expect(
    await (
      await context.app.request("https://vault.example/api/devices/identifier/task10-device", {
        headers: authHeaders(token),
      })
    ).json(),
  ).toEqual({
    id: "task10-device",
    name: "Task 10 device",
    type: 7,
    identifier: "task10-device",
    creationDate: "2026-08-28T00:00:00.000Z",
    isTrusted: false,
    object: "device",
  })
  expect(
    identityDeviceSave(context.database, deviceCreate("foreign-user", "foreign-device"), context.clock, false),
  ).toEqual({ success: true, data: undefined })
  await expectError(
    await context.app.request("https://vault.example/api/devices/identifier/foreign-device", {
      headers: authHeaders(token),
    }),
    400,
    "No device found",
  )

  const mismatchedPathUpdate = await requestJson(
    context.app,
    "/api/devices/identifier/second-device/token",
    "POST",
    { pushToken: "push-token" },
    token,
  )
  expect(mismatchedPathUpdate.status).toBe(200)
  expect(context.database.query("SELECT push_token FROM devices WHERE uuid = ?").get("task10-device")).toEqual({
    push_token: "push-token",
  })
  const putUpdate = await requestJson(
    context.app,
    "/api/devices/identifier/task10-device/token",
    "PUT",
    { pushToken: "push-token" },
    token,
  )
  expect(putUpdate.status).toBe(200)
  await expectValidationError(
    await requestJson(
      context.app,
      "/api/devices/identifier/task10-device/token",
      "PUT",
      { push_token: "wrong-casing" },
      token,
    ),
    {
      pushToken: ['Invalid key: Expected "pushToken" but received undefined'],
    },
  )

  const checked: string[] = []
  const clearApp = serverAppCreate({
    database: context.database,
    identity: {
      clock: context.clock,
      config: identityConfigCreate({ PASSWORD_ITERATIONS: 100_000 }),
      database: context.database,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      rateLimiter: {
        check: (key) => {
          checked.push(key)
          return resultCreate(undefined)
        },
      },
    },
  })
  expect(
    (
      await clearApp.request("https://vault.example/api/devices/identifier/task10-device/clear-token", {
        method: "POST",
        headers: { "x-real-ip": "192.0.2.55" },
      })
    ).status,
  ).toBe(200)
  expect(
    (
      await clearApp.request("https://vault.example/api/devices/identifier/task10-device/clear-token", {
        method: "PUT",
        headers: { "x-real-ip": "192.0.2.55" },
      })
    ).status,
  ).toBe(200)
  expect(context.database.query("SELECT push_token FROM devices WHERE uuid = ?").get("task10-device")).toEqual({
    push_token: null,
  })
  expect(checked).toEqual(["192.0.2.55", "192.0.2.55"])

  const email = base64UrlEncode(new TextEncoder().encode("task10@example.com"))
  expect(
    await (
      await context.app.request("https://vault.example/api/devices/knowndevice", {
        headers: { "X-Request-Email": `${email}==`, "X-Device-Identifier": "task10-device" },
      })
    ).json(),
  ).toBe(true)
  expect(
    await (
      await context.app.request("https://vault.example/api/devices/knowndevice", {
        headers: { "X-Request-Email": email, "X-Device-Identifier": "missing" },
      })
    ).json(),
  ).toBe(false)
  await expectError(
    await context.app.request("https://vault.example/api/devices/knowndevice"),
    400,
    "X-Request-Email value is required",
  )
  await expectError(
    await context.app.request("https://vault.example/api/devices/knowndevice", {
      headers: { "X-Request-Email": "%%%", "X-Device-Identifier": "task10-device" },
    }),
    400,
    "X-Request-Email value failed to decode as base64url",
  )
  await expectError(
    await context.app.request("https://vault.example/api/devices/knowndevice", {
      headers: { "X-Request-Email": "_w", "X-Device-Identifier": "task10-device" },
    }),
    400,
    "X-Request-Email value failed to decode as UTF-8",
  )
  await expectError(
    await context.app.request("https://vault.example/api/devices/knowndevice", {
      headers: { "X-Request-Email": email },
    }),
    400,
    "X-Device-Identifier value is required",
  )
})

test("device persistence and clear-token are isolated by the documented composite/user behavior", async () => {
  const context = await contextCreate()
  const foreign = await userCreate({ uuid: "foreign-user", email: "foreign@example.com" })
  expect(identityUserSave(context.database, foreign).success).toBe(true)
  expect(
    identityDeviceSave(
      context.database,
      deviceCreate("foreign-user", "shared-device"),
      clockTestCreate("2026-08-28T00:00:00.000Z"),
      false,
    ),
  ).toEqual({ success: true, data: undefined })
  expect(
    identityDeviceSave(
      context.database,
      deviceCreate("task10-user", "shared-device"),
      clockTestCreate("2026-08-28T00:00:00.000Z"),
      false,
    ),
  ).toEqual({ success: true, data: undefined })
  expect(context.database.query("SELECT COUNT(*) AS count FROM devices WHERE uuid = ?").get("shared-device")).toEqual({
    count: 2,
  })
})
