import { constantTimeBytesEqual } from "./constantTimeBytesEqual.js"

export function constantTimeStringsEqual(left: string, right: string): boolean {
  return constantTimeBytesEqual(new TextEncoder().encode(left), new TextEncoder().encode(right))
}
