import { expect, test } from "bun:test"
import { vaultDemoStoreCreate } from "../../../src/web/demo/vaultDemoStoreCreate.js"
import type { VaultItem } from "../../../src/web/demo/vaultItemSchema.js"

function storageCreate() {
  const entries = new Map<string, string>()
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => {
      entries.set(key, value)
    },
    removeItem: (key: string) => {
      entries.delete(key)
    },
  }
}

test("vault demo store saves new personal item and persists across store reload", () => {
  const storage = storageCreate()
  const store = vaultDemoStoreCreate({ storage, userId: "user-1" })

  const newItem: VaultItem = {
    id: "",
    title: "Personal Bitwarden Account",
    category: "login",
    ownership: "personal",
    organizationId: null,
    collectionIds: [],
    folderId: "folder-personal",
    folder: "Personal",
    favorite: true,
    deletedAt: null,
    username: "user@example.com",
    password: "supersecretpassword123",
    url: "https://vault.bitwarden.com",
    createdAt: "",
    updatedAt: "",
  }

  const result = store.saveItem(newItem)
  expect(result.success).toBe(true)
  if (!result.success) return

  expect(result.data.id).toBeTruthy()
  expect(result.data.favorite).toBe(true)
  expect(result.data.vault).toBe("Personal")
  expect(store.favoriteItemIds()).toContain(result.data.id)

  const reloaded = vaultDemoStoreCreate({ storage, userId: "user-1" })
  const found = reloaded.activeItems().find((item) => item.id === result.data.id)
  expect(found).toBeDefined()
  expect(found?.title).toBe("Personal Bitwarden Account")
  expect(found?.favorite).toBe(true)
})

test("vault demo store requires at least one collection for organization items and disables favorites", () => {
  const storage = storageCreate()
  const store = vaultDemoStoreCreate({ storage, userId: "user-1" })

  const invalidOrgItem: VaultItem = {
    id: "item-test-org-invalid",
    title: "Invalid Org Item",
    category: "login",
    ownership: "organization",
    organizationId: "organization-acme",
    collectionIds: [],
    folderId: null,
    favorite: true,
    deletedAt: null,
    createdAt: "",
    updatedAt: "",
  }

  const invalidResult = store.saveItem(invalidOrgItem)
  expect(invalidResult.success).toBe(false)

  const validOrgItem: VaultItem = {
    ...invalidOrgItem,
    collectionIds: ["collection-engineering"],
  }

  const validResult = store.saveItem(validOrgItem)
  expect(validResult.success).toBe(true)
  if (!validResult.success) return

  expect(validResult.data.favorite).toBe(false)
  expect(validResult.data.organizationId).toBe("organization-acme")
  expect(validResult.data.collectionIds).toEqual(["collection-engineering"])
  expect(store.favoriteItemIds()).not.toContain(validResult.data.id)
})

test("vault demo store updates existing item fields and synchronizes favorite state", () => {
  const storage = storageCreate()
  const store = vaultDemoStoreCreate({ storage, userId: "user-1" })

  const existing = store.activeItems().find((item) => item.id === "item-github-enterprise")
  expect(existing).toBeDefined()
  if (!existing) return

  const updatedResult = store.saveItem({
    ...existing,
    title: "GitHub Enterprise (Updated)",
    username: "updated.admin@acme.internal",
  })

  expect(updatedResult.success).toBe(true)
  if (!updatedResult.success) return

  expect(updatedResult.data.title).toBe("GitHub Enterprise (Updated)")
  expect(updatedResult.data.username).toBe("updated.admin@acme.internal")

  const reloaded = vaultDemoStoreCreate({ storage, userId: "user-1" })
  const updatedInReload = reloaded.activeItems().find((item) => item.id === "item-github-enterprise")
  expect(updatedInReload?.title).toBe("GitHub Enterprise (Updated)")
})
