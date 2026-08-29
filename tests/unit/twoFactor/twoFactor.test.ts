import { afterEach, expect, test } from "bun:test"
import { createHash, createPublicKey, createSign, generateKeyPairSync, type KeyObject } from "node:crypto"
import { isoCBOR } from "@simplewebauthn/server/helpers"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { identityMailAdapterCreate } from "../../../src/server/contexts/identity/identityMailAdapterCreate.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserFindByUuid } from "../../../src/server/contexts/identity/identityUserFindByUuid.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { twoFactorBase32Decode } from "../../../src/server/contexts/twoFactor/twoFactorBase32Decode.js"
import { twoFactorBase32Encode } from "../../../src/server/contexts/twoFactor/twoFactorBase32Encode.js"
import { twoFactorIncompleteComplete } from "../../../src/server/contexts/twoFactor/twoFactorIncompleteComplete.js"
import { twoFactorIncompleteMark } from "../../../src/server/contexts/twoFactor/twoFactorIncompleteMark.js"
import { twoFactorIncompleteNotificationRun } from "../../../src/server/contexts/twoFactor/twoFactorIncompleteNotificationRun.js"
import { twoFactorEmailLoginValidate } from "../../../src/server/contexts/twoFactor/twoFactorEmailLoginValidate.js"
import { twoFactorEmailTokenSend } from "../../../src/server/contexts/twoFactor/twoFactorEmailTokenSend.js"
import { twoFactorProtectedActionCreate } from "../../../src/server/contexts/twoFactor/twoFactorProtectedActionCreate.js"
import { twoFactorProtectedActionValidate } from "../../../src/server/contexts/twoFactor/twoFactorProtectedActionValidate.js"
import { twoFactorProviderType } from "../../../src/server/contexts/twoFactor/twoFactorProviderType.js"
import { twoFactorProviderUsable } from "../../../src/server/contexts/twoFactor/twoFactorProviderUsable.js"
import { twoFactorRecordFindByUser } from "../../../src/server/contexts/twoFactor/twoFactorRecordFindByUser.js"
import { twoFactorRecordFindByUserAndType } from "../../../src/server/contexts/twoFactor/twoFactorRecordFindByUserAndType.js"
import { twoFactorRecordSave } from "../../../src/server/contexts/twoFactor/twoFactorRecordSave.js"
import { twoFactorRecordDeleteAllByUser } from "../../../src/server/contexts/twoFactor/twoFactorRecordDeleteAllByUser.js"
import { twoFactorRecoveryCodeClear } from "../../../src/server/contexts/twoFactor/twoFactorRecoveryCodeClear.js"
import { twoFactorRecoveryCodeConsume } from "../../../src/server/contexts/twoFactor/twoFactorRecoveryCodeConsume.js"
import { twoFactorRecoveryCodeEnsure } from "../../../src/server/contexts/twoFactor/twoFactorRecoveryCodeEnsure.js"
import { twoFactorTotpCodeCreate } from "../../../src/server/contexts/twoFactor/twoFactorTotpCodeCreate.js"
import { twoFactorTotpCodeValidate } from "../../../src/server/contexts/twoFactor/twoFactorTotpCodeValidate.js"
import { twoFactorWebAuthnChallengeConsume } from "../../../src/server/contexts/twoFactor/twoFactorWebAuthnChallengeConsume.js"
import { twoFactorWebAuthnChallengeCreate } from "../../../src/server/contexts/twoFactor/twoFactorWebAuthnChallengeCreate.js"
import { twoFactorAdaptersCreate } from "../../../src/server/contexts/twoFactor/twoFactorAdaptersCreate.js"
import { twoFactorWebAuthnStateRead } from "../../../src/server/contexts/twoFactor/twoFactorWebAuthnStateRead.js"
import { twoFactorWebAuthnRegistrationCounterUpdate } from "../../../src/server/contexts/twoFactor/twoFactorWebAuthnRegistrationCounterUpdate.js"
import { twoFactorWebAuthnU2fMigrate } from "../../../src/server/contexts/twoFactor/twoFactorWebAuthnU2fMigrate.js"
import { twoFactorYubikeyLoginValidate } from "../../../src/server/contexts/twoFactor/twoFactorYubikeyLoginValidate.js"
import { base64UrlEncode } from "../../../src/shared/crypto/base64UrlEncode.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"

const databases: DatabaseConnection[] = []

function databaseCreate(): DatabaseConnection {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  databases.push(result.data)
  return result.data
}

