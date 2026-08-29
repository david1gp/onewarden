import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { vaultNavStateCreate } from "../../../src/web/demo/vaultNavStateCreate.js"
import type { VaultItem } from "../../../src/web/vault/model/vaultItemSchema.js"

function testItemCreate(overrides: Partial<VaultItem>): VaultItem {
  return {
    id: "item-personal",
    title: "Personal item",
    category: "login",
    ownership: "personal",
    organizationId: null,
    collectionIds: [],
    vault: "My Vault",
    favorite: false,
    deletedAt: null,
    createdAt: "2026-08-29T00:00:00.000Z",
    updatedAt: "2026-08-29T00:00:00.000Z",
    ...overrides,
  }
}

test("vault nav ownership counts react to active item changes and ignore legacy peer labels", () => {
  createRoot(() => {
    const items = createSignalObject<readonly VaultItem[]>([
      testItemCreate({ id: "item-personal", vault: "Personal" }),
      testItemCreate({
        id: "item-work",
        ownership: "organization",
        organizationId: "organization-acme",
        collectionIds: ["collection-engineering"],
        vault: "Work",
      }),
      testItemCreate({
        id: "item-shared",
        ownership: "organization",
        organizationId: "organization-acme",
        collectionIds: ["collection-engineering"],
        vault: "Shared",
      }),
      testItemCreate({
        id: "item-deleted-org",
        ownership: "organization",
        organizationId: "organization-acme",
        collectionIds: ["collection-engineering"],
        vault: "Work",
        deletedAt: "2026-08-29T00:00:00.000Z",
      }),
    ])
    const state = vaultNavStateCreate({
      items: items.get,
      selectedVault: () => "all",
      selectedCategory: () => "all",
      selectedFolder: () => null,
      onSelectVault: () => {},
      onSelectCategory: () => {},
      onSelectFolder: () => {},
    })

    expect(state.vaultCounts()).toEqual({ personal: 1, organization: 2 })

    items.set([...items.get(), testItemCreate({ id: "item-new-personal" })])

    expect(state.vaultCounts()).toEqual({ personal: 2, organization: 2 })
  })
})
