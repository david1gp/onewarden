import type { Event } from "./event.js"

export type EventNotificationAdapter = {
  sendEvent: (event: Event) => void | Promise<void>
}
