import { afterEach, expect, test } from "bun:test"
import * as v from "valibot"
import { identityConfigCreate } from "../../src/server/contexts/identity/identityConfigCreate.js"
import type { IdentityMailAdapter } from "../../src/server/contexts/identity/identityMailAdapter.js"
import { identityPasswordTokenResponseSchema } from "../../src/server/contexts/identity/identityPasswordTokenResponseSchema.js"
import { identityUserSave } from "../../src/server/contexts/identity/identityUserSave.js"
import type { IdentityUser } from "../../src/server/contexts/identity/identityUser.js"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { clockTestCreate } from "../../src/shared/clock/clockTestCreate.js"
import { databaseClose } from "../../src/server/database/databaseClose.js"
import type { DatabaseConnection } from "../../src/server/database/database.js"
import { databaseTestCreate } from "../../src/server/database/databaseTestCreate.js"
import { passwordHashCreate } from "../../src/shared/crypto/passwordHashCreate.js"
import { resultCreate } from "../../src/shared/result/resultCreate.js"
import { rsaKeyPairGenerate } from "../../src/shared/crypto/rsaKeyPairGenerate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const databases: DatabaseConnection[] = []

const mail: IdentityMailAdapter = {
  sendRegisterVerifyEmail: async () => resultCreate(undefined),
  sendWelcome: async () => resultCreate(undefined),
  sendWelcomeMustVerify: async () => resultCreate(undefined),
}

async function compatibilityAppCreate(): Promise<{
  app: ReturnType<typeof serverAppCreate>
  database: DatabaseConnection
}> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  databases.push(databaseResult.data)
  const salt = Uint8Array.from({ length: 64 }, (_, index) => index + 1)
  const passwordHashResult = await passwordHashCreate("client-password-hash", salt, 100_000)
  if (!passwordHashResult.success) throw new Error(passwordHashResult.errorMessage)
  const user: IdentityUser = {
    uuid: "compatibility-user",
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: "2026-08-27T00:00:00.000Z",
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "compatibility@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Compatibility User",
    passwordHash: passwordHashResult.data,
    salt,
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "akey",
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
    apiKey: null,
    avatarColor: null,
    externalId: null,
  }
  const saveResult = identityUserSave(databaseResult.data, user)
  if (!saveResult.success) throw new Error(saveResult.errorMessage)
  return {
    app: serverAppCreate({
      clock: clockTestCreate("2026-08-28T00:00:00.000Z"),
      database: databaseResult.data,
      identity: {
        config: identityConfigCreate({ PASSWORD_ITERATIONS: 100_000 }),
        database: databaseResult.data,
        identifier: { uuid: () => "compatibility-push" },
        mail,
        privateKey: keyPair.privateKey,
        publicKey: keyPair.publicKey,
        publicOrigin: "https://vault.example/",
        rateLimiter: { check: () => resultCreate(undefined) },
      },
    }),
    database: databaseResult.data,
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

test("connect/token remains compatible with Bitwarden form aliases and response casing", async () => {
  const context = await compatibilityAppCreate()
  const response = await requestForm(context.app, {
    GRANTTYPE: "password",
    CLIENTID: "web",
    PASSWORD: "client-password-hash",
    SCOPE: "api offline_access",
    USERNAME: "COMPATIBILITY@EXAMPLE.COM",
    DEVICEIDENTIFIER: "compatibility-device",
    DEVICENAME: "Compatibility Browser",
    DEVICETYPE: "9",
  })

  expect(response.status).toBe(200)
  expect(response.headers.get("content-type")).toBe("application/json")
  const body: unknown = await response.json()
  const result = v.safeParse(identityPasswordTokenResponseSchema, body)
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(Object.keys(result.output).sort()).toEqual([
    "AccountKeys",
    "ForcePasswordReset",
    "Kdf",
    "KdfIterations",
    "KdfMemory",
    "KdfParallelism",
    "Key",
    "MasterPasswordPolicy",
    "PrivateKey",
    "ResetMasterPassword",
    "UserDecryptionOptions",
    "access_token",
    "expires_in",
    "refresh_token",
    "scope",
    "token_type",
  ])
  expect(result.output).toMatchObject({
    AccountKeys: null,
    PrivateKey: null,
    UserDecryptionOptions: {
      HasMasterPassword: true,
      MasterPasswordUnlock: {
        MasterKeyEncryptedUserKey: "akey",
        MasterKeyWrappedUserKey: "akey",
        Salt: "compatibility@example.com",
      },
      Object: "userDecryptionOptions",
    },
    token_type: "Bearer",
    scope: "api offline_access",
  })
  expect(context.database.query("SELECT name, atype FROM devices WHERE uuid = ?").get("compatibility-device")).toEqual({
    name: "Compatibility Browser",
    atype: 9,
  })
})

test("connect/token preserves exact missing-field and invalid-type errors", async () => {
  const context = await compatibilityAppCreate()
  const missingClient = await requestForm(context.app, { grant_type: "password" })
  expect(missingClient.status).toBe(400)
  expect(await missingClient.json()).toMatchObject({ message: "client_id cannot be blank" })

  const invalidType = await requestForm(context.app, { grant_type: "unsupported" })
  expect(invalidType.status).toBe(400)
  expect(await invalidType.json()).toMatchObject({ message: "Invalid type" })
})
