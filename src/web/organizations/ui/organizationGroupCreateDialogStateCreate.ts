import { type Accessor } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { OrganizationGroupInput } from "../schemas/organizationGroupInputSchema.js"
import type { OrganizationMember } from "../schemas/organizationMemberSchema.js"
import type { OrganizationCollection } from "../schemas/organizationCollectionSchema.js"

export interface OrganizationGroupCreateDialogProps {
  collections: Accessor<OrganizationCollection[]>
  isOpen: Accessor<boolean>
  members: Accessor<OrganizationMember[]>
  onClose: () => void
  onCreate: (input: OrganizationGroupInput) => Promise<boolean>
}

export function organizationGroupCreateDialogStateCreate(props: OrganizationGroupCreateDialogProps) {
  const nameSignal = createSignalObject("")
  const externalIdSignal = createSignalObject("")
  const accessAllSignal = createSignalObject(false)
  const isSubmittingSignal = createSignalObject(false)
  const errorMessageSignal = createSignalObject<string | null>(null)

  // Selected members (member UUIDs)
  const selectedMemberIdsSignal = createSignalObject<string[]>([])

  // Collection permissions map: colId -> { readOnly: boolean, hidePasswords: boolean, manage: boolean }
  const collectionPermissionsSignal = createSignalObject<
    Record<string, { hidePasswords: boolean; manage: boolean; readOnly: boolean }>
  >({})

  const resetForm = () => {
    nameSignal.set("")
    externalIdSignal.set("")
    accessAllSignal.set(false)
    selectedMemberIdsSignal.set([])
    collectionPermissionsSignal.set({})
    errorMessageSignal.set(null)
  }

  const handleClose = () => {
    resetForm()
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
      const success = await props.onCreate(input)
      if (success) {
        handleClose()
      }
    } catch {
      errorMessageSignal.set("An unexpected error occurred while creating group.")
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
