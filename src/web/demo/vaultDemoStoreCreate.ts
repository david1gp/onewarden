import { createMemo, createRoot } from "solid-js"
import * as v from "valibot"
import { type Result } from "#result"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { vaultDemoData } from "./vaultDemoData.js"
import { type VaultItem, vaultItemSchema } from "./vaultItemSchema.js"
import { vaultTrashDemoData } from "./vaultTrashDemoData.js"

interface VaultDemoStoreStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

interface VaultDemoStoreOptions {
  storage?: VaultDemoStoreStorage
  userId?: string
  activeItems?: readonly VaultItem[]
  deletedItems?: readonly VaultItem[]
}

const vaultDemoStoreSnapshotSchema = v.object({
  version: v.literal(1),
  activeItems: v.array(vaultItemSchema),
  deletedItems: v.array(vaultItemSchema),
  favoritesByUser: v.record(v.string(), v.array(v.string())),
})

type VaultDemoStoreSnapshot = v.InferOutput<typeof vaultDemoStoreSnapshotSchema>

const vaultDemoStoreStorageKey = "onewarden_demo_vault_store"
const defaultUserId = "demo-user-alex-rivera"

function vaultDemoStoreMemoryStorageCreate(): VaultDemoStoreStorage {
  const entries = new Map<string, string>()
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  }
}

function vaultDemoStoreStorageResolve(): VaultDemoStoreStorage {
  if (typeof window === "undefined") return vaultDemoStoreMemoryStorageCreate()
  try {
    return window.sessionStorage
  } catch {
    return vaultDemoStoreMemoryStorageCreate()
  }
}

function vaultDemoStoreItemsHaveUniqueIds(items: readonly VaultItem[]): boolean {
  const ids = new Set<string>()
  for (const item of items) {
    if (ids.has(item.id)) return false
    ids.add(item.id)
  }
  return true
}

function vaultDemoStoreSnapshotIsValid(snapshot: VaultDemoStoreSnapshot): boolean {
  if (!vaultDemoStoreItemsHaveUniqueIds(snapshot.activeItems)) return false
  if (!vaultDemoStoreItemsHaveUniqueIds(snapshot.deletedItems)) return false

  const activeIds = new Set(snapshot.activeItems.map((item) => item.id))
  if (snapshot.deletedItems.some((item) => activeIds.has(item.id))) return false
  if (snapshot.activeItems.some((item) => item.deletedAt !== null)) return false
  if (snapshot.deletedItems.some((item) => item.deletedAt === null)) return false
  return true
}

function vaultDemoStoreSnapshotLoad(storage: VaultDemoStoreStorage): Result<VaultDemoStoreSnapshot | null> {
  let raw: string | null
  try {
    raw = storage.getItem(vaultDemoStoreStorageKey)
  } catch {
    return resultErrorCreate("vaultDemoStore.snapshotLoad", "Failed to read demo vault session state.")
  }
  if (raw === null || raw.trim() === "") return resultCreate(null)

  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    try {
      storage.removeItem(vaultDemoStoreStorageKey)
    } catch {
      return resultErrorCreate("vaultDemoStore.snapshotLoad", "Failed to clear invalid demo vault session state.")
    }
    return resultCreate(null)
  }

  const parsed = v.safeParse(vaultDemoStoreSnapshotSchema, data)
  if (parsed.success && vaultDemoStoreSnapshotIsValid(parsed.output)) return resultCreate(parsed.output)

  try {
    storage.removeItem(vaultDemoStoreStorageKey)
  } catch {
    return resultErrorCreate("vaultDemoStore.snapshotLoad", "Failed to clear invalid demo vault session state.")
  }
  return resultCreate(null)
}

function vaultDemoStoreSnapshotSave(storage: VaultDemoStoreStorage, snapshot: VaultDemoStoreSnapshot): Result<void> {
  try {
    storage.setItem(vaultDemoStoreStorageKey, JSON.stringify(snapshot))
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate("vaultDemoStore.snapshotSave", "Failed to persist demo vault session state.")
  }
}

