import { expect, test } from "bun:test"
import type { VaultItem } from "../../../src/web/demo/vaultItemSchema.js"
import { vaultWorkspaceStateCreate } from "../../../src/web/demo/vaultWorkspaceStateCreate.js"

const selectedItemId = "item-github-enterprise"

test("vault workspace hides detail when vault, category, folder, or search filters exclude the selection", () => {
  const filterSelections = [
    (state: ReturnType<typeof vaultWorkspaceStateCreate>) => state.selectVault("Personal"),
    (state: ReturnType<typeof vaultWorkspaceStateCreate>) => state.selectCategory("secureNote"),
    (state: ReturnType<typeof vaultWorkspaceStateCreate>) => state.selectFolder("Personal"),
    (state: ReturnType<typeof vaultWorkspaceStateCreate>) => state.setSearchQuery("AWS"),
  ]

  for (const applyFilter of filterSelections) {
    const state = vaultWorkspaceStateCreate({ defaultSelectedId: selectedItemId })

    expect(state.selectedItem()?.id).toBe(selectedItemId)
    applyFilter(state)
    expect(state.filteredItems().some((item) => item.id === selectedItemId)).toBe(false)
    expect(state.selectedItem()).toBeNull()
  }
})

test("vault workspace keeps detail when the selection remains in the filtered list", () => {
  const state = vaultWorkspaceStateCreate({ defaultSelectedId: selectedItemId })

  state.selectVault("Work")

  expect(state.filteredItems().some((item) => item.id === selectedItemId)).toBe(true)
  expect(state.selectedItem()?.id).toBe(selectedItemId)
})

function alignedItemCreate(overrides: Record<string, unknown>): VaultItem {
  return {
    id: "demo-item",
    title: "Demo item",
    category: "login",
    ownership: "personal",
    organizationId: null,
    collectionIds: [],
    folderId: null,
    favorite: false,
    deletedAt: null,
    createdAt: "2026-08-29T00:00:00.000Z",
    updatedAt: "2026-08-29T00:00:00.000Z",
    ...overrides,
  } as unknown as VaultItem
}

test("vault workspace favorites contain only eligible personal items and remain after filter changes", () => {
  const state = vaultWorkspaceStateCreate({
    initialItems: [
      alignedItemCreate({ id: "personal-favorite", favorite: true }),
      alignedItemCreate({ id: "personal-saved", favorite: false }),
      alignedItemCreate({
        id: "organization-favorite",
        ownership: "organization",
        organizationId: "organization-acme",
        collectionIds: ["collection-engineering"],
        favorite: true,
      }),
    ],
  })

  state.toggleFavorite("personal-saved")
  state.selectCategory("favorites")
  expect(state.filteredItems().map((item) => item.id)).toEqual(["personal-favorite", "personal-saved"])

  state.resetFilter()
  state.selectCategory("favorites")
  expect(state.filteredItems().map((item) => item.id)).toEqual(["personal-favorite", "personal-saved"])
})

test("vault workspace excludes soft-deleted items from active lists", () => {
  const state = vaultWorkspaceStateCreate({
    initialItems: [
      alignedItemCreate({ id: "active-item" }),
      alignedItemCreate({ id: "trashed-item", deletedAt: "2026-08-29T00:00:00.000Z" }),
    ],
  })

  expect(state.filteredItems().map((item) => item.id)).toEqual(["active-item"])
})
