import { afterEach, expect, test } from "bun:test"
import * as v from "valibot"
import { identityAccessTokenClaimsDecode } from "../../src/server/contexts/identity/identityAccessTokenClaimsDecode.js"
import { identityApiKeyTokenResponseSchema } from "../../src/server/contexts/identity/identityApiKeyTokenResponseSchema.js"
import { identityConfigCreate } from "../../src/server/contexts/identity/identityConfigCreate.js"
import { identityOrganizationApiKeyAccessTokenClaimsDecode } from "../../src/server/contexts/identity/identityOrganizationApiKeyAccessTokenClaimsDecode.js"
import { identityOrganizationApiKeySave } from "../../src/server/contexts/identity/identityOrganizationApiKeySave.js"
import { identityOrganizationApiKeyTokenResponseSchema } from "../../src/server/contexts/identity/identityOrganizationApiKeyTokenResponseSchema.js"
import type { IdentityUser } from "../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../src/server/contexts/identity/identityUserSave.js"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { databaseClose } from "../../src/server/database/databaseClose.js"
import type { DatabaseConnection } from "../../src/server/database/database.js"
import { databaseTestCreate } from "../../src/server/database/databaseTestCreate.js"
import { clockTestCreate } from "../../src/shared/clock/clockTestCreate.js"
import { rsaKeyPairGenerate } from "../../src/shared/crypto/rsaKeyPairGenerate.js"
import { resultCreate } from "../../src/shared/result/resultCreate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const databases: DatabaseConnection[] = []

function userCreate(): IdentityUser {
  return {
    uuid: "compatibility-user",
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: "2026-08-28T00:00:00.000Z",
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "compatibility@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Compatibility User",
    passwordHash: new Uint8Array([1]),
    salt: new Uint8Array([2]),
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "compatibility-key",
    privateKey: null,
    publicKey: null,
    securityStamp: "compatibility-stamp",
    stampException: null,
    equivalentDomains: "[]",
    excludedGlobals: "[]",
    clientKdfType: 0,
    clientKdfIter: 600_000,
    clientKdfMemory: null,
    clientKdfParallelism: null,
    apiKey: "compatibility-api-key",
    avatarColor: null,
    externalId: null,
  }
}

async function compatibilityAppCreate(): Promise<{
  app: ReturnType<typeof serverAppCreate>
  database: DatabaseConnection
}> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  const saveResult = identityUserSave(database, userCreate())
  if (!saveResult.success) throw new Error(saveResult.errorMessage)
  return {
    app: serverAppCreate({
      clock: clockTestCreate("2026-08-28T00:00:00.000Z"),
      database,
      identity: {
        config: identityConfigCreate({ PASSWORD_ITERATIONS: 100_000 }),
        database,
        identifier: { uuid: () => "compatibility-device-token" },
        mail: {
          sendRegisterVerifyEmail: async () => resultCreate(undefined),
          sendWelcome: async () => resultCreate(undefined),
          sendWelcomeMustVerify: async () => resultCreate(undefined),
        },
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        publicOrigin: "https://vault.example/",
        rateLimiter: { check: () => resultCreate(undefined) },
      },
    }),
    database,
  }
}