function userCreate(overrides: Partial<IdentityUser> = {}): IdentityUser {
  return {
    uuid: "two-factor-user",
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: "2026-08-28T00:00:00.000Z",
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "two-factor@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Two-factor user",
    passwordHash: new Uint8Array([1, 2, 3]),
    salt: new Uint8Array([4, 5, 6]),
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "akey",
    privateKey: null,
    publicKey: null,
    securityStamp: "security-stamp",
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

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("base32 codecs and TOTP generation match RFC 6238 vectors", async () => {
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"
  expect(twoFactorBase32Decode(secret)).toEqual({
    success: true,
    data: new Uint8Array("12345678901234567890".split("").map((value) => value.charCodeAt(0))),
  })
  expect(twoFactorBase32Encode(new Uint8Array([1, 2, 3, 254, 255]))).toBe("AEBAH7X7")
  expect(await twoFactorTotpCodeCreate(secret, 1)).toEqual({ success: true, data: "287082" })
  expect(await twoFactorTotpCodeValidate(secret, "287082", 59, 0, true)).toEqual({ success: true, data: 1 })
  expect(await twoFactorTotpCodeValidate(secret, "287082", 59, 1, true)).toMatchObject({
    success: false,
    errorMessage: "Invalid TOTP code! This code has already been used.",
  })
})

test("provider persistence round-trips records and hides implementation challenge rows", () => {
  const database = databaseCreate()
  const user = userCreate()
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  expect(
    twoFactorRecordSave(database, {
      uuid: "two-factor-authenticator",
      userUuid: user.uuid,
      type: twoFactorProviderType.authenticator,
      enabled: true,
      data: "SECRET",
      lastUsed: 4,
    }),
  ).toEqual({ success: true, data: undefined })
  expect(
    twoFactorRecordSave(database, {
      uuid: "two-factor-challenge",
      userUuid: user.uuid,
      type: twoFactorProviderType.emailVerificationChallenge,
      enabled: true,
      data: "CHALLENGE",
      lastUsed: 0,
    }),
  ).toEqual({ success: true, data: undefined })
  expect(twoFactorRecordFindByUserAndType(database, user.uuid, twoFactorProviderType.authenticator)).toEqual({
    success: true,
    data: {
      uuid: "two-factor-authenticator",
      userUuid: user.uuid,
      type: twoFactorProviderType.authenticator,
      enabled: true,
      data: "SECRET",
      lastUsed: 4,
    },
  })
  expect(twoFactorRecordFindByUser(database, user.uuid)).toEqual({
    success: true,
    data: [
      {
        uuid: "two-factor-authenticator",
        userUuid: user.uuid,
        type: twoFactorProviderType.authenticator,
        enabled: true,
        data: "SECRET",
        lastUsed: 4,
      },
    ],
  })
})

test("provider updates preserve the persisted provider UUID", () => {
  const database = databaseCreate()
  const user = userCreate()
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  expect(
    twoFactorRecordSave(database, {
      uuid: "original-provider-uuid",
      userUuid: user.uuid,
      type: twoFactorProviderType.authenticator,
      enabled: true,
      data: "OLD",
      lastUsed: 0,
    }),
  ).toEqual({ success: true, data: undefined })
  expect(
    twoFactorRecordSave(database, {
      uuid: "replacement-provider-uuid",
      userUuid: user.uuid,
      type: twoFactorProviderType.authenticator,
      enabled: true,
      data: "NEW",
      lastUsed: 1,
    }),
  ).toEqual({ success: true, data: undefined })
  expect(twoFactorRecordFindByUserAndType(database, user.uuid, twoFactorProviderType.authenticator)).toMatchObject({
    success: true,
    data: { uuid: "original-provider-uuid", data: "NEW", lastUsed: 1 },
  })
})

test("recovery codes persist on the user and can be cleared", () => {
  const database = databaseCreate()
  const user = userCreate()
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  const codeResult = twoFactorRecoveryCodeEnsure(database, user)
  expect(codeResult.success).toBe(true)
  if (!codeResult.success) return
  expect(codeResult.data).toHaveLength(32)
  expect(identityUserFindByUuid(database, user.uuid)).toMatchObject({
    success: true,
    data: { totpRecover: codeResult.data },
  })
  expect(twoFactorRecoveryCodeEnsure(database, user)).toEqual(codeResult)
  expect(twoFactorRecoveryCodeClear(database, user)).toEqual({ success: true, data: undefined })
  expect(user.totpRecover).toBeNull()
})

test("incomplete logins are idempotent and complete cleanly", () => {
  const database = databaseCreate()
  const user = userCreate()
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  const config = identityConfigCreate({ MAIL_ENABLED: true, INCOMPLETE_2FA_TIME_LIMIT: 3 })
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  expect(twoFactorIncompleteMark(database, user.uuid, "device", "Device", 7, "127.0.0.1", clock, config)).toEqual({
    success: true,
    data: undefined,
  })
  expect(twoFactorIncompleteMark(database, user.uuid, "device", "Changed", 8, "192.0.2.1", clock, config)).toEqual({
    success: true,
    data: undefined,
  })
  expect(database.query("SELECT device_name, device_type, ip_address FROM twofactor_incomplete").all()).toEqual([
    { device_name: "Device", device_type: 7, ip_address: "127.0.0.1" },
  ])
  expect(twoFactorIncompleteComplete(database, user.uuid, "device")).toEqual({ success: true, data: undefined })
  expect(database.query("SELECT COUNT(*) AS count FROM twofactor_incomplete").get()).toEqual({ count: 0 })
})

test("incomplete login notifications send only after the configured delay and then delete the record", async () => {
  const database = databaseCreate()
  const user = userCreate()
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  const markClock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const config = identityConfigCreate({ MAIL_ENABLED: true, INCOMPLETE_2FA_TIME_LIMIT: 3 })
  expect(
    twoFactorIncompleteMark(database, user.uuid, "device", "Device", 7, "127.0.0.1", markClock, config).success,
  ).toBe(true)
  const mail = identityMailAdapterCreate(clockTestCreate("2026-08-28T00:02:00.000Z"))
  expect(
    await twoFactorIncompleteNotificationRun({
      clock: clockTestCreate("2026-08-28T00:02:00.000Z"),
      config,
      database,
      mail,
    }),
  ).toEqual({ success: true, data: 0 })
  expect(database.query("SELECT COUNT(*) AS count FROM twofactor_incomplete").get()).toEqual({ count: 1 })
  expect(
    await twoFactorIncompleteNotificationRun({
      clock: clockTestCreate("2026-08-28T00:04:00.000Z"),
      config,
      database,
      mail,
    }),
  ).toEqual({ success: true, data: 1 })
  expect(mail.messages).toMatchObject([
    {
      kind: "incompleteTwoFactor",
      recipient: user.email,
      ipAddress: "127.0.0.1",
      loginTime: "2026-08-28T00:00:00.000Z",
      deviceName: "Device",
      deviceType: 7,
    },
  ])
  expect(database.query("SELECT COUNT(*) AS count FROM twofactor_incomplete").get()).toEqual({ count: 0 })
})

test("email login token attempts update atomically and consume a valid token", () => {
  const database = databaseCreate()
  const user = userCreate()
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  expect(
    twoFactorRecordSave(database, {
      uuid: "email-provider",
      userUuid: user.uuid,
      type: twoFactorProviderType.email,
      enabled: true,
      data: JSON.stringify({
        email: user.email,
        last_token: "123456",
        token_sent: Math.floor(new Date("2026-08-28T00:00:00.000Z").getTime() / 1_000),
        attempts: 0,
      }),
      lastUsed: 0,
    }),
  ).toEqual({ success: true, data: undefined })
  const config = identityConfigCreate({ EMAIL_ATTEMPTS_LIMIT: 3, EMAIL_EXPIRATION_TIME: 600 })
  const clock = clockTestCreate("2026-08-28T00:01:00.000Z")
  expect(twoFactorEmailLoginValidate(database, user.uuid, "wrong", clock, config)).toMatchObject({ success: false })
  const wrongRow = database
    .query<{ data: string }, [string]>("SELECT data FROM twofactor WHERE uuid = ?")
    .get("email-provider")
  expect(wrongRow === null ? null : JSON.parse(wrongRow.data)).toMatchObject({ last_token: "123456", attempts: 1 })
  expect(twoFactorEmailLoginValidate(database, user.uuid, "123456", clock, config)).toEqual({
    success: true,
    data: undefined,
  })
  const row = database
    .query<{ data: string }, [string]>("SELECT data FROM twofactor WHERE uuid = ?")
    .get("email-provider")
  expect(row === null ? null : JSON.parse(row.data)).toMatchObject({ last_token: null, attempts: 0 })
})

test("email login tokens expire and exhausted attempts cannot be reused", () => {
  const database = databaseCreate()
  const user = userCreate()
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  const tokenSent = Math.floor(new Date("2026-08-28T00:00:00.000Z").getTime() / 1_000)
  const record = {
    uuid: "email-provider",
    userUuid: user.uuid,
    type: twoFactorProviderType.email,
    enabled: true,
    data: JSON.stringify({ email: user.email, last_token: "123456", token_sent: tokenSent, attempts: 0 }),
    lastUsed: 0,
  }
  expect(twoFactorRecordSave(database, record)).toEqual({ success: true, data: undefined })
  const config = identityConfigCreate({ EMAIL_ATTEMPTS_LIMIT: 3, EMAIL_EXPIRATION_TIME: 600 })
  const clock = clockTestCreate("2026-08-28T00:01:00.000Z")
  expect(twoFactorEmailLoginValidate(database, user.uuid, "wrong-1", clock, config)).toMatchObject({ success: false })
  expect(twoFactorEmailLoginValidate(database, user.uuid, "wrong-2", clock, config)).toMatchObject({ success: false })
  expect(twoFactorEmailLoginValidate(database, user.uuid, "wrong-3", clock, config)).toMatchObject({ success: false })
  expect(twoFactorEmailLoginValidate(database, user.uuid, "123456", clock, config)).toMatchObject({ success: false })
  expect(
    JSON.parse(
      database.query<{ data: string }, [string]>("SELECT data FROM twofactor WHERE uuid = ?").get(record.uuid)?.data ??
        "{}",
    ),
  ).toMatchObject({ last_token: null, attempts: 3 })

  expect(twoFactorRecordSave(database, record)).toEqual({ success: true, data: undefined })
  expect(
    twoFactorEmailLoginValidate(database, user.uuid, "123456", clockTestCreate("2026-08-28T00:11:01.000Z"), config),
  ).toMatchObject({ success: false, errorMessage: "Token has expired" })
  expect(
    JSON.parse(
      database.query<{ data: string }, [string]>("SELECT data FROM twofactor WHERE uuid = ?").get(record.uuid)?.data ??
        "{}",
    ),
  ).toMatchObject({ last_token: null, attempts: 0 })
})

test("email login rejects a token issued in the future and consumes it once", () => {
  const database = databaseCreate()
  const user = userCreate()
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  const now = Math.floor(new Date("2026-08-28T00:00:00.000Z").getTime() / 1_000)
  expect(
    twoFactorRecordSave(database, {
      uuid: "future-email-provider",
      userUuid: user.uuid,
      type: twoFactorProviderType.email,
      enabled: true,
      data: JSON.stringify({ email: user.email, last_token: "123456", token_sent: now + 30, attempts: 0 }),
      lastUsed: 0,
    }),
  ).toEqual({ success: true, data: undefined })
  const config = identityConfigCreate({ EMAIL_ATTEMPTS_LIMIT: 3, EMAIL_EXPIRATION_TIME: 600 })
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  expect(twoFactorEmailLoginValidate(database, user.uuid, "123456", clock, config)).toMatchObject({
    success: false,
    errorMessage: "Token has expired",
  })
  expect(twoFactorEmailLoginValidate(database, user.uuid, "123456", clock, config)).toMatchObject({ success: false })
})

test("malformed email token data is removed after validation fails", () => {
  const database = databaseCreate()
  const user = userCreate()
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  expect(
    twoFactorRecordSave(database, {
      uuid: "malformed-email-provider",
      userUuid: user.uuid,
      type: twoFactorProviderType.email,
      enabled: true,
      data: "not-json",
      lastUsed: 0,
    }),
  ).toEqual({ success: true, data: undefined })
  expect(
    twoFactorEmailLoginValidate(
      database,
      user.uuid,
      "123456",
      clockTestCreate("2026-08-28T00:00:00.000Z"),
      identityConfigCreate(),
    ),
  ).toMatchObject({ success: false, errorMessage: "Could not decode EmailTokenData from string" })
  expect(twoFactorRecordFindByUserAndType(database, user.uuid, twoFactorProviderType.email)).toEqual({
    success: true,
    data: null,
  })
})

test("email token send failure invalidates only the replacement token", async () => {
  const database = databaseCreate()
  const user = userCreate()
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  expect(
    twoFactorRecordSave(database, {
      uuid: "email-provider",
      userUuid: user.uuid,
      type: twoFactorProviderType.email,
      enabled: true,
      data: JSON.stringify({ email: user.email, last_token: "old-token", token_sent: 0, attempts: 0 }),
      lastUsed: 0,
    }),
  ).toEqual({ success: true, data: undefined })
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const mail = identityMailAdapterCreate(clock)
  mail.sendTwoFactorToken = async () => resultErrorCreate("mail", "mail unavailable")
  const result = await twoFactorEmailTokenSend(database, user, clock, identityConfigCreate(), mail)
  expect(result).toMatchObject({ success: false, errorMessage: "mail unavailable" })
  const row = database
    .query<{ data: string }, [string]>("SELECT data FROM twofactor WHERE uuid = ?")
    .get("email-provider")
  expect(row === null ? null : JSON.parse(row.data)).toMatchObject({ last_token: null, attempts: 0 })
})

test("protected action token requests are throttled for thirty seconds", async () => {
  const database = databaseCreate()
  const user = userCreate()
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  const config = identityConfigCreate({ MAIL_ENABLED: true })
  const mail = identityMailAdapterCreate()
  const identifier = { uuid: () => "protected-action" }
  const first = await twoFactorProtectedActionCreate(
    database,
    user,
    clockTestCreate("2026-08-28T00:00:00.000Z"),
    identifier,
    config,
    mail,
  )
  expect(first).toEqual({ success: true, data: undefined })
  expect(
    await twoFactorProtectedActionCreate(
      database,
      user,
      clockTestCreate("2026-08-28T00:00:10.000Z"),
      identifier,
      config,
      mail,
    ),
  ).toMatchObject({ success: false, errorMessage: "Please wait 20 seconds before requesting another code." })
  expect(
    await twoFactorProtectedActionCreate(
      database,
      user,
      clockTestCreate("2026-08-28T00:00:30.000Z"),
      identifier,
      config,
      mail,
    ),
  ).toEqual({ success: true, data: undefined })
})

test("protected action mail failure revokes the unsent token", async () => {
  const database = databaseCreate()
  const user = userCreate()
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  const mail = identityMailAdapterCreate()
  mail.sendProtectedActionToken = async () => resultErrorCreate("mail", "mail unavailable")
  const result = await twoFactorProtectedActionCreate(
    database,
    user,
    clockTestCreate("2026-08-28T00:00:00.000Z"),
    { uuid: () => "protected-action" },
    identityConfigCreate({ MAIL_ENABLED: true }),
    mail,
  )
  expect(result).toMatchObject({ success: false, errorMessage: "mail unavailable" })
  expect(twoFactorRecordFindByUserAndType(database, user.uuid, twoFactorProviderType.protectedActions)).toEqual({
    success: true,
    data: null,
  })
})

test("recovery code consumption is atomic, revokes two-factor state, and cannot replay", () => {
  const database = databaseCreate()
  const user = userCreate()
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  const recoveryResult = twoFactorRecoveryCodeEnsure(database, user)
  expect(recoveryResult.success).toBe(true)
  if (!recoveryResult.success) return
  const provider = {
    uuid: "recovery-provider",
    userUuid: user.uuid,
    type: twoFactorProviderType.authenticator,
    enabled: true,
    data: "SECRET",
    lastUsed: 0,
  }
  expect(twoFactorRecordSave(database, provider)).toEqual({ success: true, data: undefined })
  expect(twoFactorRecoveryCodeConsume(database, user, `${recoveryResult.data}wrong`)).toMatchObject({ success: false })
  expect(twoFactorRecordFindByUserAndType(database, user.uuid, twoFactorProviderType.authenticator)).toMatchObject({
    success: true,
    data: provider,
  })
  expect(twoFactorRecoveryCodeConsume(database, user, recoveryResult.data)).toEqual({ success: true, data: undefined })
  expect(twoFactorRecordFindByUser(database, user.uuid)).toEqual({ success: true, data: [] })
  expect(twoFactorRecoveryCodeConsume(database, user, recoveryResult.data)).toMatchObject({ success: false })
})

test("removing all two-factor state revokes trusted-device tokens", () => {
  const database = databaseCreate()
  const user = userCreate()
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  database.run(
    `INSERT INTO devices (
       uuid, created_at, updated_at, user_uuid, name, atype, push_uuid,
       push_token, refresh_token, twofactor_remember
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ["trusted-device", user.createdAt, user.updatedAt, user.uuid, "Trusted device", 7, null, null, "refresh", "token"],
  )
  expect(
    twoFactorRecordSave(database, {
      uuid: "two-factor-provider",
      userUuid: user.uuid,
      type: twoFactorProviderType.authenticator,
      enabled: true,
      data: "SECRET",
      lastUsed: 0,
    }),
  ).toEqual({ success: true, data: undefined })
  expect(twoFactorRecordDeleteAllByUser(database, user.uuid)).toEqual({ success: true, data: undefined })
  expect(database.query("SELECT twofactor_remember FROM devices WHERE uuid = ?").get("trusted-device")).toEqual({
    twofactor_remember: null,
  })
  expect(twoFactorRecordFindByUser(database, user.uuid)).toEqual({ success: true, data: [] })
})

test("protected action validation locks on the configured attempt and preserves the lockout", () => {
  const database = databaseCreate()
  const user = userCreate()
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  const tokenSent = Math.floor(new Date("2026-08-28T00:00:00.000Z").getTime() / 1_000)
  const record = {
    uuid: "protected-action",
    userUuid: user.uuid,
    type: twoFactorProviderType.protectedActions,
    enabled: true,
    data: JSON.stringify({ token: "123456", token_sent: tokenSent, attempts: 2 }),
    lastUsed: 0,
  }
  expect(twoFactorRecordSave(database, record)).toEqual({ success: true, data: undefined })
  const config = identityConfigCreate({ EMAIL_ATTEMPTS_LIMIT: 3, EMAIL_EXPIRATION_TIME: 600 })
  const clock = clockTestCreate("2026-08-28T00:01:00.000Z")
  expect(twoFactorProtectedActionValidate(database, user.uuid, "123456", clock, config, true)).toMatchObject({
    success: false,
    errorMessage: "Token has expired",
  })
  const row = database.query<{ data: string }, [string]>("SELECT data FROM twofactor WHERE uuid = ?").get(record.uuid)
  expect(row === null ? null : JSON.parse(row.data)).toMatchObject({ attempts: 3 })
  expect(twoFactorProtectedActionValidate(database, user.uuid, "123456", clock, config, true)).toMatchObject({
    success: false,
    errorMessage: "Token has expired",
  })
})

test("provider usability follows server feature gates", () => {
  const config = identityConfigCreate({
    ENABLE_EMAIL_2FA: true,
    MAIL_ENABLED: true,
    DUO_ENABLED: true,
    DUO_HOST: "api-123.duosecurity.com",
    DUO_IKEY: "DIXXXXXXXXXXXXXXXXXX",
    DUO_SKEY: "secret",
    YUBICO_ENABLED: true,
    YUBICO_CLIENT_ID: "123456",
    YUBICO_SECRET_KEY: "secret-key",
  })
  expect(twoFactorProviderUsable(twoFactorProviderType.authenticator, "", config, undefined)).toBe(true)
  expect(twoFactorProviderUsable(twoFactorProviderType.email, "", config, undefined)).toBe(true)
  expect(twoFactorProviderUsable(twoFactorProviderType.duo, "", config, undefined)).toBe(true)
  expect(
    twoFactorProviderUsable(
      twoFactorProviderType.duo,
      JSON.stringify({ host: "api-user.duosecurity.com", ik: "user-id", sk: "user-secret" }),
      identityConfigCreate({ DUO_ENABLED: false }),
      undefined,
    ),
  ).toBe(true)
  expect(twoFactorProviderUsable(twoFactorProviderType.duo, "", identityConfigCreate(), undefined)).toBe(false)
  expect(
    twoFactorProviderUsable(
      twoFactorProviderType.yubikey,
      JSON.stringify({ keys: ["cbdefghijkln"], nfc: false }),
      config,
      undefined,
    ),
  ).toBe(true)
  expect(
    twoFactorProviderUsable(
      twoFactorProviderType.yubikey,
      "",
      identityConfigCreate({ YUBICO_ENABLED: false, YUBICO_CLIENT_ID: "123456", YUBICO_SECRET_KEY: "secret-key" }),
      undefined,
    ),
  ).toBe(false)
  expect(
    twoFactorProviderUsable(
      twoFactorProviderType.duo,
      "",
      identityConfigCreate({ DUO_ENABLED: false, DUO_HOST: "api.duosecurity.com", DUO_IKEY: "id", DUO_SKEY: "key" }),
      undefined,
    ),
  ).toBe(false)
  expect(
    twoFactorProviderUsable(
      twoFactorProviderType.webauthn,
      JSON.stringify([
        {
          credential: { counter: 0, id: "credential-id", publicKey: "AQ" },
          credentialId: "credential-id",
          id: 1,
          name: "Security key",
        },
      ]),
      config,
      "https://vault.example",
    ),
  ).toBe(true)
  expect(twoFactorProviderUsable(twoFactorProviderType.webauthn, "", config, "https://")).toBe(false)
  expect(twoFactorProviderUsable(twoFactorProviderType.webauthn, "", config, "https://vault.example/path")).toBe(false)
  expect(twoFactorProviderUsable(twoFactorProviderType.webauthn, "", config, "http://localhost:8000")).toBe(false)
  expect(twoFactorProviderUsable(twoFactorProviderType.webauthn, "", config, "ftp://localhost")).toBe(false)
  expect(
    twoFactorProviderUsable(
      twoFactorProviderType.webauthn,
      "",
      identityConfigCreate({ WEBAUTHN_ENABLED: false }),
      "https://vault.example",
    ),
  ).toBe(false)
  expect(twoFactorProviderUsable(twoFactorProviderType.protectedActions, "", config, "https://vault.example")).toBe(
    false,
  )
})

test("Yubikey login validates registration and delegates replay protection", async () => {
  const token = `abcdefghijkl${"m".repeat(32)}`
  const calls: string[] = []
  const validation = await twoFactorYubikeyLoginValidate(
    token,
    JSON.stringify({ keys: [token.slice(0, 12)], nfc: false }),
    {
      yubikey: {
        otpValidate: async (otp) => {
          calls.push(otp)
          return calls.length === 1
            ? { success: true, data: undefined }
            : { success: false, op: "yubico", errorMessage: "OTP has already been used" }
        },
      },
    },
  )
  expect(validation).toEqual({ success: true, data: undefined })
  expect(calls).toEqual([token])
  expect(
    await twoFactorYubikeyLoginValidate(token, JSON.stringify({ keys: [token.slice(0, 12)], nfc: false }), {
      yubikey: {
        otpValidate: async (otp) => {
          calls.push(otp)
          return { success: false, op: "yubico", errorMessage: "OTP has already been used" }
        },
      },
    }),
  ).toMatchObject({ success: false, errorMessage: "OTP has already been used" })
  expect(
    await twoFactorYubikeyLoginValidate(
      `mnopqrstuvwx${"m".repeat(32)}`,
      JSON.stringify({ keys: [token.slice(0, 12)], nfc: false }),
      { yubikey: { otpValidate: async () => ({ success: true, data: undefined }) } },
    ),
  ).toMatchObject({ success: false, errorMessage: "Given Yubikey is not registered" })
  expect(calls).toHaveLength(2)
})

test("WebAuthn counter updates reject replayed assertions", () => {
  const database = databaseCreate()
  const user = userCreate()
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  expect(
    twoFactorRecordSave(database, {
      uuid: "webauthn-provider",
      userUuid: user.uuid,
      type: twoFactorProviderType.webauthn,
      enabled: true,
      data: JSON.stringify([
        {
          id: 1,
          name: "Security key",
          migrated: false,
          credentialId: "credential-id",
          credential: { id: "credential-id", counter: 2, publicKey: "AQ" },
        },
      ]),
      lastUsed: 0,
    }),
  ).toEqual({ success: true, data: undefined })
  expect(
    twoFactorWebAuthnRegistrationCounterUpdate(database, user.uuid, {
      credentialId: "credential-id",
      newCounter: 2,
    }),
  ).toMatchObject({ success: false, errorMessage: "Webauthn credential counter was replayed" })
  expect(
    JSON.parse(
      database.query<{ data: string }, [string]>("SELECT data FROM twofactor WHERE uuid = ?").get("webauthn-provider")
        ?.data ?? "[]",
    ),
  ).toMatchObject([{ credential: { counter: 2 } }])
})

test("legacy U2F registrations migrate into WebAuthn credentials", () => {
  const database = databaseCreate()
  const user = userCreate({ uuid: "u2f-user" })
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  const keyHandle = Array.from({ length: 32 }, (_, index) => index + 1)
  const publicKey = [
    4,
    ...Array.from({ length: 32 }, (_, index) => index + 33),
    ...Array.from({ length: 32 }, (_, index) => index + 65),
  ]
  expect(
    twoFactorRecordSave(database, {
      uuid: "u2f-provider",
      userUuid: user.uuid,
      type: twoFactorProviderType.u2f,
      enabled: true,
      data: JSON.stringify([
        { counter: 2, id: 1, migrated: false, name: "Legacy key", reg: { keyHandle, pubKey: publicKey } },
      ]),
      lastUsed: 0,
    }),
  ).toEqual({ success: true, data: undefined })
  expect(twoFactorWebAuthnU2fMigrate(database)).toEqual({ success: true, data: undefined })
  const webauthn = twoFactorRecordFindByUserAndType(database, user.uuid, twoFactorProviderType.webauthn)
  expect(webauthn).toMatchObject({ success: true, data: { enabled: true } })
  if (!webauthn.success || webauthn.data === null) return
  expect(JSON.parse(webauthn.data.data)).toMatchObject([
    { credential: { counter: 2, id: base64UrlEncode(Uint8Array.from(keyHandle)) }, migrated: true },
  ])
  expect(database.query("SELECT uuid, atype, data FROM twofactor WHERE user_uuid = ?").all(user.uuid)).toHaveLength(2)
  const migratedU2f = twoFactorRecordFindByUserAndType(database, user.uuid, twoFactorProviderType.u2f)
  expect(migratedU2f.success).toBe(true)
  if (!migratedU2f.success || migratedU2f.data === null) return
  expect(JSON.parse(migratedU2f.data.data)).toMatchObject([{ migrated: true }])
})

test("WebAuthn challenges exclude registered credentials and are one-shot", async () => {
  const database = databaseCreate()
  const user = userCreate({ uuid: "00000000-0000-4000-8000-000000000020" })
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  expect(
    twoFactorRecordSave(database, {
      uuid: "webauthn-provider",
      userUuid: user.uuid,
      type: twoFactorProviderType.webauthn,
      enabled: true,
      data: JSON.stringify([
        {
          id: 1,
          name: "Security key",
          migrated: false,
          credentialId: "registered-credential",
          credential: { id: "registered-credential", counter: 2, publicKey: "AQ" },
        },
      ]),
      lastUsed: 0,
    }),
  ).toEqual({ success: true, data: undefined })
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const identifier = { uuid: () => "webauthn-challenge" }
  const registrationResult = await twoFactorWebAuthnChallengeCreate(
    database,
    user,
    clock,
    identifier,
    "registration",
    "https://vault.example",
    "OneWarden",
  )
  expect(registrationResult.success).toBe(true)
  if (!registrationResult.success) return
  expect(registrationResult.data).toMatchObject({
    rp: { id: "vault.example", name: "OneWarden" },
    excludeCredentials: [{ id: "registered-credential", type: "public-key" }],
    authenticatorSelection: { userVerification: "discouraged" },
    status: "ok",
    errorMessage: "",
  })
  const registrationChallenge = twoFactorWebAuthnChallengeConsume(
    database,
    user.uuid,
    twoFactorProviderType.webauthnRegisterChallenge,
  )
  expect(registrationChallenge.success).toBe(true)
  if (!registrationChallenge.success) return
  expect(registrationChallenge.data).not.toBeNull()
  expect(
    twoFactorWebAuthnChallengeConsume(database, user.uuid, twoFactorProviderType.webauthnRegisterChallenge),
  ).toEqual({ success: true, data: null })

  const loginResult = await twoFactorWebAuthnChallengeCreate(
    database,
    user,
    clock,
    identifier,
    "login",
    "https://vault.example",
    "OneWarden",
  )
  expect(loginResult.success).toBe(true)
  if (!loginResult.success) return
  expect(loginResult.data).toMatchObject({
    rpId: "vault.example",
    allowCredentials: [{ id: "registered-credential", type: "public-key" }],
    userVerification: "discouraged",
  })
  const challengeRow = database
    .query<{ data: string }, [string, number]>("SELECT data FROM twofactor WHERE user_uuid = ? AND atype = ?")
    .get(user.uuid, twoFactorProviderType.webauthnLoginChallenge)
  expect(challengeRow).not.toBeNull()
  if (challengeRow === null) return
  const state = JSON.parse(challengeRow.data) as { expiresAt: number }
  expect(twoFactorWebAuthnStateRead(challengeRow.data)).toMatchObject({ success: true })
  expect(twoFactorWebAuthnStateRead(JSON.stringify({ challenge: "challenge" }))).toMatchObject({ success: false })
  expect(state.expiresAt).toBe(Math.floor(clock.now().getTime() / 1_000) + 60)
  expect(
    twoFactorWebAuthnChallengeConsume(database, user.uuid, twoFactorProviderType.webauthnLoginChallenge),
  ).toMatchObject({ success: true, data: { type: twoFactorProviderType.webauthnLoginChallenge } })
  expect(twoFactorWebAuthnChallengeConsume(database, user.uuid, twoFactorProviderType.webauthnLoginChallenge)).toEqual({
    success: true,
    data: null,
  })

  const secondLoginResult = await twoFactorWebAuthnChallengeCreate(
    database,
    user,
    clock,
    identifier,
    "login",
    "https://vault.example",
    "OneWarden",
  )
  expect(secondLoginResult.success).toBe(true)
  const secondRegistrationResult = await twoFactorWebAuthnChallengeCreate(
    database,
    user,
    clock,
    identifier,
    "registration",
    "https://vault.example",
    "OneWarden",
  )
  expect(secondRegistrationResult.success).toBe(true)
  expect(
    database
      .query("SELECT uuid FROM twofactor WHERE user_uuid = ? AND atype = ?")
      .get(user.uuid, twoFactorProviderType.webauthnLoginChallenge),
  ).toBeNull()
})

test("WebAuthn adapters verify and persist a real ES256 ceremony", async () => {
  const database = databaseCreate()
  const user = userCreate({ uuid: "webauthn-user" })
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const origin = "https://vault.example"
  const rpId = "vault.example"
  const identifier = {
    uuid: (() => {
      let index = 0
      return () => `webauthn-${index++}`
    })(),
  }
  const challengeResult = await twoFactorWebAuthnChallengeCreate(
    database,
    user,
    clock,
    identifier,
    "registration",
    origin,
    "OneWarden",
  )
  expect(challengeResult.success).toBe(true)
  if (!challengeResult.success) return
  const challenge = String(challengeResult.data.challenge)
  const challengeRow = database
    .query<{ data: string }, [string, number]>("SELECT data FROM twofactor WHERE user_uuid = ? AND atype = ?")
    .get(user.uuid, twoFactorProviderType.webauthnRegisterChallenge)
  expect(challengeRow).not.toBeNull()
  if (challengeRow === null) return
  const stateResult = twoFactorWebAuthnStateRead(challengeRow.data)
  expect(stateResult.success).toBe(true)
  if (!stateResult.success) return

  const keys = generateKeyPairSync("ec", { namedCurve: "prime256v1" })
  const credentialId = new Uint8Array(Array.from({ length: 32 }, (_, index) => index + 1))
  const adapters = twoFactorAdaptersCreate(undefined, undefined, clock)
  const registrationResult = await adapters.webauthn?.registrationValidate?.(
    webauthnRegistrationResponseCreate(challenge, origin, rpId, credentialId, keys.privateKey),
    stateResult.data,
  )
  expect(registrationResult?.success).toBe(true)
  if (registrationResult === undefined || !registrationResult.success) return
  expect(registrationResult.data.id).toBe(base64UrlEncode(credentialId))
  expect(registrationResult.data.counter).toBe(0)
  expect(registrationResult.data.publicKey).toMatch(/^[A-Za-z0-9_-]+$/u)

  expect(
    twoFactorRecordSave(database, {
      uuid: "webauthn-provider",
      userUuid: user.uuid,
      type: twoFactorProviderType.webauthn,
      enabled: true,
      data: JSON.stringify([
        {
          credential: registrationResult.data,
          credentialId: registrationResult.data.id,
          id: 1,
          migrated: false,
          name: "Security key",
        },
      ]),
      lastUsed: 0,
    }),
  ).toEqual({ success: true, data: undefined })

  const loginChallengeResult = await twoFactorWebAuthnChallengeCreate(
    database,
    user,
    clock,
    identifier,
    "login",
    origin,
    "OneWarden",
  )
  expect(loginChallengeResult.success).toBe(true)
  if (!loginChallengeResult.success) return
  const loginRow = database
    .query<{ data: string }, [string, number]>("SELECT data FROM twofactor WHERE user_uuid = ? AND atype = ?")
    .get(user.uuid, twoFactorProviderType.webauthnLoginChallenge)
  expect(loginRow).not.toBeNull()
  if (loginRow === null) return
  const loginStateResult = twoFactorWebAuthnStateRead(loginRow.data)
  expect(loginStateResult.success).toBe(true)
  if (!loginStateResult.success) return
  const authenticationResult = await adapters.webauthn?.loginValidate?.(
    webauthnAuthenticationResponseCreate(
      String(loginChallengeResult.data.challenge),
      origin,
      rpId,
      credentialId,
      keys.privateKey,
      1,
    ),
    loginStateResult.data,
  )
  expect(authenticationResult).toEqual({
    success: true,
    data: { credentialId: base64UrlEncode(credentialId), newCounter: 1 },
  })
})

function publicKeyCoordinates(privateKey: KeyObject): { x: Buffer; y: Buffer } {
  const jwk = createPublicKey(privateKey).export({ format: "jwk" })
  if (typeof jwk !== "object" || jwk === null || !("x" in jwk) || !("y" in jwk)) throw new Error("EC JWK is invalid")
  return { x: Buffer.from(String(jwk.x), "base64url"), y: Buffer.from(String(jwk.y), "base64url") }
}

function webauthnRegistrationResponseCreate(
  challenge: string,
  origin: string,
  rpId: string,
  credentialId: Uint8Array,
  privateKey: KeyObject,
) {
  const { x, y } = publicKeyCoordinates(privateKey)
  const coseKey = isoCBOR.encode(
    new Map<number, unknown>([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, x],
      [-3, y],
    ]) as never,
  )
  const authData = Buffer.concat([
    createHash("sha256").update(rpId).digest(),
    Buffer.from([0x45]),
    Buffer.alloc(4),
    Buffer.alloc(16),
    Buffer.from([credentialId.length >> 8, credentialId.length & 0xff]),
    Buffer.from(credentialId),
    Buffer.from(coseKey),
  ])
  const clientDataJSON = Buffer.from(JSON.stringify({ challenge, origin, type: "webauthn.create" })).toString(
    "base64url",
  )
  return {
    clientExtensionResults: {},
    id: base64UrlEncode(credentialId),
    rawId: base64UrlEncode(credentialId),
    response: {
      attestationObject: Buffer.from(
        isoCBOR.encode(
          new Map<string, unknown>([
            ["fmt", "none"],
            ["authData", authData],
            ["attStmt", new Map()],
          ]) as never,
        ),
      ).toString("base64url"),
      clientDataJSON,
      transports: ["internal"],
    },
    type: "public-key",
  }
}

function webauthnAuthenticationResponseCreate(
  challenge: string,
  origin: string,
  rpId: string,
  credentialId: Uint8Array,
  privateKey: KeyObject,
  counter: number,
) {
  const authData = Buffer.concat([
    createHash("sha256").update(rpId).digest(),
    Buffer.from([0x05]),
    Buffer.from([(counter >>> 24) & 0xff, (counter >>> 16) & 0xff, (counter >>> 8) & 0xff, counter & 0xff]),
  ])
  const clientDataJSON = Buffer.from(JSON.stringify({ challenge, origin, type: "webauthn.get" }))
  const signature = createSign("SHA256")
    .update(Buffer.concat([authData, createHash("sha256").update(clientDataJSON).digest()]))
    .sign(privateKey)
  return {
    clientExtensionResults: {},
    id: base64UrlEncode(credentialId),
    rawId: base64UrlEncode(credentialId),
    response: {
      authenticatorData: authData.toString("base64url"),
      clientDataJSON: clientDataJSON.toString("base64url"),
      signature: signature.toString("base64url"),
    },
    type: "public-key",
  }
}
