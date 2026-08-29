import type { VaultItem } from "./vaultItemSchema.js"

const defaultFolders: readonly string[] = [
  "Engineering",
  "Family",
  "Finance",
  "Identity",
  "Infrastructure",
  "Personal",
  "Security",
]

export function vaultAvailableFoldersResolve(items: readonly VaultItem[] = []): readonly string[] {
  const folders = new Set<string>(defaultFolders)
  for (const item of items) {
    if (item.folder?.trim()) {
      folders.add(item.folder.trim())
    }
  }
  return [...folders].sort((a, b) => a.localeCompare(b))
}
