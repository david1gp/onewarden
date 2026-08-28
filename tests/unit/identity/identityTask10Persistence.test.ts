import { afterEach, expect, test } from "bun:test"
import { identityAccountKdfApply } from "../../../src/server/contexts/identity/identityAccountKdfApply.js"
import { identityAccountKdfDataNormalize } from "../../../src/server/contexts/identity/identityAccountKdfDataNormalize.js"
import { identityDeviceClearPushTokenByUuid } from "../../../src/server/contexts/identity/identityDeviceClearPushTokenByUuid.js"
import { identityDeviceFindByUuidAndUser } from "../../../src/server/contexts/identity/identityDeviceFindByUuidAndUser.js"
import { identityDeviceFindByUser } from "../../../src/server/contexts/identity/identityDeviceFindByUser.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"
import { identityUserDelete } from "../../../src/server/contexts/identity/identityUserDelete.js"
import { identityUserFindByUuid } from "../../../src/server/contexts/identity/identityUserFindByUuid.js"
import { identityUserProfileToJson } from "../../../src/server/contexts/identity/identityUserProfileToJson.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"

const databases: DatabaseConnection[] = []

function databaseCreate(): DatabaseConnection {
  const result = databaseTestCreate()
  if (!result.success) throw new Error(result.errorMessage)
  databases.push(result.data)
  return result.data
}

