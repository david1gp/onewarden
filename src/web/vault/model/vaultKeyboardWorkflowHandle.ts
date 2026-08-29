import type { VaultItem } from "./vaultItemSchema.js"

export interface VaultKeyboardWorkflowOptions {
  filteredItems: () => readonly VaultItem[]
  selectedItemId: () => string | null
  searchQuery: () => string
  activeMobileTab?: () => "nav" | "list" | "detail"
  onSelectItem: (id: string) => void
  onClearSearch: () => void
  onResetFilter?: () => void
  onSetMobileTab?: (tab: "nav" | "list" | "detail") => void
  searchInputElement?: () => HTMLInputElement | null
}

export function vaultKeyboardWorkflowHandle(event: KeyboardEvent, options: VaultKeyboardWorkflowOptions): boolean {
  const target = event.target as HTMLElement | null
  const isFormElement =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target?.isContentEditable ?? false)

  if (event.key === "Escape") {
    if (options.searchQuery().length > 0) {
      event.preventDefault()
      options.onClearSearch()
      if (isFormElement && target instanceof HTMLInputElement) {
        target.blur()
      }
      return true
    }

    if (options.activeMobileTab && options.activeMobileTab() === "detail" && options.onSetMobileTab) {
      event.preventDefault()
      options.onSetMobileTab("list")
      return true
    }

    if (options.onResetFilter) {
      event.preventDefault()
      options.onResetFilter()
      return true
    }

    return false
  }

  if (event.key === "/" && !isFormElement && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault()
    if (options.onSetMobileTab && options.activeMobileTab && options.activeMobileTab() !== "list") {
      options.onSetMobileTab("list")
    }
    const input = options.searchInputElement ? options.searchInputElement() : null
    const searchEl =
      input ??
      (typeof document !== "undefined"
        ? ((document.querySelector(
            'section[aria-label="Vault Items"] input[type="search"]',
          ) as HTMLInputElement | null) ??
          (document.querySelector('input[type="search"]') as HTMLInputElement | null) ??
          (document.querySelector('input[placeholder*="Search"]') as HTMLInputElement | null))
        : null)
    if (searchEl) {
      searchEl.focus()
      searchEl.select()
      return true
    }
    return false
  }

  if (isFormElement && target?.getAttribute("type") !== "search") {
    return false
  }

  const items = options.filteredItems()
  if (items.length === 0) return false

  const currentId = options.selectedItemId()
  const currentIndex = currentId ? items.findIndex((i) => i.id === currentId) : -1

  if (event.key === "ArrowDown") {
    event.preventDefault()
    const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
    const nextItem = items[nextIndex]
    if (nextItem) {
      options.onSelectItem(nextItem.id)
    }
    return true
  }

  if (event.key === "ArrowUp") {
    event.preventDefault()
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
    const prevItem = items[prevIndex]
    if (prevItem) {
      options.onSelectItem(prevItem.id)
    }
    return true
  }

  if (event.key === "Home" && !isFormElement) {
    event.preventDefault()
    const firstItem = items[0]
    if (firstItem) {
      options.onSelectItem(firstItem.id)
    }
    return true
  }

  if (event.key === "End" && !isFormElement) {
    event.preventDefault()
    const lastItem = items[items.length - 1]
    if (lastItem) {
      options.onSelectItem(lastItem.id)
    }
    return true
  }

  return false
}
