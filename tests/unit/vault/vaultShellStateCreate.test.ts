import { expect, test } from "bun:test"
import { vaultShellStateCreate } from "../../../src/web/vault/ui/vaultShellStateCreate.js"

test("vaultShellStateCreate initializes with provided items and folders", () => {
  const state = vaultShellStateCreate({
    initialItems: [
      {
        id: "item-1",
        title: "Test Item",
        category: "login",
        vault: "Personal",
        favorite: false,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ],
    initialFolders: [{ id: "f-1", name: "Folder 1" }],
    initialCollections: [{ id: "col-1", organizationId: "org-1", name: "Col 1" }],
  })

  expect(state.items().length).toBe(1)
  expect(state.folders().length).toBe(1)
  expect(state.collections().length).toBe(1)
  expect(state.isLoading()).toBe(false)
  expect(state.errorMessage()).toBeNull()
})
