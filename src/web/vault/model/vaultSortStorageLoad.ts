import * as v from "valibot"
import { vaultSortDefault } from "../../../shared/vault/vaultSortDefault.js"
import { type VaultSort, vaultSortSchema } from "../../../shared/vault/vaultSortSchema.js"
import { vaultSortStorageKey } from "./vaultSortStorageKey.js"

/** Reads the persisted vault sort, falling back to the default when absent or invalid. */
export function vaultSortStorageLoad(): VaultSort {
  if (typeof window === "undefined") return vaultSortDefault

  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(vaultSortStorageKey)
  } catch {
    return vaultSortDefault
  }

  if (raw === null) return vaultSortDefault

  const parsed = v.safeParse(vaultSortSchema, raw)
  if (!parsed.success) return vaultSortDefault
  return parsed.output
}