async function requestForm(app: ReturnType<typeof serverAppCreate>, values: Record<string, string>): Promise<Response> {
  return app.request("https://vault.example/identity/connect/token", {
    body: new URLSearchParams(values).toString(),
    headers: { "content-type": "application/x-www-form-urlencoded" },
    method: "POST",
  })
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("Bitwarden personal API-key aliases preserve response casing, omission, and access claims", async () => {
  const context = await compatibilityAppCreate()
  const response = await requestForm(context.app, {
    GRANTTYPE: "client_credentials",
    CLIENTID: "user.compatibility-user",
    CLIENTSECRET: "compatibility-api-key",
    SCOPE: "api",
    DEVICEIDENTIFIER: "compatibility-device",
    DEVICENAME: "Compatibility CLI",
    DEVICETYPE: "14",
  })
  expect(response.status).toBe(200)
  expect(response.headers.get("content-type")).toBe("application/json")
  const parsed = v.safeParse(identityApiKeyTokenResponseSchema, await response.json())
  expect(parsed.success).toBe(true)
  if (!parsed.success) return
  expect(Object.keys(parsed.output).sort()).toEqual([
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
  expect(parsed.output).toMatchObject({
    Key: "compatibility-key",
    PrivateKey: null,
    scope: "api",
    token_type: "Bearer",
    UserDecryptionOptions: {
      HasMasterPassword: true,
      MasterPasswordUnlock: {
        MasterKeyEncryptedUserKey: "compatibility-key",
        MasterKeyWrappedUserKey: "compatibility-key",
        Salt: "compatibility@example.com",
      },
    },
  })
  expect(
    await identityAccessTokenClaimsDecode(
      parsed.output.access_token,
      keyPair.publicKey,
      "https://vault.example",
      clockTestCreate("2026-08-28T00:00:00.000Z"),
    ),
  ).toMatchObject({ success: true, data: { client_id: "user.compatibility-user", scope: ["api"] } })
})

test("Bitwarden organization API-key responses and invalid grant errors retain exact protocol casing", async () => {
  const context = await compatibilityAppCreate()
  expect(
    identityOrganizationApiKeySave(context.database, {
      uuid: "compatibility-org-key",
      organizationUuid: "compatibility-org",
      type: 0,
      apiKey: "compatibility-org-secret",
      revisionDate: "2026-08-28T00:00:00.000Z",
    }),
  ).toMatchObject({ success: true })
  const response = await requestForm(context.app, {
    grant_type: "client_credentials",
    client_id: "organization.compatibility-org",
    client_secret: "compatibility-org-secret",
    scope: "api.organization",
    device_identifier: "ignored",
    device_name: "ignored",
    device_type: "7",
  })
  expect(response.status).toBe(200)
  expect(response.headers.get("content-type")).toBe("application/json")
  const parsed = v.safeParse(identityOrganizationApiKeyTokenResponseSchema, await response.json())
  expect(parsed.success).toBe(true)
  if (!parsed.success) return
  expect(parsed.output).toEqual({
    access_token: expect.any(String),
    expires_in: 3_600,
    token_type: "Bearer",
    scope: "api.organization",
  })
  expect(
    await identityOrganizationApiKeyAccessTokenClaimsDecode(
      parsed.output.access_token,
      keyPair.publicKey,
      "https://vault.example",
      clockTestCreate("2026-08-28T00:00:00.000Z"),
    ),
  ).toMatchObject({
    success: true,
    data: {
      iss: "https://vault.example|api.organization",
      sub: "compatibility-org-key",
      client_id: "organization.compatibility-org",
      client_sub: "compatibility-org",
      scope: ["api.organization"],
    },
  })

  const missingClient = await requestForm(context.app, { grant_type: "client_credentials", scope: "api" })
  expect(missingClient.status).toBe(400)
  expect(missingClient.headers.get("content-type")).toBe("application/json; charset=UTF-8")
  expect(await missingClient.json()).toMatchObject({
    message: "client_id cannot be blank",
    validationErrors: { "": ["client_id cannot be blank"] },
    errorModel: { message: "client_id cannot be blank", object: "error" },
    error: "",
    error_description: "",
    object: "error",
  })
  const wrongSecret = await requestForm(context.app, {
    grant_type: "client_credentials",
    client_id: "organization.compatibility-org",
    client_secret: "wrong",
    scope: "api.organization",
    device_identifier: "ignored",
    device_name: "ignored",
    device_type: "7",
  })
  expect(wrongSecret.status).toBe(400)
  expect(await wrongSecret.json()).toMatchObject({ message: "Incorrect client_secret" })
})

test("authorization-code requests stay unavailable when SSO is disabled", async () => {
  const context = await compatibilityAppCreate()
  const response = await requestForm(context.app, {
    grant_type: "authorization_code",
    client_id: "web",
    code: "code",
    code_verifier: "verifier",
    device_identifier: "device",
    device_name: "Device",
    device_type: "7",
  })
  expect(response.status).toBe(400)
  expect(await response.json()).toMatchObject({ message: "SSO sign-in is not available" })
  const prevalidate = await context.app.request("https://vault.example/identity/sso/prevalidate")
  expect(prevalidate.status).toBe(400)
  expect(await prevalidate.json()).toMatchObject({ message: "SSO sign-in is not available" })
})
