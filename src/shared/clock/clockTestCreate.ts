import type { Clock } from "./clock.js"

export function clockTestCreate(value: Date | string | number): Clock {
  const timestamp = new Date(value).getTime()
  return { now: () => new Date(timestamp) }
}
