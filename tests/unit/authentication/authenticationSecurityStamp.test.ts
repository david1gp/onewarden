import { afterEach, expect, test } from "bun:test"
import type { Clock } from "../../../src/shared/clock/clock.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { authenticationSecurityStampExceptionCreate } from "../../../src/server/contexts/authentication/authenticationSecurityStampExceptionCreate.js"
import { authenticationSecurityStampExceptionParse } from "../../../src/server/contexts/authentication/authenticationSecurityStampExceptionParse.js"
import { authenticationSecurityStampExceptionSet } from "../../../src/server/contexts/authentication/authenticationSecurityStampExceptionSet.js"
import { authenticationSecurityStampValidate } from "../../../src/server/contexts/authentication/authenticationSecurityStampValidate.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserFindByUuid } from "../../../src/server/contexts/identity/identityUserFindByUuid.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"

type MutableClock = Clock & { advance: (seconds: number) => void }

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

function userCreate(): IdentityUser {
  return {
    uuid: "stamp-user",
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: null,
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "stamp-user@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Stamp User",
    passwordHash: new Uint8Array([1]),
    salt: new Uint8Array([2]),
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "akey",
    privateKey: null,
    publicKey: null,
    securityStamp: "current-stamp",
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

function databaseCreate(): DatabaseConnection {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  databases.push(result.data)
  return result.data
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("security stamp exceptions serialize, parse, and preserve exact route and stamp values", () => {
  const user = userCreate()
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const exception = authenticationSecurityStampExceptionCreate(user, ["accounts.password", "accounts.kdf"], clock)
  expect(exception).toEqual({
    expire: 1_787_875_320,
    routes: ["accounts.password", "accounts.kdf"],
    security_stamp: "current-stamp",
  })

  authenticationSecurityStampExceptionSet(user, exception.routes, clock)
  expect(authenticationSecurityStampExceptionParse(user.stampException)).toEqual({ success: true, data: exception })
  expect(authenticationSecurityStampExceptionParse(null)).toMatchObject({
    success: false,
    errorMessage: "Security stamp exception is invalid.",
  })
  expect(authenticationSecurityStampExceptionParse("not-json")).toMatchObject({
    success: false,
    errorMessage: "Security stamp exception is invalid.",
  })
  expect(
    authenticationSecurityStampExceptionParse(JSON.stringify({ expire: 1, routes: [], security_stamp: 2 })),
  ).toMatchObject({
    success: false,
    errorMessage: "Security stamp exception is invalid.",
  })
})

test("matching security stamps bypass malformed exceptions and mismatches reject with exact guard errors", () => {
  const database = databaseCreate()
  const user = userCreate()
  expect(identityUserSave(database, user).success).toBe(true)
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")

  user.stampException = "malformed"
  expect(authenticationSecurityStampValidate(user, "current-stamp", undefined, database, clock)).toEqual({
    success: true,
    data: undefined,
  })
  expect(authenticationSecurityStampValidate(user, "old-stamp", "accounts.password", database, clock)).toMatchObject({
    success: false,
    op: "authenticationSecurityStampValidate",
    errorMessage: "Invalid security stamp",
    code: "platform.unauthorized",
    statusCode: 401,
  })
})

test("security stamp exceptions require a route, exact token stamp, and an unexpired exception", () => {
  const database = databaseCreate()
  const user = userCreate()
  const clock = mutableClockCreate("2026-08-28T00:00:00.000Z")
  expect(identityUserSave(database, user).success).toBe(true)
  authenticationSecurityStampExceptionSet(user, ["accounts.password", "accounts.kdf"], clock)

  expect(authenticationSecurityStampValidate(user, "old-stamp", undefined, database, clock)).toMatchObject({
    success: false,
    errorMessage: "Error getting current route for stamp exception",
  })
  expect(authenticationSecurityStampValidate(user, "old-stamp", "accounts.profile", database, clock)).toMatchObject({
    success: false,
    errorMessage: "Invalid security stamp: Current route and exception route do not match",
  })
  expect(authenticationSecurityStampValidate(user, "old-stamp", "accounts.password", database, clock)).toMatchObject({
    success: false,
    errorMessage: "Invalid security stamp for matched stamp exception",
  })

  user.stampException = JSON.stringify({
    ...authenticationSecurityStampExceptionCreate(user, ["accounts.password"], clock),
    security_stamp: "old-stamp",
  })
  expect(authenticationSecurityStampValidate(user, "old-stamp", "accounts.password", database, clock)).toEqual({
    success: true,
    data: undefined,
  })
  clock.advance(120)
  expect(authenticationSecurityStampValidate(user, "old-stamp", "accounts.password", database, clock)).toEqual({
    success: true,
    data: undefined,
  })
  clock.advance(1)
  expect(authenticationSecurityStampValidate(user, "old-stamp", "accounts.password", database, clock)).toMatchObject({
    success: false,
    errorMessage: "Stamp exception is expired",
  })
  expect(user.stampException).toBeNull()
  expect(identityUserFindByUuid(database, user.uuid)).toMatchObject({ success: true, data: { stampException: null } })
})
