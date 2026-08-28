import { expect, test } from "bun:test"
import { folderNotificationSend } from "../../../src/server/contexts/folders/folderNotificationSend.js"
import { folderUpdateType } from "../../../src/server/contexts/folders/folderUpdateType.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"

const device: IdentityDevice = {
  uuid: "acting-device",
  createdAt: "2026-08-28T00:00:00.000Z",
  updatedAt: "2026-08-28T00:00:00.000Z",
  userUuid: "folder-user",
  name: "Device",
  type: 7,
  pushUuid: null,
  pushToken: null,
  refreshToken: "refresh-token",
  twoFactorRemember: null,
}

const folder = {
  uuid: "folder-one",
  createdAt: "2026-08-28T00:00:00.000Z",
  updatedAt: "2026-08-28T00:00:01.000Z",
  userUuid: "folder-user",
  name: "Folder",
}

test("folder notifications expose upstream update types and sync payload", async () => {
  const notifications: unknown[] = []
  await folderNotificationSend(
    {
      sendFolderUpdate: (notification) => {
        notifications.push(notification)
      },
    },
    folderUpdateType.create,
    folder,
    device,
  )

  expect(folderUpdateType).toEqual({ delete: 3, create: 7, update: 8 })
  expect(notifications).toEqual([
    {
      contextId: "acting-device",
      payload: { Id: "folder-one", RevisionDate: "2026-08-28T00:00:01.000Z", UserId: "folder-user" },
      type: 7,
    },
  ])
})

test("folder notification hook failures do not change a successful folder operation", async () => {
  await expect(
    folderNotificationSend(
      { sendFolderUpdate: async () => Promise.reject(new Error("notification transport failed")) },
      folderUpdateType.delete,
      folder,
      device,
    ),
  ).resolves.toBeUndefined()
})
