import * as v from "valibot"
import { type VaultFilter, vaultFilterSchema } from "./vaultFilterSchema.js"
import { vaultUrlIdentifierSchema } from "./vaultUrlIdentifierSchema.js"

type UrlIdentifierResult = { valid: boolean; value?: string }

export function vaultUrlStateParse(search: string): Partial<VaultFilter> {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  const rawObj: Record<string, unknown> = {}

  const vault = params.get("vault")
  if (vault) rawObj.vault = vault

  const category = params.get("category")
  if (category) rawObj.category = category

  const folder = urlIdentifierRead(params.get("folder"))
  const collection = urlIdentifierRead(params.get("collection"))
  const item = urlIdentifierRead(params.get("item"))
  if (!folder.valid || !collection.valid || !item.valid) return {}
  if (folder.value !== undefined) rawObj.folder = folder.value
  if (collection.value !== undefined) rawObj.collection = collection.value

  const searchQuery = params.get("search") ?? params.get("q")
  if (searchQuery) rawObj.search = searchQuery

  if (item.value !== undefined) rawObj.selectedItemId = item.value

  const parsed = v.safeParse(vaultFilterSchema, rawObj)
  if (parsed.success) {
    return parsed.output
  }
  return {}
}

function urlIdentifierRead(value: string | null): UrlIdentifierResult {
  if (!value) return { valid: true }
  const parsed = v.safeParse(vaultUrlIdentifierSchema, value)
  if (!parsed.success) return { valid: false }
  return { valid: true, value: parsed.output }
}
