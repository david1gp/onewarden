import { notificationMessagePackFrameCreate } from "./notificationMessagePackFrameCreate.js"

export function notificationPingFrameCreate(): Uint8Array {
  return notificationMessagePackFrameCreate([6])
}
