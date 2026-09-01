import type { VaultSort } from "../../../shared/vault/vaultSortSchema.js"
import { vaultSortStorageKey } from "./vaultSortStorageKey.js"

let pendingSaveTimer: ReturnType<typeof setTimeout> | null = null
let pendingSaveRevision = 0

/** Persists the vault sort locally, debounced and scheduled on an idle frame. */
export function vaultSortStorageSave(sort: VaultSort): void {
  if (typeof window === "undefined") return
  const saveRevision = ++pendingSaveRevision

  const schedule = (callback: () => void) => {
    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(callback, { timeout: 150 })
    } else {
      setTimeout(callback, 50)
    }
  }

  if (pendingSaveTimer !== null) clearTimeout(pendingSaveTimer)

  pendingSaveTimer = setTimeout(() => {
    pendingSaveTimer = null
    schedule(() => {
      if (saveRevision !== pendingSaveRevision) return
      try {
        window.localStorage.setItem(vaultSortStorageKey, sort)
      } catch {
        return
      }
    })
  }, 100)
}
