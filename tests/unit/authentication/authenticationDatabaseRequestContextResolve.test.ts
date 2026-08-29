import { expect, test } from "bun:test"
import type { Context } from "hono"
import type { AuthenticationContext } from "../../../src/server/contexts/authentication/authenticationContext.js"
import { authenticationDatabaseRequestContextResolve } from "../../../src/server/contexts/authentication/authenticationDatabaseRequestContextResolve.js"
import type { AuthenticationEnvironment } from "../../../src/server/contexts/authentication/authenticationEnvironment.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { apiErrorCreate } from "../../../src/shared/api/apiErrorCreate.js"

type ContextValues = {
  authentication?: AuthenticationContext
  database?: DatabaseConnection
}

const database = Symbol("database") as unknown as DatabaseConnection
const overrideDatabase = Symbol("overrideDatabase") as unknown as DatabaseConnection

function contextCreate(values: ContextValues): Context<AuthenticationEnvironment> {
  return {
    get: (key: "authentication" | "database") => values[key],
  } as unknown as Context<AuthenticationEnvironment>
}

function authenticationCreate(): AuthenticationContext {
  return {
    accessToken: "access-token",
    claims: {
      nbf: 1,
      exp: 2,
      iss: "https://example.test",
      sub: "user-uuid",
      premium: false,
      name: "Test User",
      email: "user@example.test",
      email_verified: true,
      sstamp: "stamp",
      device: "device-uuid",
      devicetype: "browser",
      client_id: "client",
      scope: ["api"],
      amr: ["pwd"],
    },
    device: {
      uuid: "device-uuid",
      createdAt: "2026-08-29T00:00:00.000Z",
      updatedAt: "2026-08-29T00:00:00.000Z",
      userUuid: "user-uuid",
      name: "Test Device",
      type: 10,
      pushUuid: null,
      pushToken: null,
      refreshToken: "refresh-token",
      twoFactorRemember: null,
    },
    host: "example.test",
    ip: "127.0.0.1",
    user: {
      uuid: "user-uuid",
      enabled: true,
      createdAt: "2026-08-29T00:00:00.000Z",
      updatedAt: "2026-08-29T00:00:00.000Z",
      verifiedAt: null,
      lastVerifyingAt: null,
      loginVerifyCount: 0,
      email: "user@example.test",
      emailNew: null,
      emailNewToken: null,
      name: "Test User",
      passwordHash: new Uint8Array(),
      salt: new Uint8Array(),
      passwordIterations: 100_000,
      passwordHint: null,
      akey: "akey",
      privateKey: null,
      publicKey: null,
      securityStamp: "stamp",
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
    },
  }
}

function resolveOptions(databaseOverride: DatabaseConnection | undefined) {
  return {
    authenticationErrorCreate: () =>
      apiErrorCreate("testAuthentication", "platform.unauthorized", "Authentication is required.", {
        source: ["test"],
      }),
    databaseErrorCreate: () => apiErrorCreate("testDatabase", "platform.internal", "Database unavailable."),
    databaseOverride,
  }
}

test("returns the caller's authentication error when authentication is missing", () => {
  const result = authenticationDatabaseRequestContextResolve(contextCreate({ database }), resolveOptions(undefined))

  expect(result).toEqual({
    success: false,
    op: "testAuthentication",
    errorMessage: "Authentication is required.",
    code: "platform.unauthorized",
    errorData: JSON.stringify({ source: ["test"] }),
    statusCode: 401,
  })
})

test("returns the caller's database error when the database is missing", () => {
  const result = authenticationDatabaseRequestContextResolve(
    contextCreate({ authentication: authenticationCreate() }),
    resolveOptions(undefined),
  )

  expect(result).toEqual({
    success: false,
    op: "testDatabase",
    errorMessage: "Database unavailable.",
    code: "platform.internal",
    statusCode: 500,
  })
})

test("prefers the database override over the context database", () => {
  const authentication = authenticationCreate()
  const result = authenticationDatabaseRequestContextResolve(
    contextCreate({ authentication, database }),
    resolveOptions(overrideDatabase),
  )

  expect(result).toEqual({ success: true, data: { authentication, database: overrideDatabase } })
})

test("returns the full authentication context and resolved database", () => {
  const authentication = authenticationCreate()
  const result = authenticationDatabaseRequestContextResolve(
    contextCreate({ authentication, database }),
    resolveOptions(undefined),
  )

  expect(result).toEqual({ success: true, data: { authentication, database } })
})
