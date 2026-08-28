import type { CipherNotification } from "../ciphers/cipherNotification.js"
import type { CipherUserNotification } from "../ciphers/cipherUserNotification.js"
import type { FolderNotification } from "../folders/folderNotification.js"
import type { SendNotification } from "../sends/sendNotification.js"
import type { NotificationAdapter } from "./notificationAdapter.js"
import type { NotificationConnectionRegistry } from "./notificationConnectionRegistry.js"
import { notificationUpdateFrameCreate } from "./notificationUpdateFrameCreate.js"
import type { NotificationUpdate } from "./notificationUpdate.js"

export function notificationAdapterCreate(registry: NotificationConnectionRegistry): NotificationAdapter {
  const sendUpdate = (userIds: readonly string[], update: NotificationUpdate): void => {
    const frame = notificationUpdateFrameCreate(update)
    for (const userId of userIds) registry.send(userId, frame)
  }

  const sendCipherUpdate = (notification: CipherNotification): void => {
    const userIds = notification.userIds ?? (notification.payload.UserId === null ? [] : [notification.payload.UserId])
    if (userIds.length === 0) return
    sendUpdate(userIds, {
      contextId: notification.contextId,
      payload: {
        Id: notification.payload.Id,
        UserId: notification.payload.UserId,
        OrganizationId: notification.payload.OrganizationId,
        CollectionIds: notification.payload.CollectionIds,
        RevisionDate: new Date(notification.payload.RevisionDate),
      },
      type: notification.type,
    })
  }

  const sendFolderUpdate = (notification: FolderNotification): void => {
    sendUpdate([notification.payload.UserId], {
      contextId: notification.contextId,
      payload: {
        Id: notification.payload.Id,
        RevisionDate: new Date(notification.payload.RevisionDate),
        UserId: notification.payload.UserId,
      },
      type: notification.type,
    })
  }

  const sendUserUpdate = (notification: CipherUserNotification): void => {
    sendUpdate([notification.payload.UserId], {
      contextId: notification.contextId,
      payload: {
        UserId: notification.payload.UserId,
        Date: new Date(notification.payload.Date),
      },
      type: notification.type,
    })
  }

  const sendSendUpdate = (notification: SendNotification): void => {
    const userIds = notification.userIds ?? (notification.payload.UserId === null ? [] : [notification.payload.UserId])
    if (userIds.length === 0) return
    sendUpdate(userIds, {
      contextId: notification.contextId,
      payload: {
        Id: notification.payload.Id,
        UserId: notification.payload.UserId,
        OrganizationId: notification.payload.OrganizationId,
        RevisionDate: new Date(notification.payload.RevisionDate),
      },
      type: notification.type,
    })
  }

  return { sendCipherUpdate, sendFolderUpdate, sendSendUpdate, sendUpdate, sendUserUpdate }
}
