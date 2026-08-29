import { expect, test } from "bun:test"
import { vaultDemoStoreCreate } from "../../../src/web/demo/vaultDemoStoreCreate.js"

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

test("vault demo store clones personal items with distinct ID, Clone prefix title, and personal ownership metadata", () => {
  const storage = storageCreate()
  const store = vaultDemoStoreCreate({ storage, userId: "user-test" })

  const cloneResult = store.cloneItem("item-proton-mail")
  expect(cloneResult.success).toBe(true)
  if (!cloneResult.success) return

  const cloned = cloneResult.data
  expect(cloned.id).not.toBe("item-proton-mail")
  expect(cloned.title).toBe("Clone - ProtonMail Secure Mailbox")
  expect(cloned.ownership).toBe("personal")
  expect(cloned.organizationId).toBeNull()
  expect(cloned.collectionIds).toEqual([])
  expect(cloned.vault).toBe("Personal")
  expect(cloned.favorite).toBe(false)
  expect(cloned.deletedAt).toBeNull()
  expect(cloned.username).toBe("alex.rivera@proton.me")

  // Verify persistence across reload
  const reloaded = vaultDemoStoreCreate({ storage, userId: "user-test" })
  const foundInReload = reloaded.activeItems().find((item) => item.id === cloned.id)
  expect(foundInReload).toBeDefined()
  expect(foundInReload?.title).toBe("Clone - ProtonMail Secure Mailbox")
})

test("vault demo store clones organization items with distinct ID and valid collection metadata", () => {
  const storage = storageCreate()
  const store = vaultDemoStoreCreate({ storage, userId: "user-test" })

  const cloneResult = store.cloneItem("item-github-enterprise")
  expect(cloneResult.success).toBe(true)
  if (!cloneResult.success) return

  const cloned = cloneResult.data
  expect(cloned.id).not.toBe("item-github-enterprise")
  expect(cloned.title).toBe("Clone - GitHub Enterprise")
  expect(cloned.ownership).toBe("organization")
  expect(cloned.organizationId).toBe("organization-acme")
  expect(cloned.collectionIds).toEqual(["collection-engineering"])
  expect(cloned.vault).toBe("Work")
  expect(cloned.favorite).toBe(false)
  expect(cloned.deletedAt).toBeNull()

  const reloaded = vaultDemoStoreCreate({ storage, userId: "user-test" })
  const foundInReload = reloaded.activeItems().find((item) => item.id === cloned.id)
  expect(foundInReload).toBeDefined()
  expect(foundInReload?.title).toBe("Clone - GitHub Enterprise")
})

test("vault demo store moves items to trash: soft-deletes, removes from active list and favorites, preserves for trash", () => {
  const storage = storageCreate()
  const store = vaultDemoStoreCreate({ storage, userId: "user-test" })

  // First ensure item-proton-mail is in active items and is a favorite
  expect(store.favoriteItemIds()).toContain("item-proton-mail")
  expect(store.activeItems().some((item) => item.id === "item-proton-mail")).toBe(true)

  const trashResult = store.moveToTrash("item-proton-mail")
  expect(trashResult.success).toBe(true)
  if (!trashResult.success) return

  expect(trashResult.data.deletedAt).toBeTruthy()
  expect(trashResult.data.favorite).toBe(false)

  // Active items and favorites no longer contain the trashed item
  expect(store.activeItems().some((item) => item.id === "item-proton-mail")).toBe(false)
  expect(store.favoriteItemIds()).not.toContain("item-proton-mail")

  // Deleted items preserve the trashed item
  const trashedItem = store.deletedItems().find((item) => item.id === "item-proton-mail")
  expect(trashedItem).toBeDefined()
  expect(trashedItem?.deletedAt).toBeTruthy()

  // Verify persistence in deleted items across store reload
  const reloaded = vaultDemoStoreCreate({ storage, userId: "user-test" })
  expect(reloaded.activeItems().some((item) => item.id === "item-proton-mail")).toBe(false)
  expect(reloaded.favoriteItemIds()).not.toContain("item-proton-mail")
  const trashedInReload = reloaded.deletedItems().find((item) => item.id === "item-proton-mail")
  expect(trashedInReload).toBeDefined()
  expect(trashedInReload?.title).toBe("ProtonMail Secure Mailbox")
})

test("vault demo store returns error when cloning or trashing non-existent items", () => {
  const storage = storageCreate()
  const store = vaultDemoStoreCreate({ storage, userId: "user-test" })

  const cloneErr = store.cloneItem("item-does-not-exist")
  expect(cloneErr.success).toBe(false)

  const trashErr = store.moveToTrash("item-does-not-exist")
  expect(trashErr.success).toBe(false)
})
