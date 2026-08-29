import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { vaultSyncApiFetch } from "../api/vaultSyncApiFetch.js"
import type { VaultCollection } from "../model/vaultCollectionSchema.js"
import type { VaultFolder } from "../model/vaultFolderSchema.js"
import type { VaultItem } from "../model/vaultItemSchema.js"
import { vaultSyncModelMap } from "../model/vaultSyncModelMap.js"
import type { VaultSyncResponse } from "../model/vaultSyncResponseSchema.js"

export interface VaultShellProps {
  initialSyncData?: VaultSyncResponse
  initialItems?: readonly VaultItem[]
  initialFolders?: readonly VaultFolder[]
  initialCollections?: readonly VaultCollection[]
  token?: string
  baseUrl?: string
  enableUrlSync?: boolean
  autoSync?: boolean
  onOpenOrganizations?: () => void
  onOpenSends?: () => void
  onOpenEmergencyAccess?: () => void
  onOpenSettings?: () => void
  onLock?: () => void
  onLogout?: () => void
}

export function vaultShellStateCreate(props: VaultShellProps = {}) {
  const items = createSignalObject<readonly VaultItem[]>(props.initialItems ?? [])
  const folders = createSignalObject<readonly VaultFolder[]>(props.initialFolders ?? [])
  const collections = createSignalObject<readonly VaultCollection[]>(props.initialCollections ?? [])
  const profile = createSignalObject<{ id?: string; name?: string; email?: string } | undefined>(undefined)
  const isLoading = createSignalObject<boolean>(false)
  const errorMessage = createSignalObject<string | null>(null)

  const applySyncResponse = (syncData: VaultSyncResponse) => {
    const mapped = vaultSyncModelMap(syncData)
    items.set(mapped.items)
    folders.set(mapped.folders)
    collections.set(mapped.collections)
    profile.set(mapped.profile)
  }

  if (props.initialSyncData) {
    applySyncResponse(props.initialSyncData)
  }

  const syncVault = async () => {
    isLoading.set(true)
    errorMessage.set(null)

    const result = await vaultSyncApiFetch({
      baseUrl: props.baseUrl,
      token: props.token,
    })

    isLoading.set(false)
    if (!result.success) {
      errorMessage.set(result.errorMessage)
      return
    }

    applySyncResponse(result.data)
  }

  onMount(() => {
    if (props.autoSync && !props.initialSyncData && !props.initialItems) {
      void syncVault()
    }
  })

  return {
    items: items.get,
    folders: folders.get,
    collections: collections.get,
    profile: profile.get,
    isLoading: isLoading.get,
    errorMessage: errorMessage.get,
    syncVault,
    enableUrlSync: props.enableUrlSync ?? true,
  }
}
