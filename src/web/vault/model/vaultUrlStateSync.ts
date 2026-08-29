import type { VaultFilter } from "./vaultFilterSchema.js"

let pendingUrlUpdateTimer: ReturnType<typeof setTimeout> | null = null

export function vaultUrlStateSync(filter: VaultFilter): void {
  if (typeof window === "undefined") return

  const schedule = (callback: () => void) => {
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(callback, { timeout: 150 })
    } else {
      setTimeout(callback, 50)
    }
  }

  if (pendingUrlUpdateTimer !== null) {
    clearTimeout(pendingUrlUpdateTimer)
  }

  pendingUrlUpdateTimer = setTimeout(() => {
    schedule(() => {
      const url = new URL(window.location.href)
      const params = url.searchParams

      if (filter.vault && filter.vault !== "all") {
        params.set("vault", filter.vault)
      } else {
        params.delete("vault")
      }

      if (filter.category && filter.category !== "all") {
        params.set("category", filter.category)
      } else {
        params.delete("category")
      }

      if (filter.folder) {
        params.set("folder", filter.folder)
      } else {
        params.delete("folder")
      }

      if (filter.collection) {
        params.set("collection", filter.collection)
      } else {
        params.delete("collection")
      }

      if (filter.search && filter.search.trim().length > 0) {
        params.set("q", filter.search.trim())
      } else {
        params.delete("q")
        params.delete("search")
      }

      if (filter.selectedItemId) {
        params.set("item", filter.selectedItemId)
      } else {
        params.delete("item")
      }

      const newSearch = params.toString()
      const newUrl = `${url.pathname}${newSearch ? `?${newSearch}` : ""}${url.hash}`
      if (newUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
        window.history.replaceState(null, "", newUrl)
      }
    })
  }, 100)
}
