import { expect, test } from "bun:test"
import { vaultEntryDetailStateCreate } from "../../../src/web/demo/vaultEntryDetailStateCreate.js"
import type { VaultItem } from "../../../src/web/demo/vaultItemSchema.js"

const testItem: VaultItem = {
  id: "item-detail-test",
  title: "Test Entry",
  category: "login",
  ownership: "personal",
  organizationId: null,
  collectionIds: [],
  folderId: null,
  favorite: false,
  deletedAt: null,
  createdAt: "2026-08-29 10:00",
  updatedAt: "2026-08-29 10:00",
}

test("vaultEntryDetailStateCreate triggers clone handler with item id", () => {
  let clonedId = ""
  const state = vaultEntryDetailStateCreate({
    item: () => testItem,
    onClone: (id) => {
      clonedId = id
    },
  })

  state.handleClone()
  expect(clonedId).toBe("item-detail-test")
})

test("vaultEntryDetailStateCreate manages trash confirmation dialog open state and triggers onMoveToTrash on confirm", () => {
  let trashedId = ""
  const state = vaultEntryDetailStateCreate({
    item: () => testItem,
    onMoveToTrash: (id) => {
      trashedId = id
    },
  })

  expect(state.isTrashDialogOpen()).toBe(false)

  state.openTrashDialog()
  expect(state.isTrashDialogOpen()).toBe(true)

  state.closeTrashDialog()
  expect(state.isTrashDialogOpen()).toBe(false)

  state.openTrashDialog()
  expect(state.isTrashDialogOpen()).toBe(true)

  state.confirmMoveToTrash()
  expect(state.isTrashDialogOpen()).toBe(false)
  expect(trashedId).toBe("item-detail-test")
})
