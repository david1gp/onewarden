import type { VaultSortItem } from "./vaultSortItem.js"
import type { VaultSort } from "./vaultSortSchema.js"

const vaultNameCollator = new Intl.Collator("en-US", {
  caseFirst: "false",
  ignorePunctuation: false,
  numeric: false,
  sensitivity: "base",
  usage: "sort",
})

function compareText(left: string, right: string): number {
  const result = vaultNameCollator.compare(left, right)
  if (result < 0) return -1
  if (result > 0) return 1
  return 0
}

function compareId(left: string, right: string): number {
  const collatedResult = compareText(left, right)
  if (collatedResult !== 0) return collatedResult
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function dateTimestamp(value: string | null | undefined): number | null {
  if (value === undefined || value === null || value.trim().length === 0) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

function compareDate(
  left: string | null | undefined,
  right: string | null | undefined,
  direction: 1 | -1,
): number | null {
  const leftTimestamp = dateTimestamp(left)
  const rightTimestamp = dateTimestamp(right)

  if (leftTimestamp === null || rightTimestamp === null) {
    if (leftTimestamp === rightTimestamp) return null
    return leftTimestamp === null ? 1 : -1
  }

  if (leftTimestamp === rightTimestamp) return null
  return leftTimestamp < rightTimestamp ? direction : -direction
}

function compareTieBreakers(left: VaultSortItem, right: VaultSortItem): number {
  return compareText(left.name, right.name) || compareId(left.id, right.id)
}

export function vaultSortCompare(sort: VaultSort, left: VaultSortItem, right: VaultSortItem): number {
  if (sort === "name-az") return compareText(left.name, right.name) || compareId(left.id, right.id)
  if (sort === "name-za") return compareText(right.name, left.name) || compareId(left.id, right.id)

  const dateField = sort.startsWith("created") ? "creationDate" : "revisionDate"
  const direction = sort.endsWith("newest") ? 1 : -1
  return compareDate(left[dateField], right[dateField], direction) ?? compareTieBreakers(left, right)
}
