import type { VaultCollection } from "../model/vaultCollectionSchema.js"
import type { VaultFolder } from "../model/vaultFolderSchema.js"
import type { VaultItem } from "../model/vaultItemSchema.js"
import type { VaultWorkspaceViewProps } from "./vaultWorkspaceViewProps.js"

export interface VaultShellViewProps {
  readonly workspace: VaultWorkspaceViewProps
  readonly state: {
    readonly items: () => readonly VaultItem[]
    readonly folders: () => readonly VaultFolder[]
    readonly collections: () => readonly VaultCollection[]
    readonly profile: () => { id?: string; name?: string; email?: string } | undefined
    readonly isLoading: () => boolean
    readonly errorMessage: () => string | null
  }
  readonly actions: {
    readonly syncVault: () => Promise<void> | void
    readonly onOpenOrganizations?: () => void
    readonly onOpenSends?: () => void
    readonly onOpenEmergencyAccess?: () => void
    readonly onOpenSettings?: () => void
    readonly onLock?: () => void
    readonly onLogout?: () => void
  }
  readonly enableUrlSync?: boolean
  readonly pathname?: () => string
  readonly search?: () => string
  readonly hash?: () => string
  readonly navigateReplace?: (path: string) => void
}
