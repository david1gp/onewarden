import { expect, test } from "bun:test"
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
