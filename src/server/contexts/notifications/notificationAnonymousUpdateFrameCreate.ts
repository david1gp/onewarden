import type { NotificationMessagePackValue } from "./notificationMessagePackEncode.js"
import { notificationMessagePackFrameCreate } from "./notificationMessagePackFrameCreate.js"

export function notificationAnonymousUpdateFrameCreate(options: {
  payload: Readonly<Record<string, NotificationMessagePackValue>>
  type: number
  userId: string
}): Uint8Array {
  return notificationMessagePackFrameCreate([
    1,
    {},
    null,
    "AuthRequestResponseRecieved",
    [
      {
        Type: options.type,
        Payload: options.payload,
        UserId: options.userId,
      },
    ],
  ])
}
