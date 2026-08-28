import type { NotificationMessagePackValue } from "./notificationMessagePackEncode.js"
import { notificationMessagePackEncode } from "./notificationMessagePackEncode.js"

export function notificationMessagePackFrameCreate(value: NotificationMessagePackValue): Uint8Array {
  const payload = notificationMessagePackEncode(value)
  const frame: number[] = []
  let size = payload.length
  do {
    let part = size & 0x7f
    size >>>= 7
    if (size > 0) part |= 0x80
    frame.push(part)
  } while (size > 0)
  frame.push(...payload)
  return Uint8Array.from(frame)
}
