import type { NotificationUpdate } from "./notificationUpdate.js"
import { notificationMessagePackFrameCreate } from "./notificationMessagePackFrameCreate.js"

export function notificationUpdateFrameCreate(update: NotificationUpdate): Uint8Array {
  return notificationMessagePackFrameCreate([
    1,
    {},
    null,
    "ReceiveMessage",
    [
      {
        ContextId: update.contextId,
        Type: update.type,
        Payload: update.payload,
      },
    ],
  ])
}
