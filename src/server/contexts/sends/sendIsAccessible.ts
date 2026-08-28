import type { Clock } from "../../../shared/clock/clock.js"
import type { Send } from "./send.js"

export function sendIsAccessible(send: Send, clock: Clock): boolean {
  if (send.disabled) return false
  const now = clock.now().getTime()
  const expiration = send.expirationDate === null ? undefined : Date.parse(send.expirationDate)
  if (expiration !== undefined && Number.isFinite(expiration) && now >= expiration) return false
  const deletion = Date.parse(send.deletionDate)
  return Number.isFinite(deletion) && now < deletion
}
