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

test("vault demo store persists active, deleted, and user-scoped favorite state", () => {
  const storage = storageCreate()
  const first = vaultDemoStoreCreate({ storage, userId: "demo-user-a" })

  expect(first.activeItems().some((item) => item.deletedAt !== null)).toBe(false)
  expect(first.deletedItems().every((item) => item.deletedAt !== null)).toBe(true)

  first.toggleFavorite("item-personal-sapphire")
  expect(first.favoriteItemIds()).toContain("item-personal-sapphire")
  expect(first.favoriteItemIds()).not.toContain("item-github-enterprise")

  const reloaded = vaultDemoStoreCreate({ storage, userId: "demo-user-a" })
  expect(reloaded.activeItems().find((item) => item.id === "item-personal-sapphire")?.favorite).toBe(true)

  const otherUser = vaultDemoStoreCreate({ storage, userId: "demo-user-b" })
  expect(otherUser.favoriteItemIds()).not.toContain("item-personal-sapphire")
  expect(otherUser.activeItems().find((item) => item.id === "item-github-enterprise")?.favorite).toBe(false)
})