function vaultDemoStoreFavoriteIdsResolve(items: readonly VaultItem[]): string[] {
  return items.filter((item) => item.ownership === "personal" && item.favorite).map((item) => item.id)
}

function vaultDemoStoreFavoriteIdsNormalize(items: readonly VaultItem[], favoriteIds: readonly string[]): string[] {
  const eligibleIds = new Set(items.filter((item) => item.ownership === "personal").map((item) => item.id))
  return favoriteIds.filter((id) => eligibleIds.has(id))
}

function vaultDemoStoreItemsFavoriteApply(items: readonly VaultItem[], favoriteIds: ReadonlySet<string>): VaultItem[] {
  return items.map((item) => {
    const favorite = item.ownership === "personal" && favoriteIds.has(item.id)
    if (item.favorite === favorite) return item
    return { ...item, favorite }
  })
}

function vaultDemoStoreSnapshotCreate(
  activeItems: readonly VaultItem[],
  deletedItems: readonly VaultItem[],
  favoritesByUser: Readonly<Record<string, readonly string[]>>,
): VaultDemoStoreSnapshot {
  return {
    version: 1,
    activeItems: [...activeItems],
    deletedItems: [...deletedItems],
    favoritesByUser: Object.fromEntries(
      Object.entries(favoritesByUser).map(([userId, favoriteIds]) => [userId, [...favoriteIds]]),
    ),
  }
}

