import { afterEach, expect, test } from "bun:test"
import * as v from "valibot"
import { identityAccessTokenClaimsDecode } from "../../src/server/contexts/identity/identityAccessTokenClaimsDecode.js"
import { identityApiKeyTokenResponseSchema } from "../../src/server/contexts/identity/identityApiKeyTokenResponseSchema.js"
import { identityConfigCreate } from "../../src/server/contexts/identity/identityConfigCreate.js"
import { identityOrganizationApiKeyAccessTokenClaimsDecode } from "../../src/server/contexts/identity/identityOrganizationApiKeyAccessTokenClaimsDecode.js"
import { identityOrganizationApiKeySave } from "../../src/server/contexts/identity/identityOrganizationApiKeySave.js"
import { identityOrganizationApiKeyTokenResponseSchema } from "../../src/server/contexts/identity/identityOrganizationApiKeyTokenResponseSchema.js"
import { identityUserSave } from "../../src/server/contexts/identity/identityUserSave.js"
import type { IdentityUser } from "../../src/server/contexts/identity/identityUser.js"
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

async function contextCreate(): Promise<{ app: ReturnType<typeof serverAppCreate>; database: DatabaseConnection }> {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  const database = result.data
  databases.push(database)
  const saveResult = identityUserSave(database, userCreate())
  if (!saveResult.success) throw new Error(saveResult.errorMessage)
  return {
    database,
    app: serverAppCreate({
      clock: clockTestCreate("2026-08-28T00:00:00.000Z"),
      database,
      identity: {
        config: identityConfigCreate({ PASSWORD_ITERATIONS: 100_000 }),
        database,
        identifier: { uuid: () => "compatibility-device" },
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
    }),
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

test("personal and organization API-key grants preserve compatibility contracts", async () => {
  const context = await contextCreate()
  const personal = await requestForm(context.app, {
    grant_type: "client_credentials",
    client_id: "user.compatibility-user",
    client_secret: "compatibility-api-key",
    scope: "api",
    device_identifier: "compatibility-device",
    device_name: "Compatibility CLI",
    device_type: "14",
  })
  expect(personal.status).toBe(200)
  const personalBody = v.parse(identityApiKeyTokenResponseSchema, await personal.json())
  expect(personalBody.scope).toBe("api")
  expect(
    await identityAccessTokenClaimsDecode(
      personalBody.access_token,
      keyPair.publicKey,
      "https://vault.example",
      clockTestCreate("2026-08-28T00:00:00.000Z"),
    ),
  ).toMatchObject({ success: true, data: { scope: ["api"] } })

  expect(
    identityOrganizationApiKeySave(context.database, {
      uuid: "organization-key",
      organizationUuid: "organization",
      type: 0,
      apiKey: "organization-secret",
      revisionDate: "2026-08-28T00:00:00.000Z",
    }),
  ).toMatchObject({ success: true })
  const organization = await requestForm(context.app, {
    grant_type: "client_credentials",
    client_id: "organization.organization",
    client_secret: "organization-secret",
    scope: "api.organization",
    device_identifier: "ignored",
    device_name: "ignored",
    device_type: "7",
  })
  const organizationBody = v.parse(identityOrganizationApiKeyTokenResponseSchema, await organization.clone().json())
  expect(organizationBody.scope).toBe("api.organization")
  expect(organization.status).toBe(200)
  expect(
    await identityOrganizationApiKeyAccessTokenClaimsDecode(
      organizationBody.access_token,
      keyPair.publicKey,
      "https://vault.example",
      clockTestCreate("2026-08-28T00:00:00.000Z"),
    ),
  ).toBeDefined()
})
