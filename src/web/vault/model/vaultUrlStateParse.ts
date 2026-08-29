import * as v from "valibot"
import { type VaultFilter, vaultFilterSchema } from "./vaultFilterSchema.js"

export function vaultUrlStateParse(search: string): Partial<VaultFilter> {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  const rawObj: Record<string, unknown> = {}

  const vault = params.get("vault")
  if (vault) rawObj.vault = vault

  const category = params.get("category")
  if (category) rawObj.category = category

  const folder = params.get("folder")
  if (folder) rawObj.folder = folder

  const collection = params.get("collection")
  if (collection) rawObj.collection = collection

  const searchQuery = params.get("search") ?? params.get("q")
  if (searchQuery) rawObj.search = searchQuery

  const item = params.get("item")
  if (item) rawObj.selectedItemId = item

  const parsed = v.safeParse(vaultFilterSchema, rawObj)
  if (parsed.success) {
    return parsed.output
  }
  return {}
}