export function vaultDemoStoreCreate(options: VaultDemoStoreOptions = {}) {
  return createRoot(() => {
    const storage = options.storage ?? vaultDemoStoreStorageResolve()
    const userId = options.userId ?? defaultUserId
    const defaultActiveItems = [...(options.activeItems ?? vaultDemoData)]
    const defaultDeletedItems = [...(options.deletedItems ?? vaultTrashDemoData)]
    const loadedSnapshotResult = vaultDemoStoreSnapshotLoad(storage)
    const loadedSnapshot = loadedSnapshotResult.success ? loadedSnapshotResult.data : null
    const snapshot =
      loadedSnapshot ??
      vaultDemoStoreSnapshotCreate(defaultActiveItems, defaultDeletedItems, {
        [userId]: vaultDemoStoreFavoriteIdsResolve([...defaultActiveItems, ...defaultDeletedItems]),
      })
    const snapshotItems = [...snapshot.activeItems, ...snapshot.deletedItems]
    const normalizedFavoritesByUser = Object.fromEntries(
      Object.entries(snapshot.favoritesByUser).map(([storedUserId, storedFavoriteIds]) => [
        storedUserId,
        vaultDemoStoreFavoriteIdsNormalize(snapshotItems, storedFavoriteIds),
      ]),
    )
    const favoriteIds = normalizedFavoritesByUser[userId] ?? []
    const activeItems = createSignalObject<readonly VaultItem[]>(
      vaultDemoStoreItemsFavoriteApply(snapshot.activeItems, new Set(favoriteIds)),
    )
    const deletedItems = createSignalObject<readonly VaultItem[]>(
      vaultDemoStoreItemsFavoriteApply(snapshot.deletedItems, new Set(favoriteIds)),
    )
    const favoritesByUser = createSignalObject<Record<string, readonly string[]>>({
      ...normalizedFavoritesByUser,
      [userId]: favoriteIds,
    })

    const items = createMemo(() => [...activeItems.get(), ...deletedItems.get()])
    const favoriteItemIds = createMemo(() => favoritesByUser.get()[userId] ?? [])

    const persist = () => {
      vaultDemoStoreSnapshotSave(
        storage,
        vaultDemoStoreSnapshotCreate(activeItems.get(), deletedItems.get(), favoritesByUser.get()),
      )
    }

    const toggleFavorite = (id: string): void => {
      const item = items().find((candidate) => candidate.id === id)
      if (item?.ownership !== "personal") return

      const currentFavoriteIds = favoriteItemIds()
      const nextFavoriteIds = currentFavoriteIds.includes(id)
        ? currentFavoriteIds.filter((favoriteId) => favoriteId !== id)
        : [...currentFavoriteIds, id]
      const nextFavoriteIdSet = new Set(nextFavoriteIds)
      activeItems.set(vaultDemoStoreItemsFavoriteApply(activeItems.get(), nextFavoriteIdSet))
      deletedItems.set(vaultDemoStoreItemsFavoriteApply(deletedItems.get(), nextFavoriteIdSet))
      favoritesByUser.set({ ...favoritesByUser.get(), [userId]: nextFavoriteIds })
      persist()
    }

    const restoreItem = (id: string): void => {
      const item = deletedItems.get().find((candidate) => candidate.id === id)
      if (!item) return

      deletedItems.set(deletedItems.get().filter((candidate) => candidate.id !== id))
      activeItems.set([...activeItems.get(), { ...item, deletedAt: null }])
      persist()
    }

    const permanentlyDeleteItem = (id: string): void => {
      if (!deletedItems.get().some((item) => item.id === id)) return

      deletedItems.set(deletedItems.get().filter((item) => item.id !== id))
      const nextFavoriteIds = favoriteItemIds().filter((favoriteId) => favoriteId !== id)
      if (nextFavoriteIds.length !== favoriteItemIds().length) {
        favoritesByUser.set({ ...favoritesByUser.get(), [userId]: nextFavoriteIds })
      }
      persist()
    }

    const saveItem = (itemInput: VaultItem): Result<VaultItem> => {
      const title = itemInput.title?.trim()
      if (!title) {
        return resultErrorCreate("vaultDemoStore.saveItem", "Title is required.")
      }

      if (
        itemInput.ownership === "organization" &&
        (!itemInput.collectionIds || itemInput.collectionIds.length === 0)
      ) {
        return resultErrorCreate(
          "vaultDemoStore.saveItem",
          "At least one collection is required for organization items.",
        )
      }

      const now = new Date()
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

      const isPersonal = itemInput.ownership === "personal"
      const organizationId = isPersonal ? null : (itemInput.organizationId ?? "organization-acme")
      const collectionIds = isPersonal ? [] : [...(itemInput.collectionIds ?? [])]
      const favorite = isPersonal ? Boolean(itemInput.favorite) : false
      const vault = isPersonal ? "Personal" : (itemInput.vault ?? "Work")

      const existingItem = activeItems.get().find((item) => item.id === itemInput.id)
      const id = itemInput.id?.trim() ? itemInput.id : `item-${Date.now()}`
      const createdAt = existingItem?.createdAt ?? itemInput.createdAt ?? formattedDate
      const updatedAt = formattedDate

      const candidate: VaultItem = {
        ...itemInput,
        id,
        title,
        ownership: itemInput.ownership,
        organizationId,
        collectionIds,
        favorite,
        vault,
        deletedAt: null,
        createdAt,
        updatedAt,
      }

      const parsed = v.safeParse(vaultItemSchema, candidate)
      if (!parsed.success) {
        return resultErrorCreate("vaultDemoStore.saveItem", parsed.issues[0]?.message ?? "Invalid vault item data.")
      }

      const validatedItem = parsed.output

      if (existingItem) {
        activeItems.set(activeItems.get().map((item) => (item.id === validatedItem.id ? validatedItem : item)))
      } else {
        activeItems.set([...activeItems.get(), validatedItem])
      }

      const currentFavoriteIds = favoriteItemIds()
      let nextFavoriteIds = currentFavoriteIds
      if (validatedItem.ownership === "personal" && validatedItem.favorite) {
        if (!currentFavoriteIds.includes(validatedItem.id)) {
          nextFavoriteIds = [...currentFavoriteIds, validatedItem.id]
        }
      } else {
        if (currentFavoriteIds.includes(validatedItem.id)) {
          nextFavoriteIds = currentFavoriteIds.filter((favId) => favId !== validatedItem.id)
        }
      }

      if (nextFavoriteIds !== currentFavoriteIds) {
        favoritesByUser.set({ ...favoritesByUser.get(), [userId]: nextFavoriteIds })
      }

      const nextFavoriteIdSet = new Set(nextFavoriteIds)
      activeItems.set(vaultDemoStoreItemsFavoriteApply(activeItems.get(), nextFavoriteIdSet))
      deletedItems.set(vaultDemoStoreItemsFavoriteApply(deletedItems.get(), nextFavoriteIdSet))

      persist()
      return resultCreate(validatedItem)
    }

    const cloneItem = (id: string): Result<VaultItem> => {
      const source = activeItems.get().find((candidate) => candidate.id === id)
      if (!source) {
        return resultErrorCreate("vaultDemoStore.cloneItem", "Source item not found.")
      }

      const now = new Date()
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`

      const isPersonal = source.ownership === "personal"
      const organizationId = isPersonal ? null : (source.organizationId ?? "organization-acme")
      const collectionIds = isPersonal
        ? []
        : (source.collectionIds ?? []).length > 0
          ? [...(source.collectionIds ?? [])]
          : ["collection-engineering"]
      const vault = isPersonal ? "Personal" : (source.vault ?? "Work")
      const cloneId = `item-${Date.now()}`
      const cloneTitle = `Clone - ${source.title}`

      const candidate: VaultItem = {
        ...source,
        id: cloneId,
        title: cloneTitle,
        ownership: source.ownership,
        organizationId,
        collectionIds,
        favorite: false,
        vault,
        deletedAt: null,
        customFields: source.customFields ? source.customFields.map((f) => ({ ...f })) : undefined,
        createdAt: formattedDate,
        updatedAt: formattedDate,
      }

      const parsed = v.safeParse(vaultItemSchema, candidate)
      if (!parsed.success) {
        return resultErrorCreate(
          "vaultDemoStore.cloneItem",
          parsed.issues[0]?.message ?? "Invalid cloned vault item data.",
        )
      }

      const validatedItem = parsed.output
      activeItems.set([...activeItems.get(), validatedItem])
      persist()
      return resultCreate(validatedItem)
    }

    const moveToTrash = (id: string): Result<VaultItem> => {
      const item = activeItems.get().find((candidate) => candidate.id === id)
      if (!item) {
        return resultErrorCreate("vaultDemoStore.moveToTrash", "Item not found in active vault.")
      }

      const now = new Date()
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      const trashedItem: VaultItem = {
        ...item,
        deletedAt: now.toISOString(),
        favorite: false,
        updatedAt: formattedDate,
      }

      const parsed = v.safeParse(vaultItemSchema, trashedItem)
      if (!parsed.success) {
        return resultErrorCreate(
          "vaultDemoStore.moveToTrash",
          parsed.issues[0]?.message ?? "Invalid trashed vault item data.",
        )
      }

      const validatedItem = parsed.output
      activeItems.set(activeItems.get().filter((candidate) => candidate.id !== id))
      deletedItems.set([...deletedItems.get(), validatedItem])

      const currentFavoriteIds = favoriteItemIds()
      if (currentFavoriteIds.includes(id)) {
        const nextFavoriteIds = currentFavoriteIds.filter((favId) => favId !== id)
        favoritesByUser.set({ ...favoritesByUser.get(), [userId]: nextFavoriteIds })
      }

      persist()
      return resultCreate(validatedItem)
    }

    return {
      userId,
      items,
      activeItems: activeItems.get,
      deletedItems: deletedItems.get,
      favoriteItemIds,
      favoritesByUser: favoritesByUser.get,
      toggleFavorite,
      restoreItem,
      permanentlyDeleteItem,
      saveItem,
      cloneItem,
      moveToTrash,
    }
  })
}
