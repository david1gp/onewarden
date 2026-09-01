/**
 * Isomorphic constant-time string comparison.
 *
 * `constantTimeStringsEqual` relies on `node:crypto`, which is unavailable in browser bundles.
 * This variant compares UTF-8 bytes with a branch-free XOR accumulator so it can be used by
 * browser-side code (for example SSO `state` verification) without a Node runtime.
 */
export function constantTimeTextEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder()
  const leftBytes = encoder.encode(left)
  const rightBytes = encoder.encode(right)
  const length = Math.max(leftBytes.length, rightBytes.length)

  let difference = leftBytes.length ^ rightBytes.length
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0)
  }

  return difference === 0
}
