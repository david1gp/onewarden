import { afterEach, expect, test } from "bun:test"
import type { PushRelayNotification } from "../../../src/server/contexts/push/pushRelayNotification.js"
import { pushRelayFolderUpdate } from "../../../src/server/contexts/push/pushRelayFolderUpdate.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import { folderUpdateType } from "../../../src/server/contexts/folders/folderUpdateType.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"

const databases: DatabaseConnection[] = []
const device: IdentityDevice = {
  uuid: "acting-device",
  createdAt: "2026-08-28T00:00:00.000Z",
  updatedAt: "2026-08-28T00:00:01.000Z",
  userUuid: "push-user",
  name: "Android",
  type: 0,
  pushUuid: "push-device",
  pushToken: "push-token",
  refreshToken: "refresh-token",
  twoFactorRemember: null,
}
const folder = {
  uuid: "folder-id",
  createdAt: "2026-08-28T00:00:00.000Z",
  updatedAt: "2026-08-28T00:00:02.000Z",
  userUuid: "push-user",
  name: "Folder",
}
const user: IdentityUser = {
  uuid: "push-user",
  enabled: true,
  createdAt: "2026-08-28T00:00:00.000Z",
  updatedAt: "2026-08-28T00:00:00.000Z",
  verifiedAt: null,
  lastVerifyingAt: null,
  loginVerifyCount: 0,
  email: "push-folder@example.com",
  emailNew: null,
  emailNewToken: null,
  name: "Push Folder User",
  passwordHash: new Uint8Array(),
  salt: new Uint8Array(),
  passwordIterations: 100_000,
  passwordHint: null,
  akey: "",
  privateKey: null,
  publicKey: null,
  securityStamp: "push-folder-stamp",
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

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("folder updates dispatch the upstream push payload when a user has a push device", async () => {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  expect(identityDeviceSave(database, device, clockTestCreate(folder.updatedAt), false)).toEqual({
    success: true,
    data: undefined,
  })
  const notifications: PushRelayNotification[] = []

  await pushRelayFolderUpdate(
    {
      registerDevice: async () => resultCreate(undefined),
      unregisterDevice: async () => resultCreate(undefined),
      dispatch: async (notification) => {
        notifications.push(notification)
      },
    },
    folderUpdateType.update,
    folder,
    device,
    database,
  )

  expect(notifications).toEqual([
    {
      userId: "push-user",
      organizationId: null,
      deviceId: "push-device",
      identifier: "acting-device",
      type: 8,
      payload: { id: "folder-id", userId: "push-user", revisionDate: "2026-08-28T00:00:02.000Z" },
      clientType: null,
      installationId: null,
    },
  ])
})

test("folder push dispatch skips users without a registered push token", async () => {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  expect(identityUserSave(database, user)).toEqual({ success: true, data: undefined })
  const noPushDevice = { ...device, pushToken: null }
  expect(identityDeviceSave(database, noPushDevice, clockTestCreate(folder.updatedAt), false)).toEqual({
    success: true,
    data: undefined,
  })
  let dispatched = false

  await pushRelayFolderUpdate(
    {
      registerDevice: async () => resultCreate(undefined),
      unregisterDevice: async () => resultCreate(undefined),
      dispatch: async () => {
        dispatched = true
      },
    },
    folderUpdateType.update,
    folder,
    device,
    database,
  )

  expect(dispatched).toBe(false)
})
