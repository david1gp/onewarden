import { afterEach, expect, test } from "bun:test"
import { authenticationTrustedDeviceCreate } from "../../../src/server/contexts/authentication/authenticationTrustedDeviceCreate.js"
import { authenticationTrustedDeviceValidate } from "../../../src/server/contexts/authentication/authenticationTrustedDeviceValidate.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"
import { identityDeviceFindByUuidAndUser } from "../../../src/server/contexts/identity/identityDeviceFindByUuidAndUser.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import type { Clock } from "../../../src/shared/clock/clock.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
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

function userCreate(): IdentityUser {
  return {
    uuid: "trusted-user",
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: null,
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "trusted-user@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Trusted User",
    passwordHash: new Uint8Array([1]),
    salt: new Uint8Array([2]),
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "akey",
    privateKey: null,
    publicKey: null,
    securityStamp: "trusted-stamp",
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

function deviceCreate(uuid = "trusted-device", userUuid = "trusted-user"): IdentityDevice {
  return {
    uuid,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    userUuid,
    name: "Trusted Device",
    type: 7,
    pushUuid: null,
    pushToken: null,
    refreshToken: "refresh-secret",
    twoFactorRemember: null,
  }
}

function databaseCreate(): DatabaseConnection {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  databases.push(result.data)
  expect(identityUserSave(result.data, userCreate()).success).toBe(true)
  return result.data
}

function trustedDeviceOptions(database: DatabaseConnection, clock: Clock, overrides: Record<string, unknown> = {}) {
  return {
    clock,
    database,
    issuer: "https://vault.example",
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    ...overrides,
  }
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("trusted-device creation signs a 30-day token, persists it, and validates it repeatedly", async () => {
  const database = databaseCreate()
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const device = deviceCreate()

  const createResult = await authenticationTrustedDeviceCreate(device, trustedDeviceOptions(database, clock))
  expect(createResult.success).toBe(true)
  if (!createResult.success) return
  const storedToken = device.twoFactorRemember
  if (storedToken === null) return
  expect(createResult.data).toBe(storedToken)
  expect(typeof createResult.data).toBe("string")
  expect(identityDeviceSave(database, device, clock, false).success).toBe(true)

  const firstValidation = await authenticationTrustedDeviceValidate(
    device,
    createResult.data,
    trustedDeviceOptions(database, clock),
  )
  const secondValidation = await authenticationTrustedDeviceValidate(
    device,
    createResult.data,
    trustedDeviceOptions(database, clock),
  )
  expect(firstValidation).toEqual({ success: true, data: true })
  expect(secondValidation).toEqual({ success: true, data: true })
  expect(device.twoFactorRemember).toBe(createResult.data)
  expect(identityDeviceFindByUuidAndUser(database, device.uuid, device.userUuid)).toMatchObject({
    success: true,
    data: { twoFactorRemember: createResult.data },
  })
})

test("trusted-device validation clears missing, disabled, wrong, mismatched, and expired tokens", async () => {
  const database = databaseCreate()
  const clock = mutableClockCreate("2026-08-28T00:00:00.000Z")
  const device = deviceCreate()
  const otherDevice = deviceCreate("other-device")
  expect((await authenticationTrustedDeviceCreate(device, trustedDeviceOptions(database, clock))).success).toBe(true)
  expect(identityDeviceSave(database, device, clock, false).success).toBe(true)
  const missing = await authenticationTrustedDeviceValidate(device, undefined, trustedDeviceOptions(database, clock))
  expect(missing).toEqual({ success: true, data: false })
  expect(device.twoFactorRemember).toBeNull()

  expect((await authenticationTrustedDeviceCreate(device, trustedDeviceOptions(database, clock))).success).toBe(true)
  const disabledToken = device.twoFactorRemember
  if (disabledToken === null) return
  const disabled = await authenticationTrustedDeviceValidate(
    device,
    disabledToken,
    trustedDeviceOptions(database, clock, { disabled: true }),
  )
  expect(disabled).toEqual({ success: true, data: false })
  expect(device.twoFactorRemember).toBeNull()

  expect((await authenticationTrustedDeviceCreate(device, trustedDeviceOptions(database, clock))).success).toBe(true)
  const wrongToken = device.twoFactorRemember
  if (wrongToken === null) return
  const wrong = await authenticationTrustedDeviceValidate(
    device,
    `${wrongToken}wrong`,
    trustedDeviceOptions(database, clock),
  )
  expect(wrong).toEqual({ success: true, data: false })
  expect(device.twoFactorRemember).toBeNull()

  expect((await authenticationTrustedDeviceCreate(device, trustedDeviceOptions(database, clock))).success).toBe(true)
  const mismatchedTokenResult = await authenticationTrustedDeviceCreate(
    otherDevice,
    trustedDeviceOptions(database, clock, { privateKey: keyPair.privateKey }),
  )
  expect(mismatchedTokenResult.success).toBe(true)
  if (!mismatchedTokenResult.success) return
  device.twoFactorRemember = mismatchedTokenResult.data
  const mismatched = await authenticationTrustedDeviceValidate(
    device,
    mismatchedTokenResult.data,
    trustedDeviceOptions(database, clock),
  )
  expect(mismatched).toEqual({ success: true, data: false })
  expect(device.twoFactorRemember).toBeNull()

  expect((await authenticationTrustedDeviceCreate(device, trustedDeviceOptions(database, clock))).success).toBe(true)
  clock.advance(30 * 24 * 60 * 60 + 31)
  const expiredToken = device.twoFactorRemember
  if (expiredToken === null) return
  const expired = await authenticationTrustedDeviceValidate(device, expiredToken, trustedDeviceOptions(database, clock))
  expect(expired).toEqual({ success: true, data: false })
  expect(device.twoFactorRemember).toBeNull()
  expect(identityDeviceFindByUuidAndUser(database, device.uuid, device.userUuid)).toMatchObject({
    success: true,
    data: { twoFactorRemember: null },
  })
})

test("trusted-device creation returns exact unavailable and disabled errors", async () => {
  const database = databaseCreate()
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const device = deviceCreate()

  await expect(
    authenticationTrustedDeviceCreate(
      device,
      trustedDeviceOptions(database, clock, { disabled: true, privateKey: undefined }),
    ),
  ).resolves.toMatchObject({
    success: false,
    code: "platform.invalid-request",
    statusCode: 400,
    errorMessage: "2FA remember is disabled.",
  })
  await expect(
    authenticationTrustedDeviceCreate(device, trustedDeviceOptions(database, clock, { privateKey: undefined })),
  ).resolves.toMatchObject({
    success: false,
    code: "platform.unavailable",
    statusCode: 503,
    errorMessage: "2FA remember token signing is unavailable.",
  })
})
