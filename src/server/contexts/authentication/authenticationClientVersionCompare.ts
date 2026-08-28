import type { AuthenticationClientVersion } from "./authenticationClientVersionSchema.js"

export function authenticationClientVersionCompare(
  left: AuthenticationClientVersion,
  right: AuthenticationClientVersion,
): -1 | 0 | 1 {
  for (const field of ["major", "minor", "patch"] as const) {
    if (left[field] < right[field]) return -1
    if (left[field] > right[field]) return 1
  }
  if (left.preRelease.length === 0 && right.preRelease.length === 0) return 0
  if (left.preRelease.length === 0) return 1
  if (right.preRelease.length === 0) return -1

  const length = Math.max(left.preRelease.length, right.preRelease.length)
  for (let index = 0; index < length; index += 1) {
    const leftIdentifier = left.preRelease[index]
    const rightIdentifier = right.preRelease[index]
    if (leftIdentifier === undefined) return -1
    if (rightIdentifier === undefined) return 1
    if (leftIdentifier === rightIdentifier) continue
    const leftNumeric = /^\d+$/.test(leftIdentifier)
    const rightNumeric = /^\d+$/.test(rightIdentifier)
    if (leftNumeric && rightNumeric) return authenticationClientVersionNumericCompare(leftIdentifier, rightIdentifier)
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1
    return leftIdentifier < rightIdentifier ? -1 : 1
  }
  return 0
}

function authenticationClientVersionNumericCompare(left: string, right: string): -1 | 0 | 1 {
  const normalizedLeft = left.replace(/^0+(?=\d)/, "")
  const normalizedRight = right.replace(/^0+(?=\d)/, "")
  if (normalizedLeft.length < normalizedRight.length) return -1
  if (normalizedLeft.length > normalizedRight.length) return 1
  if (normalizedLeft === normalizedRight) return 0
  return normalizedLeft < normalizedRight ? -1 : 1
}
