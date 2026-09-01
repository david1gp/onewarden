import { createEffect, createMemo } from "solid-js"
import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.js"
import type { ExtensionFullWindowAssignmentSource } from "./ExtensionFullWindowAssignmentSource.js"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"

export function extensionFullWindowAssignmentStateCreate(
  model: () => ExtensionFullWindowViewModel,
  commands: () => ExtensionFullWindowCommands,
  source: () => ExtensionFullWindowAssignmentSource,
) {
  const folderSignal = createSignalObject(source().folderId ?? "")
  const collectionIdsSignal = createSignalObject<string[]>(source().collectionIds ?? [])
  let currentCipherId = source().id
  createEffect(() => {
    const item = source()
    if (item.id === currentCipherId) return
    currentCipherId = item.id
    folderSignal.set(item.folderId ?? "")
    collectionIdsSignal.set(item.collectionIds ?? [])
  })
  const organizationId = createMemo(() => source().organizationId ?? null)
  const organization = createMemo(
    () => model().profile?.organizations.find((entry) => entry.id === organizationId()) ?? null,
  )
  const organizationName = createMemo(() => organization()?.name ?? `Organization ${organizationId() ?? ""}`)
  const collections = createMemo(() => model().collections.filter((entry) => entry.organizationId === organizationId()))
  const lockedAssignment = createMemo(() =>
    collections().some(
      (collection) =>
        collectionIdsSignal.get().includes(collection.id) &&
        (collection.readOnly === true || collection.unmanaged === true),
    ),
  )
  const canEdit = createMemo(() => source().edit !== false)
  const folderOptions = () => ["", ...model().folders.map((folder) => folder.id)]
  const folderLabel = (id: string) => model().folders.find((folder) => folder.id === id)?.name ?? "No folder"
  const collectionChecked = (id: string) => collectionIdsSignal.get().includes(id)
  const collectionToggle = (id: string, checked: boolean) => {
    if (checked) {
      collectionIdsSignal.set([...new Set([...collectionIdsSignal.get(), id])])
      return
    }
    collectionIdsSignal.set(collectionIdsSignal.get().filter((entry) => entry !== id))
  }
  const save = () => {
    if (!canEdit() || lockedAssignment()) return
    if (organizationId() === null) {
      commands().cipherMove(source().id, folderSignal.get() || null)
      return
    }
    commands().cipherCollectionsUpdate(source().id, collectionIdsSignal.get())
  }
  const folderValueSignal: SignalObject<string> = { get: folderSignal.get, set: folderSignal.set }

  return {
    organizationId,
    organizationName,
    collections,
    canEdit,
    passwordsHidden: () => source().viewPassword === false,
    lockedAssignment,
    folderValueSignal,
    folderOptions,
    folderLabel,
    collectionChecked,
    collectionToggle,
    busy: () => model().busy,
    save,
  }
}
