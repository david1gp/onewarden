import { type Accessor, createEffect } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { OrganizationCollection } from "../schemas/organizationCollectionSchema.js"
import type { OrganizationMember } from "../schemas/organizationMemberSchema.js"
import type { OrganizationCollectionInput } from "../schemas/organizationCollectionInputSchema.js"
import type { OrganizationCollectionAccess } from "../schemas/organizationCollectionAccessSchema.js"

export interface OrganizationCollectionEditDialogProps {
  collection: Accessor<OrganizationCollection | null>
  isOpen: Accessor<boolean>
  members: Accessor<OrganizationMember[]>
  onClose: () => void
  onSave: (collectionId: string, input: OrganizationCollectionInput) => Promise<boolean>
}

export function organizationCollectionEditDialogStateCreate(props: OrganizationCollectionEditDialogProps) {
  const nameSignal = createSignalObject("")
  const externalIdSignal = createSignalObject("")
  const memberAccessSignal = createSignalObject<
    Record<string, { hidePasswords: boolean; manage: boolean; readOnly: boolean }>
  >({})
  const isSubmitting = createSignalObject(false)
  const errorSignal = createSignalObject<string | null>(null)

  createEffect(() => {
    const col = props.collection()
    if (props.isOpen() && col) {
      nameSignal.set(col.name)
      externalIdSignal.set(col.externalId ?? "")
      const initialMap: Record<string, { hidePasswords: boolean; manage: boolean; readOnly: boolean }> = {}
      for (const u of col.users ?? []) {
        initialMap[u.id] = {
          hidePasswords: u.hidePasswords,
          manage: u.manage,
          readOnly: u.readOnly,
        }
      }
      memberAccessSignal.set(initialMap)
      errorSignal.set(null)
    }
  })

  const handleNameInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    nameSignal.set(target.value)
    errorSignal.set(null)
  }

  const handleExternalIdInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    externalIdSignal.set(target.value)
  }

  const toggleMemberIncluded = (memberId: string) => {
    const current = { ...memberAccessSignal.get() }
    if (current[memberId]) {
      delete current[memberId]
    } else {
      current[memberId] = { hidePasswords: false, manage: false, readOnly: false }
    }
    memberAccessSignal.set(current)
  }

  const isMemberIncluded = (memberId: string) => {
    return Boolean(memberAccessSignal.get()[memberId])
  }

  const updateMemberPerm = (memberId: string, field: "hidePasswords" | "manage" | "readOnly", value: boolean) => {
    const current = { ...memberAccessSignal.get() }
    if (!current[memberId]) {
      current[memberId] = { hidePasswords: false, manage: false, readOnly: false }
    }
    current[memberId] = { ...current[memberId], [field]: value }
    memberAccessSignal.set(current)
  }

  const handleSubmit = async (event: Event) => {
    event.preventDefault()
    const col = props.collection()
    if (!col) return

    const name = nameSignal.get().trim()
    if (!name) {
      errorSignal.set("Collection name is required.")
      return
    }

    const assignedUsers: OrganizationCollectionAccess[] = []
    for (const [id, perms] of Object.entries(memberAccessSignal.get())) {
      assignedUsers.push({
        hidePasswords: perms.hidePasswords,
        id,
        manage: perms.manage,
        readOnly: perms.readOnly,
      })
    }

    isSubmitting.set(true)
    errorSignal.set(null)
    try {
      const success = await props.onSave(col.id, {
        externalId: externalIdSignal.get().trim() || null,
        groups: col.groups ?? [],
        name,
        users: assignedUsers,
      })
      if (success) {
        props.onClose()
      } else {
        errorSignal.set("Failed to update collection.")
      }
    } finally {
      isSubmitting.set(false)
    }
  }

  return {
    collection: props.collection,
    errorMessage: errorSignal.get,
    externalId: externalIdSignal.get,
    handleExternalIdInput,
    handleNameInput,
    handleSubmit,
    isMemberIncluded,
    isOpen: props.isOpen,
    isSubmitting: isSubmitting.get,
    memberAccess: memberAccessSignal.get,
    members: props.members,
    name: nameSignal.get,
    onClose: props.onClose,
    toggleMemberIncluded,
    updateMemberPerm,
  }
}
