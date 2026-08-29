import { expect, test } from "bun:test"
import { vaultKeyboardWorkflowHandle } from "../../../src/web/vault/model/vaultKeyboardWorkflowHandle.js"
import type { VaultItem } from "../../../src/web/vault/model/vaultItemSchema.js"

const items: readonly VaultItem[] = [
  {
    id: "item-1",
    title: "One",
    category: "login",
    vault: "Personal",
    favorite: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "item-2",
    title: "Two",
    category: "login",
    vault: "Personal",
    favorite: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "item-3",
    title: "Three",
    category: "login",
    vault: "Personal",
    favorite: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
]

test("vaultKeyboardWorkflowHandle selects next item on ArrowDown", () => {
  let selectedId = "item-1"
  const event = new KeyboardEvent("keydown", { key: "ArrowDown" })

  const handled = vaultKeyboardWorkflowHandle(event, {
    filteredItems: () => items,
    selectedItemId: () => selectedId,
    searchQuery: () => "",
    onSelectItem: (id) => {
      selectedId = id
    },
    onClearSearch: () => {},
  })

  expect(handled).toBe(true)
  expect(selectedId).toBe("item-2")
})

test("vaultKeyboardWorkflowHandle selects previous item on ArrowUp", () => {
  let selectedId = "item-2"
  const event = new KeyboardEvent("keydown", { key: "ArrowUp" })

  const handled = vaultKeyboardWorkflowHandle(event, {
    filteredItems: () => items,
    selectedItemId: () => selectedId,
    searchQuery: () => "",
    onSelectItem: (id) => {
      selectedId = id
    },
    onClearSearch: () => {},
  })

  expect(handled).toBe(true)
  expect(selectedId).toBe("item-1")
})

test("vaultKeyboardWorkflowHandle selects first and last on Home and End", () => {
  let selectedId = "item-2"

  vaultKeyboardWorkflowHandle(new KeyboardEvent("keydown", { key: "Home" }), {
    filteredItems: () => items,
    selectedItemId: () => selectedId,
    searchQuery: () => "",
    onSelectItem: (id) => {
      selectedId = id
    },
    onClearSearch: () => {},
  })
  expect(selectedId).toBe("item-1")

  vaultKeyboardWorkflowHandle(new KeyboardEvent("keydown", { key: "End" }), {
    filteredItems: () => items,
    selectedItemId: () => selectedId,
    searchQuery: () => "",
    onSelectItem: (id) => {
      selectedId = id
    },
    onClearSearch: () => {},
  })
  expect(selectedId).toBe("item-3")
})

test("vaultKeyboardWorkflowHandle clears search on Escape when search query is present", () => {
  let searchCleared = false
  const event = new KeyboardEvent("keydown", { key: "Escape" })

  const handled = vaultKeyboardWorkflowHandle(event, {
    filteredItems: () => items,
    selectedItemId: () => "item-1",
    searchQuery: () => "query",
    onSelectItem: () => {},
    onClearSearch: () => {
      searchCleared = true
    },
  })

  expect(handled).toBe(true)
  expect(searchCleared).toBe(true)
})

test("vaultKeyboardWorkflowHandle switches mobile tab to list on Escape in detail tab", () => {
  let tabSwitched = ""
  const event = new KeyboardEvent("keydown", { key: "Escape" })

  const handled = vaultKeyboardWorkflowHandle(event, {
    filteredItems: () => items,
    selectedItemId: () => "item-1",
    searchQuery: () => "",
    activeMobileTab: () => "detail",
    onSelectItem: () => {},
    onClearSearch: () => {},
    onSetMobileTab: (tab) => {
      tabSwitched = tab
    },
  })

  expect(handled).toBe(true)
  expect(tabSwitched).toBe("list")
})

test("vaultKeyboardWorkflowHandle focuses search input and switches mobile tab on / key", () => {
  let tabSwitched = ""
  const event = new KeyboardEvent("keydown", { key: "/" })

  let focused = false
  let selected = false
  const mockInput = {
    focus: () => {
      focused = true
    },
    select: () => {
      selected = true
    },
  } as unknown as HTMLInputElement

  const handled = vaultKeyboardWorkflowHandle(event, {
    filteredItems: () => items,
    selectedItemId: () => "item-1",
    searchQuery: () => "",
    activeMobileTab: () => "detail",
    searchInputElement: () => mockInput,
    onSelectItem: () => {},
    onClearSearch: () => {},
    onSetMobileTab: (tab) => {
      tabSwitched = tab
    },
  })

  expect(handled).toBe(true)
  expect(tabSwitched).toBe("list")
  expect(focused).toBe(true)
  expect(selected).toBe(true)
})
