import { afterEach, expect, test } from "bun:test"
import { Hono } from "hono"
import type { IdentityDevice } from "../../src/server/contexts/identity/identityDevice.js"
import { identityDeviceSave } from "../../src/server/contexts/identity/identityDeviceSave.js"
import { identityConfigCreate } from "../../src/server/contexts/identity/identityConfigCreate.js"
import { identityTokenBundleCreate } from "../../src/server/contexts/identity/identityTokenBundleCreate.js"
import type { IdentityUser } from "../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../src/server/contexts/identity/identityUserSave.js"
import { authenticationClientVersionMiddleware } from "../../src/server/contexts/authentication/authenticationClientVersionMiddleware.js"
import { authenticationMiddleware } from "../../src/server/contexts/authentication/authenticationMiddleware.js"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { databaseClose } from "../../src/server/database/databaseClose.js"
import type { DatabaseConnection } from "../../src/server/database/database.js"
import { databaseTestCreate } from "../../src/server/database/databaseTestCreate.js"
import { clockTestCreate } from "../../src/shared/clock/clockTestCreate.js"
import { rsaKeyPairGenerate } from "../../src/shared/crypto/rsaKeyPairGenerate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const databases: DatabaseConnection[] = []

function userCreate(): IdentityUser {
  return {
    uuid: "compatibility-auth-user",
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: "2026-08-28T00:00:00.000Z",
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "compatibility-auth@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Compatibility Auth User",
    passwordHash: new Uint8Array([1]),
    salt: new Uint8Array([2]),
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "akey",
    privateKey: null,
    publicKey: null,
    securityStamp: "compatibility-auth-stamp",
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

function deviceCreate(userUuid: string): IdentityDevice {
  return {
    uuid: "compatibility-auth-device",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    userUuid,
    name: "Compatibility Device",
    type: 7,
    pushUuid: null,
    pushToken: null,
    refreshToken: "refresh-secret",
    twoFactorRemember: null,
  }
}

async function compatibilityContextCreate(): Promise<{
  app: ReturnType<typeof serverAppCreate>
  database: DatabaseConnection
  token: string
}> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  const user = userCreate()
  const device = deviceCreate(user.uuid)
  expect(identityUserSave(database, user).success).toBe(true)
  expect(identityDeviceSave(database, device, clockTestCreate("2026-08-28T00:00:00.000Z"), false).success).toBe(true)
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const bundleResult = await identityTokenBundleCreate(
    user,
    device,
    "compatibility-client",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    identityConfigCreate(),
  )
  if (!bundleResult.success) throw new Error(bundleResult.errorMessage)
  const app = serverAppCreate({
    clock,
    database,
    identity: {
      clock,
      config: identityConfigCreate(),
      database,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
    },
  })
  app.get(
    "/api/compatibility-protected",
    authenticationMiddleware({
      clock,
      database,
      issuer: "https://vault.example",
      publicKey: keyPair.publicKey,
      routeName: "compatibility.protected",
    }),
    (context) => {
      const authentication = context.get("authentication")
      return context.json({
        deviceUuid: authentication?.device.uuid,
        userUuid: authentication?.user.uuid,
      })
    },
  )
  return { app, database, token: bundleResult.data.accessToken }
}

async function expectError(response: Response, message: string): Promise<void> {
  expect(response.status).toBe(401)
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

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("authentication compatibility preserves bearer-token success and exact unauthorized envelopes", async () => {
  const context = await compatibilityContextCreate()
  const valid = await context.app.request("https://vault.example/api/compatibility-protected", {
    headers: { authorization: `Bearer ${context.token}` },
  })
  expect(valid.status).toBe(200)
  expect(await valid.json()).toEqual({
    deviceUuid: "compatibility-auth-device",
    userUuid: "compatibility-auth-user",
  })
  await expectError(
    await context.app.request("https://vault.example/api/compatibility-protected"),
    "No access token provided",
  )
  await expectError(
    await context.app.request("https://vault.example/api/compatibility-protected", {
      headers: { authorization: "Bearer malformed" },
    }),
    "Invalid claim",
  )
})

test("client-version compatibility keeps required-header status and SemVer context exact", async () => {
  const app = new Hono()
  app.get("/api/version", authenticationClientVersionMiddleware(), (context) =>
    context.json(context.get("clientVersion")),
  )
  await expectError(await app.request("http://localhost/api/version"), "No Bitwarden-Client-Version header provided")
  const response = await app.request("http://localhost/api/version", {
    headers: { "Bitwarden-Client-Version": "2024.12.0" },
  })
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    build: [],
    major: 2024,
    minor: 12,
    patch: 0,
    preRelease: [],
    raw: "2024.12.0",
  })
})
