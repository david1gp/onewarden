import { expect, test } from "bun:test"
import { vaultEntryDetailStateCreate } from "../../../src/web/demo/vaultEntryDetailStateCreate.js"
import type { VaultItem } from "../../../src/web/demo/vaultItemSchema.js"

const item = {
  id: "personal-login",
  title: "Personal Login",
  category: "login",
  ownership: "personal",
  organizationId: null,
  collectionIds: [],
  folderId: null,
  favorite: false,
  createdAt: "2026-08-29T00:00:00.000Z",
  updatedAt: "2026-08-29T00:00:00.000Z",
} as unknown as VaultItem

test("read-only item detail does not persist a favorite before an edit is saved", () => {
  const savedFavoriteIds: string[] = []
  const state = vaultEntryDetailStateCreate({
    item: () => item,
    onToggleFavorite: (id) => savedFavoriteIds.push(id),
  })

  state.toggleFavorite()

  expect(savedFavoriteIds).toEqual([])
})
