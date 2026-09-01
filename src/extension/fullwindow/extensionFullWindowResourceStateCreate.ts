import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { ExtensionBackgroundCipherSummary } from "../background/extensionBackgroundCipherSummarySchema.js"
import type { ExtensionBackgroundCollectionDto } from "../background/extensionBackgroundCollectionDtoSchema.js"
import type { ExtensionProfile } from "../crypto/extensionProfileSchema.js"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionFullWindowUrlSignalCreate } from "./extensionFullWindowUrlSignalCreate.js"

type VaultResourceCipher = Pick<ExtensionBackgroundCipherSummary, "folderId" | "organizationId" | "collectionIds">
type ResourceAction =
  | ""
  | "folder-create"
  | "folder-edit"
  | "folder-delete"
  | "collection-create"
  | "collection-edit"
  | "collection-delete"
type ExtensionOrganization = ExtensionProfile["organizations"][number]

export function extensionFullWindowResourceStateCreate(
  model: () => ExtensionFullWindowViewModel,
  commands: () => ExtensionFullWindowCommands,
) {
  const folderIdSignal = extensionFullWindowUrlSignalCreate("folder")
  const collectionIdSignal = extensionFullWindowUrlSignalCreate("collection")
  const organizationIdSignal = extensionFullWindowUrlSignalCreate("organization")
  const actionSignal = extensionFullWindowUrlSignalCreate("resource-action")
  const nameSignal = createSignalObject("")
  const validationSignal = createSignalObject<string | null>(null)

  const activeOrganizations = createMemo(() =>
    (model().profile?.organizations ?? []).filter((organization) => organization.status === 2),
  )
  const organizationName = (id: string) =>
    activeOrganizations().find((organization) => organization.id === id)?.name ?? `Organization ${id}`
  const selectedOrganization = createMemo(
    () => activeOrganizations().find((organization) => organization.id === organizationIdSignal.get()) ?? null,
  )
  const selectedFolder = createMemo(() => model().folders.find((folder) => folder.id === folderIdSignal.get()) ?? null)
  const selectedCollection = createMemo(
    () => model().collections.find((collection) => collection.id === collectionIdSignal.get()) ?? null,
  )
  const allCiphers = createMemo<VaultResourceCipher[]>(() => [
    ...model().logins,
    ...model().secureNotes,
    ...model().cards,
    ...model().identities,
    ...model().sshKeys,
  ])
  const cipherMatches = (cipher: VaultResourceCipher): boolean => {
    const folderId = folderIdSignal.get()
    if (folderId !== "" && (cipher.folderId ?? null) !== folderId) return false
    const collectionId = collectionIdSignal.get()
    if (collectionId !== "" && !(cipher.collectionIds ?? []).includes(collectionId)) return false
    const organizationId = organizationIdSignal.get()
    if (organizationId !== "" && (cipher.organizationId ?? null) !== organizationId) return false
    return true
  }
  const folderCount = (id: string) => allCiphers().filter((cipher) => cipher.folderId === id).length
  const collectionCount = (id: string) => allCiphers().filter((cipher) => cipher.collectionIds?.includes(id)).length
  const organizationCount = (id: string) => allCiphers().filter((cipher) => cipher.organizationId === id).length
  const filterActive = createMemo(
    () => folderIdSignal.get() !== "" || collectionIdSignal.get() !== "" || organizationIdSignal.get() !== "",
  )
  const filterClear = () => {
    folderIdSignal.set("")
    collectionIdSignal.set("")
    organizationIdSignal.set("")
  }
  const folderOpen = (id: string) => {
    filterClear()
    folderIdSignal.set(id)
  }
  const organizationOpen = (id: string) => {
    filterClear()
    organizationIdSignal.set(id)
  }
  const collectionOpen = (collection: ExtensionBackgroundCollectionDto) => {
    filterClear()
    organizationIdSignal.set(collection.organizationId)
    collectionIdSignal.set(collection.id)
  }

  const organizationFullAccess = (organization: ExtensionOrganization | undefined) =>
    organization?.accessAll === true || organization?.type === 0 || organization?.type === 1
  const collectionCreateAllowed = (organizationId: string) => {
    const organization = activeOrganizations().find((entry) => entry.id === organizationId)
    return organizationFullAccess(organization) || organization?.permissions?.createNewCollections === true
  }
  const collectionManageAllowed = (collection: ExtensionBackgroundCollectionDto, permission: "edit" | "delete") => {
    if (collection.readOnly === true || collection.unmanaged === true) return false
    if (collection.hidePasswords === true && collection.manage !== true) return false
    const organization = activeOrganizations().find((entry) => entry.id === collection.organizationId)
    if (organizationFullAccess(organization)) return true
    if (permission === "edit" && organization?.permissions?.editAnyCollection === true) return true
    if (permission === "delete" && organization?.permissions?.deleteAnyCollection === true) return true
    return collection.assigned !== false && collection.manage === true
  }

  const actionOpen = (action: ResourceAction, name = "") => {
    nameSignal.set(name)
    validationSignal.set(null)
    actionSignal.set(action)
  }
  const actionCancel = () => {
    actionSignal.set("")
    validationSignal.set(null)
  }
  const formSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    const name = nameSignal.get().trim()
    if (name === "") {
      validationSignal.set("Name is required.")
      return
    }
    const action = actionSignal.get() as ResourceAction
    const folder = selectedFolder()
    const organization = selectedOrganization()
    const collection = selectedCollection()
    if (action === "folder-create") commands().folderCreate({ id: crypto.randomUUID(), name, object: "folder" })
    if (action === "folder-edit" && folder !== null) commands().folderUpdate({ ...folder, name })
    if (action === "collection-create" && organization !== null) {
      commands().collectionCreate({
        id: crypto.randomUUID(),
        organizationId: organization.id,
        name,
        object: "collection",
        assigned: true,
        manage: true,
      })
    }
    if (action === "collection-edit" && collection !== null) commands().collectionUpdate({ ...collection, name })
    actionCancel()
  }
  const deleteConfirm = () => {
    const action = actionSignal.get()
    const folder = selectedFolder()
    const collection = selectedCollection()
    if (action === "folder-delete" && folder !== null) {
      commands().folderDelete(folder.id)
      filterClear()
    }
    if (action === "collection-delete" && collection !== null) {
      commands().collectionDelete(collection)
      filterClear()
    }
    actionCancel()
  }

  return {
    nameSignal,
    validation: validationSignal.get,
    folders: () => model().folders,
    collections: () => model().collections,
    activeOrganizations,
    selectedOrganization,
    selectedFolder,
    selectedCollection,
    organizationName,
    folderCount,
    collectionCount,
    organizationCount,
    allCount: () => allCiphers().length,
    filterActive,
    cipherMatches,
    filterClear,
    folderOpen,
    organizationOpen,
    collectionOpen,
    resourcesLoading: () => model().resourcesLoading,
    busy: () => model().busy,
    collectionCreateAllowed,
    collectionCreateAvailable: () => {
      const organization = selectedOrganization()
      return organization !== null && collectionCreateAllowed(organization.id)
    },
    collectionEditAllowed: (collection: ExtensionBackgroundCollectionDto) =>
      collectionManageAllowed(collection, "edit"),
    collectionDeleteAllowed: (collection: ExtensionBackgroundCollectionDto) =>
      collectionManageAllowed(collection, "delete"),
    action: actionSignal.get,
    actionOpen,
    actionCancel,
    formSubmit,
    deleteConfirm,
  }
}
