import { createEffect, type Accessor } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { OrganizationGroup } from "../schemas/organizationGroupSchema.js"
import type { OrganizationGroupInput } from "../schemas/organizationGroupInputSchema.js"
import type { OrganizationMember } from "../schemas/organizationMemberSchema.js"
import type { OrganizationCollection } from "../schemas/organizationCollectionSchema.js"

export interface OrganizationGroupEditDialogProps {
  collections: Accessor<OrganizationCollection[]>
  group: Accessor<OrganizationGroup | null>
  isOpen: Accessor<boolean>
  members: Accessor<OrganizationMember[]>
  onClose: () => void
  onSave: (groupId: string, input: OrganizationGroupInput) => Promise<boolean>
}

export function organizationGroupEditDialogStateCreate(props: OrganizationGroupEditDialogProps) {
  const initialGroup = props.group()

  const initialColPerms: Record<string, { hidePasswords: boolean; manage: boolean; readOnly: boolean }> = {}
  if (initialGroup?.collections) {
    for (const col of initialGroup.collections) {
      initialColPerms[col.id] = {
        hidePasswords: col.hidePasswords,
        manage: col.manage,
        readOnly: col.readOnly,
      }
    }
  }

  const nameSignal = createSignalObject(initialGroup?.name ?? "")
  const externalIdSignal = createSignalObject(initialGroup?.externalId ?? "")
  const accessAllSignal = createSignalObject(initialGroup?.accessAll ?? false)
  const isSubmittingSignal = createSignalObject(false)
  const errorMessageSignal = createSignalObject<string | null>(null)

  // Selected members (member UUIDs)
  const selectedMemberIdsSignal = createSignalObject<string[]>(initialGroup?.users ?? [])

  // Collection permissions map: colId -> { readOnly: boolean, hidePasswords: boolean, manage: boolean }
  const collectionPermissionsSignal =
    createSignalObject<Record<string, { hidePasswords: boolean; manage: boolean; readOnly: boolean }>>(initialColPerms)

  createEffect(() => {
    const grp = props.group()
    if (grp) {
      nameSignal.set(grp.name)
      externalIdSignal.set(grp.externalId ?? "")
      accessAllSignal.set(grp.accessAll ?? false)
      selectedMemberIdsSignal.set(grp.users ?? [])

      const colPerms: Record<string, { hidePasswords: boolean; manage: boolean; readOnly: boolean }> = {}
      if (grp.collections) {
        for (const col of grp.collections) {
          colPerms[col.id] = {
            hidePasswords: col.hidePasswords,
            manage: col.manage,
            readOnly: col.readOnly,
          }
        }
      }
      collectionPermissionsSignal.set(colPerms)
      errorMessageSignal.set(null)
    }
  })

  const handleClose = () => {
    errorMessageSignal.set(null)
    props.onClose()
  }

  const handleNameInput = (e: Event) => {
    nameSignal.set((e.target as HTMLInputElement).value)
  }

  const handleExternalIdInput = (e: Event) => {
    externalIdSignal.set((e.target as HTMLInputElement).value)
  }

  const handleAccessAllToggle = (checked: boolean) => {
    accessAllSignal.set(checked)
  }

  const isMemberSelected = (memberId: string) => {
    return selectedMemberIdsSignal.get().includes(memberId)
  }

  const toggleMemberSelected = (memberId: string) => {
    const current = selectedMemberIdsSignal.get()
    if (current.includes(memberId)) {
      selectedMemberIdsSignal.set(current.filter((id) => id !== memberId))
    } else {
      selectedMemberIdsSignal.set([...current, memberId])
    }
  }

  const isCollectionIncluded = (collectionId: string) => {
    return collectionId in collectionPermissionsSignal.get()
  }

  const toggleCollectionIncluded = (collectionId: string) => {
    const current = { ...collectionPermissionsSignal.get() }
    if (collectionId in current) {
      delete current[collectionId]
    } else {
      current[collectionId] = { hidePasswords: false, manage: false, readOnly: false }
    }
    collectionPermissionsSignal.set(current)
  }

  const updateCollectionPerm = (
    collectionId: string,
    perm: "readOnly" | "hidePasswords" | "manage",
    checked: boolean,
  ) => {
    const current = { ...collectionPermissionsSignal.get() }
    const existing = current[collectionId] || { hidePasswords: false, manage: false, readOnly: false }
    current[collectionId] = {
      ...existing,
      [perm]: checked,
    }
    collectionPermissionsSignal.set(current)
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    const grp = props.group()
    if (!grp) return

    if (!nameSignal.get().trim()) {
      errorMessageSignal.set("Group name is required.")
      return
    }

    isSubmittingSignal.set(true)
    errorMessageSignal.set(null)

    const collectionsPayload = accessAllSignal.get()
      ? []
      : Object.entries(collectionPermissionsSignal.get()).map(([id, perms]) => ({
          hidePasswords: perms.hidePasswords,
          id,
          manage: perms.manage,
          readOnly: perms.readOnly,
        }))

    const input: OrganizationGroupInput = {
      accessAll: accessAllSignal.get(),
      collections: collectionsPayload,
      externalId: externalIdSignal.get().trim() || null,
      name: nameSignal.get().trim(),
      users: selectedMemberIdsSignal.get(),
    }

    try {
      const success = await props.onSave(grp.id, input)
      if (success) {
        handleClose()
      }
    } catch {
      errorMessageSignal.set("An unexpected error occurred while saving group.")
    } finally {
      isSubmittingSignal.set(false)
    }
  }

  return {
    accessAll: accessAllSignal.get,
    collectionPermissions: collectionPermissionsSignal.get,
    collections: props.collections,
    errorMessage: errorMessageSignal.get,
    externalId: externalIdSignal.get,
    handleAccessAllToggle,
    handleExternalIdInput,
    handleNameInput,
    handleSubmit,
    isCollectionIncluded,
    isMemberSelected,
    isOpen: props.isOpen,
    isSubmitting: isSubmittingSignal.get,
    members: props.members,
    name: nameSignal.get,
    onClose: handleClose,
    selectedMemberIds: selectedMemberIdsSignal.get,
    toggleCollectionIncluded,
    toggleMemberSelected,
    updateCollectionPerm,
  }
}