function userCreate(overrides: Partial<IdentityUser> = {}): IdentityUser {
  return {
    uuid: "task10-unit-user",
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: null,
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "task10-unit@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Unit user",
    passwordHash: new Uint8Array([1, 2, 3]),
    salt: new Uint8Array([4, 5, 6]),
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "unit-akey",
    privateKey: null,
    publicKey: null,
    securityStamp: "unit-stamp",
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

function deviceCreate(userUuid: string, uuid: string): IdentityDevice {
  return {
    uuid,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    userUuid,
    name: "Unit device",
    type: 7,
    pushUuid: `${uuid}-push`,
    pushToken: "push-token",
    refreshToken: `${uuid}-refresh`,
    twoFactorRemember: "remembered",
  }
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("KDF aliases normalize with canonical precedence and apply exact PBKDF2/Argon2 constraints", () => {
  expect(identityAccountKdfDataNormalize({ kdfType: 1, iterations: 2, memory: 15, parallelism: 1 })).toEqual({
    success: true,
    data: { kdf: 1, kdfIterations: 2, kdfMemory: 15, kdfParallelism: 1 },
  })
  expect(
    identityAccountKdfDataNormalize({
      kdf: 0,
      kdfType: 1,
      kdfIterations: 100_000,
      iterations: 1,
      kdfMemory: null,
      memory: 15,
      kdfParallelism: null,
      parallelism: 1,
    }),
  ).toEqual({
    success: true,
    data: { kdf: 0, kdfIterations: 100_000, kdfMemory: null, kdfParallelism: null },
  })
  const user = userCreate()
  expect(
    identityAccountKdfApply(user, { kdf: 0, kdfIterations: 99_999, kdfMemory: null, kdfParallelism: null }),
  ).toMatchObject({
    success: false,
    errorMessage: "PBKDF2 KDF iterations must be at least 100000.",
  })
  expect(identityAccountKdfApply(user, { kdf: 1, kdfIterations: 1, kdfMemory: null, kdfParallelism: 1 })).toMatchObject(
    {
      success: false,
      errorMessage: "Argon2 memory parameter is required.",
    },
  )
  expect(identityAccountKdfApply(user, { kdf: 1, kdfIterations: 2, kdfMemory: 15, kdfParallelism: 1 })).toEqual({
    success: true,
    data: undefined,
  })
  expect(user).toMatchObject({ clientKdfType: 1, clientKdfIter: 2, clientKdfMemory: 15, clientKdfParallelism: 1 })
})

test("user and device persistence round-trips nullability, composite device identity, push updates, and profile casing", () => {
  const database = databaseCreate()
  const user = userCreate({ privateKey: "private-key", publicKey: "public-key", avatarColor: "#123456" })
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  expect(identityUserFindByUuid(database, user.uuid)).toEqual({ success: true, data: user })
  expect(identityUserProfileToJson(user, identityConfigCreate())).toMatchObject({
    _status: 0,
    accountKeys: {
      publicKeyEncryptionKeyPair: {
        wrappedPrivateKey: "private-key",
        publicKey: "public-key",
        signedPublicKey: null,
        object: "publicKeyEncryptionKeyPair",
      },
      object: "privateKeys",
    },
    avatarColor: "#123456",
    object: "profile",
  })

  const firstDevice = deviceCreate(user.uuid, "same-identifier")
  const secondUser = userCreate({ uuid: "second-unit-user", email: "second-unit@example.com" })
  expect(identityUserSave(database, secondUser)).toEqual({ success: true, data: undefined })
  const secondDevice = deviceCreate(secondUser.uuid, "same-identifier")
  expect(identityDeviceSave(database, firstDevice, clockTestCreate("2026-08-28T00:00:01.000Z"), true)).toEqual({
    success: true,
    data: undefined,
  })
  expect(identityDeviceSave(database, secondDevice, clockTestCreate("2026-08-28T00:00:02.000Z"), false)).toEqual({
    success: true,
    data: undefined,
  })
  expect(identityDeviceFindByUser(database, user.uuid)).toEqual({
    success: true,
    data: [{ ...firstDevice, updatedAt: "2026-08-28T00:00:01.000Z" }],
  })
  expect(identityDeviceFindByUuidAndUser(database, "same-identifier", secondUser.uuid)).toEqual({
    success: true,
    data: secondDevice,
  })
  expect(identityDeviceClearPushTokenByUuid(database, "same-identifier")).toEqual({ success: true, data: undefined })
  expect(
    database
      .query("SELECT user_uuid, push_token FROM devices WHERE uuid = ? ORDER BY user_uuid")
      .all("same-identifier"),
  ).toEqual([
    { user_uuid: "second-unit-user", push_token: null },
    { user_uuid: "task10-unit-user", push_token: null },
  ])
})

test("account deletion blocks the final owner before mutation and deletes current relationships transactionally", () => {
  const database = databaseCreate()
  const user = userCreate()
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    "unit-org",
    "Unit org",
    "unit@example.com",
  ])
  database.run(
    "INSERT INTO users_organizations (uuid, user_uuid, org_uuid, akey, status, atype) VALUES (?, ?, ?, ?, ?, ?)",
    ["unit-membership", user.uuid, "unit-org", "key", 2, 0],
  )
  expect(identityUserDelete(database, user)).toMatchObject({ success: false, errorMessage: "Can't delete last owner" })
  expect(database.query("SELECT COUNT(*) AS count FROM users WHERE uuid = ?").get(user.uuid)).toEqual({ count: 1 })

  database.run("UPDATE users_organizations SET atype = 2 WHERE uuid = ?", ["unit-membership"])
  expect(
    identityDeviceSave(
      database,
      deviceCreate(user.uuid, "delete-device"),
      clockTestCreate("2026-08-28T00:00:00.000Z"),
      false,
    ),
  ).toEqual({ success: true, data: undefined })
  database.run("INSERT INTO folders (uuid, created_at, updated_at, user_uuid, name) VALUES (?, ?, ?, ?, ?)", [
    "delete-folder",
    "2026-08-28T00:00:00.000Z",
    "2026-08-28T00:00:00.000Z",
    user.uuid,
    "Delete folder",
  ])
  database.run("INSERT INTO folders_ciphers (cipher_uuid, folder_uuid) VALUES (?, ?)", [
    "delete-cipher",
    "delete-folder",
  ])
  expect(identityUserDelete(database, user)).toEqual({ success: true, data: undefined })
  expect(database.query("SELECT COUNT(*) AS count FROM users WHERE uuid = ?").get(user.uuid)).toEqual({ count: 0 })
  expect(database.query("SELECT COUNT(*) AS count FROM devices WHERE user_uuid = ?").get(user.uuid)).toEqual({
    count: 0,
  })
  expect(database.query("SELECT COUNT(*) AS count FROM folders WHERE user_uuid = ?").get(user.uuid)).toEqual({
    count: 0,
  })
  expect(
    database.query("SELECT COUNT(*) AS count FROM users_organizations WHERE user_uuid = ?").get(user.uuid),
  ).toEqual({ count: 0 })
})
