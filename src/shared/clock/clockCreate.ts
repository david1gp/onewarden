import type { Clock } from "./clock.js"

export function clockCreate(): Clock {
  return { now: () => new Date() }
}
