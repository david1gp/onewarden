import { timingSafeEqual } from "node:crypto"

export function constantTimeBytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  const length = Math.max(left.length, right.length)
  const leftPadded = new Uint8Array(length)
  const rightPadded = new Uint8Array(length)
  leftPadded.set(left)
  rightPadded.set(right)

  const bytesEqual = timingSafeEqual(leftPadded, rightPadded)
  return bytesEqual && left.length === right.length
}
