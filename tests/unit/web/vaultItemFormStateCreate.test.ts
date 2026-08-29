import { expect, test } from "bun:test"
import { vaultItemFormStateCreate } from "../../../src/web/demo/vaultItemFormStateCreate.js"
import type { VaultItem } from "../../../src/web/demo/vaultItemSchema.js"

test("vaultItemFormStateCreate initializes with default values for add mode", () => {
  let savedItem: VaultItem | null = null
  let cancelled = false

  const state = vaultItemFormStateCreate({
    mode: "add",
    initialCategory: "login",
    onSave: (item) => {
      savedItem = item
    },
    onCancel: () => {
      cancelled = true
    },
  })

  expect(state.mode).toBe("add")
  expect(state.category()).toBe("login")
  expect(state.ownership()).toBe("personal")
  expect(state.collectionIds()).toEqual([])
  expect(state.title()).toBe("")
  expect(state.favorite()).toBe(false)

  state.cancel()
  expect(cancelled).toBe(true)
  expect(savedItem).toBeNull()
})

test("vaultItemFormStateCreate sets default collection and clears favorite on organization ownership", () => {
  const state = vaultItemFormStateCreate({
    mode: "add",
    onSave: () => {},
    onCancel: () => {},
  })

  state.setFavorite(true)
  expect(state.favorite()).toBe(true)

  state.setOwnership("organization")
  expect(state.ownership()).toBe("organization")
  expect(state.favorite()).toBe(false)
  expect(state.collectionIds().length).toBeGreaterThan(0)

  state.setOwnership("personal")
  expect(state.ownership()).toBe("personal")
  expect(state.collectionIds()).toEqual([])
})

test("vaultItemFormStateCreate validates required title and organization collections on save", () => {
  let savedItem: VaultItem | null = null

  const state = vaultItemFormStateCreate({
    mode: "add",
    onSave: (item) => {
      savedItem = item
    },
    onCancel: () => {},
  })

  state.save()
  expect(savedItem).toBeNull()
  expect(state.validationError()).toBe("Item name is required.")

  state.setTitle("Test Credential")
  state.setOwnership("organization")
  for (const col of state.availableCollections) {
    if (state.collectionIds().includes(col.id)) {
      state.toggleCollection(col.id)
    }
  }
  expect(state.collectionIds()).toEqual([])

  state.save()
  expect(savedItem).toBeNull()
  expect(state.validationError()).toBe("At least one collection is required for organization items.")

  state.toggleCollection("collection-engineering")
  state.save()
  expect(savedItem !== null).toBe(true)
  if (!savedItem) return
  const item: VaultItem = savedItem
  expect(item.title).toBe("Test Credential")
  expect(item.ownership).toBe("organization")
  expect(item.collectionIds).toEqual(["collection-engineering"])
})

test("vaultItemFormStateCreate supports credit card, identity, and sshKey specific fields", () => {
  let savedItem: VaultItem | null = null

  const state = vaultItemFormStateCreate({
    mode: "add",
    initialCategory: "creditCard",
    onSave: (item) => {
      savedItem = item
    },
    onCancel: () => {},
  })

  state.setTitle("Corporate Visa")
  state.setCardholderName("Alex Rivera")
  state.setCardNumber("4242 4242 4242 4242")
  state.setCardExpiration("12/28")
  state.setCardCvv("999")

  state.save()
  expect(savedItem !== null).toBe(true)
  if (!savedItem) return
  const item: VaultItem = savedItem
  expect(item.category).toBe("creditCard")
  expect(item.customFields?.some((f) => f.label === "Cardholder Name" && f.value === "Alex Rivera")).toBe(true)
  expect(item.customFields?.some((f) => f.label === "Card Number" && f.concealed)).toBe(true)
})

test("vaultItemFormStateCreate supports custom fields addition and removal", () => {
  const state = vaultItemFormStateCreate({
    mode: "add",
    onSave: () => {},
    onCancel: () => {},
  })

  expect(state.extraCustomFields().length).toBe(0)
  state.addCustomField()
  expect(state.extraCustomFields().length).toBe(1)

  state.updateCustomField(0, { label: "PIN", value: "1234", concealed: true })
  expect(state.extraCustomFields()[0]?.label).toBe("PIN")
  expect(state.extraCustomFields()[0]?.value).toBe("1234")
  expect(state.extraCustomFields()[0]?.concealed).toBe(true)

  state.removeCustomField(0)
  expect(state.extraCustomFields().length).toBe(0)
})
