import { expect, test } from "bun:test"
import { vaultCardPanMask } from "../../../src/web/demo/vaultCardPanMask.js"
import { vaultEntryListStateCreate } from "../../../src/web/demo/vaultEntryListStateCreate.js"
import type { VaultItem } from "../../../src/web/demo/vaultItemSchema.js"

test("vaultCardPanMask formats newly entered unmasked credit card PANs", () => {
  expect(vaultCardPanMask("4111222233334444")).toBe("4111 •••• •••• 4444")
  expect(vaultCardPanMask("4111 2222 3333 4444")).toBe("4111 •••• •••• 4444")
  expect(vaultCardPanMask("4111-2222-3333-4444")).toBe("4111 •••• •••• 4444")
  expect(vaultCardPanMask("378282246310005")).toBe("3782 •••• •••• 0005")
  expect(vaultCardPanMask("9810")).toBe("•••• •••• •••• 9810")
})

test("vaultCardPanMask preserves already masked fixture card values", () => {
  expect(vaultCardPanMask("4242 •••• •••• 8819")).toBe("4242 •••• •••• 8819")
  expect(vaultCardPanMask("4111 •••• •••• 9810")).toBe("4111 •••• •••• 9810")
  expect(vaultCardPanMask("4000 •••• •••• 1192")).toBe("4000 •••• •••• 1192")
})

test("vaultEntryListStateCreate masks newly entered card PAN in list subtitle", () => {
  const newlyCreatedCard: VaultItem = {
    id: "item-new-card",
    title: "New Travel Card",
    category: "creditCard",
    ownership: "personal",
    organizationId: null,
    collectionIds: [],
    folderId: null,
    favorite: false,
    deletedAt: null,
    customFields: [
      { label: "Cardholder Name", value: "Alex Rivera" },
      { label: "Card Number", value: "5555444433332222", concealed: true },
    ],
    createdAt: "2026-08-29 10:00",
    updatedAt: "2026-08-29 10:00",
  }

  const state = vaultEntryListStateCreate({
    items: () => [newlyCreatedCard],
    selectedItemId: () => null,
    searchQuery: () => "",
    selectedCategory: () => "creditCard",
    selectedVault: () => "all",
    selectedFolder: () => null,
    onSelectItem: () => {},
    onSearchChange: () => {},
    onResetFilter: () => {},
  })

  const subtitle = state.getItemSubtitle(newlyCreatedCard)
  expect(subtitle).toBe("5555 •••• •••• 2222")
  expect(subtitle).not.toContain("5555444433332222")
})
