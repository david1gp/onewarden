import { createEffect, createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { cipherTypeToCategory } from "../../web/ciphers/model/cipherTypeToCategory.js"
import type { CipherPresentationAdapter } from "../../web/ciphers/ui/cipherPresentationAdapter.js"
import type { CipherItem } from "../../web/ciphers/schemas/cipherItemSchema.js"
import { vaultWorkspaceStateCreate } from "../../web/demo/vaultWorkspaceStateCreate.js"
import type { VaultCollection } from "../../web/vault/model/vaultCollectionSchema.js"
import type { VaultFolder } from "../../web/vault/model/vaultFolderSchema.js"
import type { VaultItem } from "../../web/vault/model/vaultItemSchema.js"
import type { ExtensionBackgroundCipherSummary } from "../background/extensionBackgroundCipherSummarySchema.js"
import type { ExtensionBackgroundCollectionDto } from "../background/extensionBackgroundCollectionDtoSchema.js"
import type { ExtensionBackgroundFolderDto } from "../background/extensionBackgroundFolderDtoSchema.js"
import type { ExtensionLogin } from "../ExtensionLogin.js"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionCipherPresentationAdapterCreate } from "./extensionCipherPresentationAdapterCreate.js"

export function extensionFullWindowVaultStateCreate(
  model: () => ExtensionFullWindowViewModel,
  commands: () => ExtensionFullWindowCommands,
  adapter?: CipherPresentationAdapter,
) {
  const cipherAdapter = adapter ?? extensionCipherPresentationAdapterCreate()
  const modelItems = createMemo(() => extensionFullWindowVaultItemsMap(model()))
  const workspaceItems = createSignalObject<readonly VaultItem[]>([])
  let modelItemsFingerprint = ""
  createEffect(() => {
    const next = modelItems()
    const fingerprint = extensionFullWindowVaultItemsFingerprint(next)
    if (fingerprint === modelItemsFingerprint) return
    modelItemsFingerprint = fingerprint
    workspaceItems.set(next)
  })
  const folders = createMemo(() => extensionFullWindowFoldersMap(model().folders))
  const collections = createMemo(() => extensionFullWindowCollectionsMap(model().collections))
  const fillCipher = (item: CipherItem): void => {
    if (item.type === 1) {
      const login = model().logins.find((candidate) => candidate.id === item.id)
      if (login) commands().loginFill(login)
      return
    }
    if (item.type === 3 || item.type === 4) {
      commands().cipherFill?.(item.id, item.type)
    }
  }
  const workspace = vaultWorkspaceStateCreate({
    adapter: cipherAdapter,
    apiBacked: true,
    collections: collections,
    enableKeyboardWorkflows: true,
    enableUrlSync: false,
    folders: folders,
    fillAvailable: () => model().fillAvailable,
    items: workspaceItems.get,
    loadItemsOnMount: false,
    navigateReplace: (path) => {
      if (typeof window !== "undefined") window.history.replaceState(null, "", path)
    },
    pathname: () => (typeof window === "undefined" ? "/" : window.location.pathname),
    profile: () => undefined,
    onFill: (item) => fillCipher(item),
    search: () => (typeof window === "undefined" ? "" : window.location.search),
    onItemsChange: workspaceItems.set,
  })

  const syncVault = async (): Promise<void> => {
    commands().vaultSync()
  }

  return {
    items: workspaceItems.get,
    folders,
    collections,
    isLoading: () => model().status === "loading" || model().resourcesLoading,
    errorMessage: () => model().errorMessage,
    syncVault,
    workspace: {
      state: workspace,
      actions: workspace,
      profile: () => undefined,
      copyToClipboard: cipherAdapter.copyToClipboard,
      fillAvailable: () => model().fillAvailable,
      onFill: fillCipher,
    },
  }
}

function extensionFullWindowVaultItemsFingerprint(items: readonly VaultItem[]): string {
  return items
    .map((item) =>
      [
        item.id,
        item.title,
        item.category,
        item.vault,
        item.organizationId,
        item.folderId,
        item.favorite,
        item.deletedDate,
        item.archivedDate,
      ].join("\u0000"),
    )
    .join("\u0001")
}

function extensionFullWindowVaultItemsMap(model: ExtensionFullWindowViewModel): readonly VaultItem[] {
  const folders = new Map(model.folders.map((folder) => [folder.id, folder.name]))
  const summaries: Array<ExtensionLogin | ExtensionBackgroundCipherSummary> = [
    ...model.logins,
    ...model.secureNotes,
    ...model.cards,
    ...model.identities,
    ...model.sshKeys,
  ]

  return summaries.map((cipher) => {
    const isLogin = "copyableFields" in cipher
    const folderId = cipher.folderId ?? null
    const organizationId = cipher.organizationId ?? null
    const url = isLogin ? (cipher.uri ?? undefined) : undefined
    const type = isLogin ? 1 : cipher.type
    const copyableFields = isLogin ? cipher.copyableFields : []
    const copyableFieldValue = (key: string) => copyableFields.find((field) => field.key === key)?.value
    const customFields = isLogin
      ? copyableFields
          .filter((field) => field.key.startsWith("custom:"))
          .map((field) => ({ label: field.label, value: field.value, concealed: field.sensitive === true }))
      : undefined
    const favorite = isLogin ? cipher.favorite === true : cipher.favorite === true
    const deletedDate = isLogin ? null : (cipher.deletedDate ?? null)
    const archivedDate = isLogin ? null : (cipher.archivedDate ?? null)
    return {
      id: cipher.id,
      title: cipher.name,
      category: cipherTypeToCategory(type),
      vault: organizationId ? "Organization" : "My Vault",
      ownership: organizationId ? "organization" : "personal",
      organizationId,
      folder: folderId ? (folders.get(folderId) ?? null) : null,
      folderId,
      collectionIds: cipher.collectionIds ?? [],
      username: isLogin ? (cipher.username ?? undefined) : undefined,
      password: isLogin ? copyableFieldValue("password") : undefined,
      url,
      totp: undefined,
      notes: isLogin ? copyableFieldValue("notes") : undefined,
      customFields,
      favorite,
      createdAt: cipher.creationDate ?? cipher.revisionDate ?? "Recently",
      updatedAt: cipher.revisionDate ?? "Recently",
      deletedDate,
      archivedDate,
    }
  })
}

function extensionFullWindowFoldersMap(folders: readonly ExtensionBackgroundFolderDto[]): readonly VaultFolder[] {
  return folders.map((folder) => ({ ...folder }))
}

function extensionFullWindowCollectionsMap(
  collections: readonly ExtensionBackgroundCollectionDto[],
): readonly VaultCollection[] {
  return collections.map((collection) => ({
    id: collection.id,
    organizationId: collection.organizationId,
    name: collection.name,
    externalId: collection.externalId,
    hidePasswords: collection.hidePasswords,
    readOnly: collection.readOnly,
    object: "collection",
  }))
}
