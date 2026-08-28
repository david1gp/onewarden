import { expect, test } from "bun:test"
import { notificationAnonymousUpdateFrameCreate } from "../../../src/server/contexts/notifications/notificationAnonymousUpdateFrameCreate.js"
import { cipherNotificationSend } from "../../../src/server/contexts/ciphers/cipherNotificationSend.js"
import { cipherUserNotificationSend } from "../../../src/server/contexts/ciphers/cipherUserNotificationSend.js"
import { folderNotificationSend } from "../../../src/server/contexts/folders/folderNotificationSend.js"
import { folderUpdateType } from "../../../src/server/contexts/folders/folderUpdateType.js"
import { notificationMessagePackEncode } from "../../../src/server/contexts/notifications/notificationMessagePackEncode.js"
import { notificationMessagePackFrameCreate } from "../../../src/server/contexts/notifications/notificationMessagePackFrameCreate.js"
import { notificationPingFrameCreate } from "../../../src/server/contexts/notifications/notificationPingFrameCreate.js"
import { notificationSignalRHandshake } from "../../../src/server/contexts/notifications/notificationSignalRHandshake.js"
import { notificationUpdateFrameCreate } from "../../../src/server/contexts/notifications/notificationUpdateFrameCreate.js"
import { notificationUpdateType } from "../../../src/server/contexts/notifications/notificationUpdateType.js"
import { notificationConnectionRegistryCreate } from "../../../src/server/contexts/notifications/notificationConnectionRegistry.js"
import { notificationAdapterCreate } from "../../../src/server/contexts/notifications/notificationAdapterCreate.js"

const device = {
  uuid: "acting-device",
  createdAt: "2026-08-28T00:00:00.000Z",
  updatedAt: "2026-08-28T00:00:00.000Z",
  userUuid: "user-id",
  name: "Device",
  type: 7,
  pushUuid: null,
  pushToken: null,
  refreshToken: "refresh-token",
  twoFactorRemember: null,
}

test("SignalR handshake accepts the MessagePack protocol and returns the binary record separator response", () => {
  expect([...notificationSignalRHandshake('{"protocol":"messagepack","version":1}\u001e')!]).toEqual([0x7b, 0x7d, 0x1e])
  expect(notificationSignalRHandshake('{"protocol":"json","version":1}\u001e')).toBeUndefined()
  expect(notificationSignalRHandshake("not-json")).toBeUndefined()
})

test("MessagePack framing uses a variable-length payload prefix", () => {
  expect([...notificationMessagePackEncode([6])]).toEqual([0x91, 0x06])
  expect([...notificationMessagePackFrameCreate([6])]).toEqual([0x02, 0x91, 0x06])
  expect([...notificationPingFrameCreate()]).toEqual([0x02, 0x91, 0x06])
})

test("notification frames preserve upstream targets, fields, timestamps, and anonymous spelling", () => {
  const authenticated = notificationUpdateFrameCreate({
    contextId: "acting-device",
    payload: {
      Id: "folder-id",
      RevisionDate: new Date("2026-08-28T00:00:00.000Z"),
      UserId: "user-id",
    },
    type: notificationUpdateType.syncFolderCreate,
  })
  const anonymous = notificationAnonymousUpdateFrameCreate({
    payload: { Id: "auth-request-id", UserId: "user-id" },
    type: notificationUpdateType.authRequestResponse,
    userId: "user-id",
  })

  expect([...authenticated.slice(0, 3)]).toEqual([0x6f, 0x95, 0x01])
  expect([...authenticated]).toContain(0xd7)
  expect(new TextDecoder().decode(anonymous)).toContain("AuthRequestResponseRecieved")
  expect(notificationUpdateType).toEqual({
    authRequest: 15,
    authRequestResponse: 16,
    logOut: 11,
    none: 100,
    syncCipherCreate: 1,
    syncCipherUpdate: 0,
    syncCiphers: 4,
    syncFolderCreate: 7,
    syncFolderDelete: 3,
    syncFolderUpdate: 8,
    syncLoginDelete: 2,
    syncOrgKeys: 6,
    syncSendCreate: 12,
    syncSendDelete: 14,
    syncSendUpdate: 13,
    syncSettings: 10,
    syncVault: 5,
  })
})

test("folder and cipher hooks can share the notification hub adapter", async () => {
  const registry = notificationConnectionRegistryCreate()
  const adapter = notificationAdapterCreate(registry)
  const frames: Uint8Array[] = []
  const remove = registry.add("user-id", "connection", {
    close: () => undefined,
    send: (data) => {
      frames.push(data)
      return true
    },
  })
  const folder = {
    uuid: "folder-id",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    userUuid: "user-id",
    name: "Folder",
  }
  const cipher = {
    uuid: "cipher-id",
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    userUuid: "user-id",
    organizationUuid: null,
    key: null,
    type: 1,
    name: "Cipher",
    notes: null,
    fields: null,
    data: "data",
    passwordHistory: null,
    deletedAt: null,
    reprompt: null,
  }

  await folderNotificationSend(adapter, folderUpdateType.create, folder, device)
  await cipherNotificationSend(adapter, notificationUpdateType.syncCipherCreate, cipher, device)
  await cipherUserNotificationSend(adapter, notificationUpdateType.syncCiphers, "user-id", folder.updatedAt, device)
  expect(frames).toHaveLength(3)
  remove()
})
