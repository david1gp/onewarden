import { expect, test } from "bun:test"
import * as v from "valibot"
import { vaultSortApply } from "../../../src/shared/vault/vaultSortApply.js"
import { vaultSortCompare } from "../../../src/shared/vault/vaultSortCompare.js"
import { vaultSortDefault } from "../../../src/shared/vault/vaultSortDefault.js"
import type { VaultSortItem } from "../../../src/shared/vault/vaultSortItem.js"
import { vaultSortOptions } from "../../../src/shared/vault/vaultSortOptions.js"
import { vaultSortSchema } from "../../../src/shared/vault/vaultSortSchema.js"

const items: readonly VaultSortItem[] = [
  { id: "id-zeta", name: "zeta", creationDate: "2024-01-01T00:00:00Z", revisionDate: "2024-01-04T00:00:00Z" },
  { id: "id-beta", name: "beta", creationDate: "2024-01-03T00:00:00Z", revisionDate: "2024-01-02T00:00:00Z" },
  { id: "id-alpha-upper", name: "Alpha", creationDate: "2024-01-02T00:00:00Z", revisionDate: "2024-01-03T00:00:00Z" },
  { id: "id-alpha-lower", name: "alpha", creationDate: "2024-01-02T00:00:00Z", revisionDate: "2024-01-03T00:00:00Z" },
]

function sortedIds(sort: Parameters<typeof vaultSortApply>[1]): string[] {
  return vaultSortApply(items, sort).map((item) => item.id)
}

test("vault sort definitions expose the six modes and Name A–Z default", () => {
  expect(vaultSortDefault).toBe("name-az")
  expect(vaultSortOptions).toEqual([
    { value: "name-az", label: "Name A–Z" },
    { value: "name-za", label: "Name Z–A" },
    { value: "created-newest", label: "Created newest" },
    { value: "created-oldest", label: "Created oldest" },
    { value: "updated-newest", label: "Updated newest" },
    { value: "updated-oldest", label: "Updated oldest" },
  ])
  expect(v.safeParse(vaultSortSchema, "updated-oldest").success).toBe(true)
  expect(v.safeParse(vaultSortSchema, "unknown").success).toBe(false)
})

test("vaultSortApply sorts names A–Z with explicit case-insensitive en-US behavior", () => {
  expect(sortedIds("name-az")).toEqual(["id-alpha-lower", "id-alpha-upper", "id-beta", "id-zeta"])
})

test("vaultSortCompare uses the explicit en-US locale for names", () => {
  const apple = { id: "apple", name: "apple" }
  const orebro = { id: "orebro", name: "Örebro" }
  const zulu = { id: "zulu", name: "Zulu" }

  expect(vaultSortCompare("name-az", apple, orebro)).toBeLessThan(0)
  expect(vaultSortCompare("name-az", orebro, zulu)).toBeLessThan(0)
})

test("vaultSortApply sorts names Z–A and keeps ID tie-breaks ascending", () => {
  expect(sortedIds("name-za")).toEqual(["id-zeta", "id-beta", "id-alpha-lower", "id-alpha-upper"])
})

test("vaultSortApply sorts created dates newest and oldest", () => {
  expect(sortedIds("created-newest")).toEqual(["id-beta", "id-alpha-lower", "id-alpha-upper", "id-zeta"])
  expect(sortedIds("created-oldest")).toEqual(["id-zeta", "id-alpha-lower", "id-alpha-upper", "id-beta"])
})

test("vaultSortApply sorts updated dates newest and oldest", () => {
  expect(sortedIds("updated-newest")).toEqual(["id-zeta", "id-alpha-lower", "id-alpha-upper", "id-beta"])
  expect(sortedIds("updated-oldest")).toEqual(["id-beta", "id-alpha-lower", "id-alpha-upper", "id-zeta"])
})

test("vaultSortApply puts missing and invalid dates last in both directions", () => {
  const datedItems: readonly VaultSortItem[] = [
    { id: "missing", name: "Missing" },
    { id: "invalid", name: "Invalid", creationDate: "not-a-date", revisionDate: "also-not-a-date" },
    { id: "valid-old", name: "Old", creationDate: "2020-01-01T00:00:00Z", revisionDate: "2020-01-01T00:00:00Z" },
    { id: "valid-new", name: "New", creationDate: "2025-01-01T00:00:00Z", revisionDate: "2025-01-01T00:00:00Z" },
  ]

  expect(vaultSortApply(datedItems, "created-newest").map((item) => item.id)).toEqual([
    "valid-new",
    "valid-old",
    "invalid",
    "missing",
  ])
  expect(vaultSortApply(datedItems, "created-oldest").map((item) => item.id)).toEqual([
    "valid-old",
    "valid-new",
    "invalid",
    "missing",
  ])
  expect(vaultSortApply(datedItems, "updated-newest").map((item) => item.id)).toEqual([
    "valid-new",
    "valid-old",
    "invalid",
    "missing",
  ])
  expect(vaultSortApply(datedItems, "updated-oldest").map((item) => item.id)).toEqual([
    "valid-old",
    "valid-new",
    "invalid",
    "missing",
  ])
})

test("vaultSortApply uses name then ID for equal dates and invalid dates", () => {
  const tiedItems: readonly VaultSortItem[] = [
    { id: "id-2", name: "Same", creationDate: "invalid" },
    { id: "id-1", name: "Same", creationDate: "invalid" },
    { id: "id-z", name: "Zulu", creationDate: "2024-01-01T00:00:00Z" },
    { id: "id-a", name: "Alpha", creationDate: "2024-01-01T00:00:00Z" },
  ]

  expect(vaultSortApply(tiedItems, "created-newest").map((item) => item.id)).toEqual(["id-a", "id-z", "id-1", "id-2"])
  expect(vaultSortApply(tiedItems, "created-oldest").map((item) => item.id)).toEqual(["id-a", "id-z", "id-1", "id-2"])
})

test("vaultSortApply does not mutate its input array", () => {
  const original = [...items]
  const result = vaultSortApply(items, "name-za")

  expect(items).toEqual(original)
  expect(result).not.toBe(items)
})
