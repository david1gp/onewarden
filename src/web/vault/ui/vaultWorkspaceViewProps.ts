import type { SignalObject } from "#ui/utils/createSignalObject.js"
import type { cipherDialogStateCreate } from "../../ciphers/ui/cipherDialogStateCreate.js"
import type { CipherItem } from "../../ciphers/schemas/cipherItemSchema.js"
import type { VaultCollection } from "../model/vaultCollectionSchema.js"
import type { VaultFolder } from "../model/vaultFolderSchema.js"
import type { VaultItemCategory } from "../model/vaultItemCategorySchema.js"
import type { VaultItem } from "../../demo/vaultItemSchema.js"

export interface VaultWorkspaceViewProps {
  readonly state: {
    readonly navigationItems: () => readonly VaultItem[]
    readonly folders: () => readonly VaultFolder[]
    readonly collections: () => readonly VaultCollection[]
    readonly filteredItems: () => readonly VaultItem[]
    readonly selectedItem: () => VaultItem | null
    readonly selectedCipherItem: () => CipherItem | null
    readonly itemToEdit: () => VaultItem | null
    readonly formMode: () => "none" | "add" | "edit"
    readonly initialAddCategory: () => VaultItem["category"]
    readonly selectedVault: () => string
    readonly selectedCategory: () => VaultItemCategory
    readonly selectedFolder: () => string | null
    readonly selectedCollection: () => string | null
    readonly searchQuery: () => string
    readonly selectedItemId: () => string | null
    readonly selectedSortSignal: SignalObject<string>
    readonly activeMobileTab: () => "nav" | "list" | "detail"
    readonly isApiBacked: boolean
    readonly cipherDialog: ReturnType<typeof cipherDialogStateCreate>
  }
  readonly actions: {
    readonly setMobileTab: (tab: "nav" | "list" | "detail") => void
    readonly setSearchInputElement: (element: HTMLInputElement | null) => void
    readonly selectVault: (vault: string) => void
    readonly selectCategory: (category: string) => void
    readonly selectFolder: (folder: string | null) => void
    readonly selectCollection: (collection: string | null) => void
    readonly selectItem: (id: string) => void
    readonly setSearchQuery: (query: string) => void
    readonly resetFilter: () => void
    readonly startAdd: () => void
    readonly startEdit: () => void
    readonly cancelForm: () => void
    readonly saveItem: (item: VaultItem) => void
    readonly cloneItem: (id: string) => void
    readonly moveToTrash: (id: string) => void
    readonly restoreItem: (id: string) => void
    readonly permanentlyDeleteItem: (id: string) => void
    readonly toggleFavorite: (id: string) => Promise<void> | void
    readonly openCreateDialog: () => void
    readonly openEditDialog: (id?: string) => void
    readonly handleCipherDelete: (id: string, hard: boolean) => Promise<void>
    readonly handleCipherRestore: (id: string) => Promise<void>
    readonly handleCipherArchive: (id: string, archived: boolean) => Promise<void>
    readonly handleCipherClone: (id: string) => Promise<void>
    readonly handleCipherShare: (id: string, organizationId: string, collectionIds: string[]) => Promise<void>
    readonly handleCipherUploadAttachment: (id: string, file: File) => Promise<void>
    readonly handleCipherDeleteAttachment: (id: string, attachmentId: string) => Promise<void>
  }
  readonly profile?: () => { id?: string; name?: string; email?: string } | undefined
  readonly copyToClipboard: (value: string) => Promise<void> | void
  readonly fillAvailable?: () => boolean
  readonly onFill?: (item: CipherItem) => void
}
