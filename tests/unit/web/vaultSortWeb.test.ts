import { beforeEach, expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import { createComponent } from "solid-js"
import { vaultSortDefault } from "../../../src/shared/vault/vaultSortDefault.js"
import { vaultSortOptions } from "../../../src/shared/vault/vaultSortOptions.js"
import { VaultWorkspace } from "../../../src/web/demo/VaultWorkspace.jsx"
import { vaultEntryListStateCreate } from "../../../src/web/demo/vaultEntryListStateCreate.js"
import type { VaultItem } from "../../../src/web/demo/vaultItemSchema.js"
import { vaultWorkspaceStateCreate } from "../../../src/web/demo/vaultWorkspaceStateCreate.js"
import { vaultItemsSortApply } from "../../../src/web/vault/model/vaultItemsSortApply.js"
import { vaultSortStorageKey } from "../../../src/web/vault/model/vaultSortStorageKey.js"
import { vaultSortStorageLoad } from "../../../src/web/vault/model/vaultSortStorageLoad.js"
import { vaultSortStorageSave } from "../../../src/web/vault/model/vaultSortStorageSave.js"

function makeItem(id: string, title: string, createdAt: string, updatedAt: string): VaultItem {
  return {
    id,
    title,
    category: "login",
    ownership: "personal",
    organizationId: null,
    collectionIds: [],
    folderId: null,
    vault: "Personal",
    favorite: false,
    deletedAt: null,
    deletedDate: null,
    createdAt,
    updatedAt,
  }
}

beforeEach(() => {
  window.localStorage.clear()
})

test("vaultSortStorageLoad returns default when storage key is absent", () => {
  expect(vaultSortStorageLoad()).toBe(vaultSortDefault)
})

test("vaultSortStorageLoad returns persisted value when valid", () => {
  window.localStorage.setItem(vaultSortStorageKey, "updated-newest")
  expect(vaultSortStorageLoad()).toBe("updated-newest")
})

test("vaultSortStorageLoad falls back to Name A–Z default when storage value is corrupt", () => {
  window.localStorage.setItem(vaultSortStorageKey, "invalid-sort-value")
  expect(vaultSortStorageLoad()).toBe("name-az")

  window.localStorage.setItem(vaultSortStorageKey, JSON.stringify({ malicious: true }))
  expect(vaultSortStorageLoad()).toBe("name-az")

  window.localStorage.setItem(vaultSortStorageKey, "")
  expect(vaultSortStorageLoad()).toBe("name-az")
})

test("vaultSortStorageSave persists the validated sort key", async () => {
  vaultSortStorageSave("created-oldest")
  await new Promise((resolve) => setTimeout(resolve, 200))
  expect(window.localStorage.getItem(vaultSortStorageKey)).toBe("created-oldest")
})

test("vaultItemsSortApply orders vault items deterministically across all six options", () => {
  const items: VaultItem[] = [
    makeItem("item-b", "Bravo", "2026-01-01T00:00:00Z", "2026-06-01T00:00:00Z"),
    makeItem("item-a", "Alpha", "2026-03-01T00:00:00Z", "2026-02-01T00:00:00Z"),
    makeItem("item-c", "Charlie", "2026-02-01T00:00:00Z", "2026-05-01T00:00:00Z"),
  ]

  const az = vaultItemsSortApply(items, "name-az").map((i) => i.id)
  expect(az).toEqual(["item-a", "item-b", "item-c"])

  const za = vaultItemsSortApply(items, "name-za").map((i) => i.id)
  expect(za).toEqual(["item-c", "item-b", "item-a"])

  const createdNew = vaultItemsSortApply(items, "created-newest").map((i) => i.id)
  expect(createdNew).toEqual(["item-a", "item-c", "item-b"])

  const createdOld = vaultItemsSortApply(items, "created-oldest").map((i) => i.id)
  expect(createdOld).toEqual(["item-b", "item-c", "item-a"])

  const updatedNew = vaultItemsSortApply(items, "updated-newest").map((i) => i.id)
  expect(updatedNew).toEqual(["item-b", "item-c", "item-a"])

  const updatedOld = vaultItemsSortApply(items, "updated-oldest").map((i) => i.id)
  expect(updatedOld).toEqual(["item-a", "item-c", "item-b"])
})

test("vaultItemsSortApply puts missing and invalid dates last", () => {
  const items: VaultItem[] = [
    makeItem("missing", "Missing", "", ""),
    makeItem("invalid", "Invalid", "not-a-date", "also-not-a-date"),
    makeItem("valid-old", "Old", "2020-01-01T00:00:00Z", "2020-01-01T00:00:00Z"),
    makeItem("valid-new", "New", "2025-01-01T00:00:00Z", "2025-01-01T00:00:00Z"),
  ]

  expect(vaultItemsSortApply(items, "created-newest").map((item) => item.id)).toEqual([
    "valid-new",
    "valid-old",
    "invalid",
    "missing",
  ])
  expect(vaultItemsSortApply(items, "created-oldest").map((item) => item.id)).toEqual([
    "valid-old",
    "valid-new",
    "invalid",
    "missing",
  ])
  expect(vaultItemsSortApply(items, "updated-newest").map((item) => item.id)).toEqual([
    "valid-new",
    "valid-old",
    "invalid",
    "missing",
  ])
  expect(vaultItemsSortApply(items, "updated-oldest").map((item) => item.id)).toEqual([
    "valid-old",
    "valid-new",
    "invalid",
    "missing",
  ])
})

test("vaultWorkspaceStateCreate initializes with persisted sort and applies sorting after filtering", async () => {
  window.localStorage.setItem(vaultSortStorageKey, "name-za")

  const items: VaultItem[] = [
    makeItem("item-1", "Apple", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"),
    makeItem("item-2", "Banana", "2026-01-02T00:00:00Z", "2026-01-02T00:00:00Z"),
    makeItem("item-3", "Cherry", "2026-01-03T00:00:00Z", "2026-01-03T00:00:00Z"),
  ]

  const state = vaultWorkspaceStateCreate({ initialItems: items })

  expect(state.selectedSort()).toBe("name-za")
  expect(state.filteredItems().map((i) => i.id)).toEqual(["item-3", "item-2", "item-1"])

  state.selectSort("name-az")
  expect(state.selectedSort()).toBe("name-az")
  expect(state.filteredItems().map((i) => i.id)).toEqual(["item-1", "item-2", "item-3"])

  // Changing to invalid sort ignores mutation
  state.selectSort("unknown-sort")
  expect(state.selectedSort()).toBe("name-az")

  await new Promise((resolve) => setTimeout(resolve, 200))
  expect(window.localStorage.getItem(vaultSortStorageKey)).toBe("name-az")

  const reloadedState = vaultWorkspaceStateCreate({ initialItems: items })
  expect(reloadedState.selectedSort()).toBe("name-az")
})

test("vaultSortStorageSave ignores stale idle callbacks after rapid changes", async () => {
  const idleCallbacks: Array<() => void> = []
  const originalRequestIdleCallback = globalThis.requestIdleCallback
  Object.defineProperty(globalThis, "requestIdleCallback", {
    configurable: true,
    value: (callback: () => void) => {
      idleCallbacks.push(callback)
      return idleCallbacks.length
    },
  })

  try {
    vaultSortStorageSave("name-za")
    await new Promise((resolve) => setTimeout(resolve, 120))

    vaultSortStorageSave("updated-newest")
    await new Promise((resolve) => setTimeout(resolve, 120))

    expect(idleCallbacks).toHaveLength(2)
    idleCallbacks[1]?.()
    idleCallbacks[0]?.()
    expect(window.localStorage.getItem(vaultSortStorageKey)).toBe("updated-newest")
  } finally {
    if (originalRequestIdleCallback === undefined) {
      Reflect.deleteProperty(globalThis, "requestIdleCallback")
    } else {
      Object.defineProperty(globalThis, "requestIdleCallback", {
        configurable: true,
        value: originalRequestIdleCallback,
      })
    }
  }
})

test("vaultEntryListStateCreate exposes sort options, labels, and handles sort signal", () => {
  const items = [makeItem("item-1", "Apple", "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z")]
  const state = vaultEntryListStateCreate({
    items: () => items,
    selectedItemId: () => "item-1",
    searchQuery: () => "",
    selectedCategory: () => "all",
    selectedVault: () => "all",
    selectedFolder: () => null,
    onSelectItem: () => {},
    onSearchChange: () => {},
    onResetFilter: () => {},
  })

  expect(state.sortOptions()).toEqual(vaultSortOptions.map((opt) => opt.value))
  expect(state.sortOptionLabel("name-az")).toBe("Name A–Z")
  expect(state.sortOptionLabel("updated-newest")).toBe("Updated newest")
  expect(state.sortSignal.get()).toBe("name-az")

  state.sortSignal.set("created-newest")
  expect(state.sortSignal.get()).toBe("created-newest")
})

test("VaultWorkspace exposes and applies all six sort options through its control", async () => {
  const items: VaultItem[] = [
    makeItem("item-zulu", "Zulu", "2026-01-01T00:00:00Z", "2026-04-01T00:00:00Z"),
    makeItem("item-bravo", "Bravo", "2026-03-01T00:00:00Z", "2026-02-01T00:00:00Z"),
    makeItem("item-alpha", "Alpha", "2026-01-02T00:00:00Z", "2026-01-01T00:00:00Z"),
    makeItem("item-charlie", "Charlie", "2026-02-01T00:00:00Z", "2026-03-01T00:00:00Z"),
  ]
  const root = render(() => createComponent(VaultWorkspace, { initialItems: items }))
  const itemList = root.getByRole("list", { name: "Vault Credentials" })
  const itemNames = () =>
    [...itemList.querySelectorAll("button")].map((button) => button.querySelector("p")?.textContent ?? "")
  const sortSelect = root.getByLabelText("Sort vault items") as HTMLSelectElement
  const sortCases = [
    ["name-az", ["Alpha", "Bravo", "Charlie", "Zulu"]],
    ["name-za", ["Zulu", "Charlie", "Bravo", "Alpha"]],
    ["created-newest", ["Bravo", "Charlie", "Alpha", "Zulu"]],
    ["created-oldest", ["Zulu", "Alpha", "Charlie", "Bravo"]],
    ["updated-newest", ["Zulu", "Charlie", "Bravo", "Alpha"]],
    ["updated-oldest", ["Alpha", "Bravo", "Charlie", "Zulu"]],
  ] as const

  expect([...sortSelect.options].map((option) => option.value)).toEqual(vaultSortOptions.map((option) => option.value))
  for (const [sort, expectedNames] of sortCases) {
    fireEvent.change(sortSelect, { target: { value: sort } })
    expect(sortSelect.value).toBe(sort)
    expect(itemNames()).toEqual(expectedNames)
  }

  await new Promise((resolve) => setTimeout(resolve, 200))
  root.unmount()
})
