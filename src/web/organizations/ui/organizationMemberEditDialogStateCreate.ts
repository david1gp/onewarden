import { type Accessor, createEffect } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { OrganizationMember } from "../schemas/organizationMemberSchema.js"
import type { OrganizationCollection } from "../schemas/organizationCollectionSchema.js"
import type { OrganizationCollectionAccess } from "../schemas/organizationCollectionAccessSchema.js"
import type { OrganizationMemberUpdateInput } from "../schemas/organizationMemberUpdateInputSchema.js"

export interface OrganizationMemberEditDialogProps {
  collections: Accessor<OrganizationCollection[]>
  isOpen: Accessor<boolean>
  member: Accessor<OrganizationMember | null>
  onClose: () => void
  onSave: (memberId: string, input: OrganizationMemberUpdateInput) => Promise<boolean>
}

export function organizationMemberEditDialogStateCreate(props: OrganizationMemberEditDialogProps) {
  const roleSignal = createSignalObject<number>(2)
  const accessAllSignal = createSignalObject(true)
  const collectionAccessSignal = createSignalObject<
    Record<string, { hidePasswords: boolean; manage: boolean; readOnly: boolean }>
  >({})
  const isSubmitting = createSignalObject(false)
  const errorSignal = createSignalObject<string | null>(null)

  createEffect(() => {
    const mem = props.member()
    if (props.isOpen() && mem) {
      roleSignal.set(mem.type)
      accessAllSignal.set(mem.accessAll)
      const initialMap: Record<string, { hidePasswords: boolean; manage: boolean; readOnly: boolean }> = {}
      for (const col of mem.collections ?? []) {
        initialMap[col.id] = {
          hidePasswords: col.hidePasswords,
          manage: col.manage,
          readOnly: col.readOnly,
        }
      }
      collectionAccessSignal.set(initialMap)
      errorSignal.set(null)
    }
  })

  const handleRoleChange = (event: Event) => {
    const target = event.target as HTMLSelectElement
    roleSignal.set(Number(target.value))
  }

  const handleAccessAllToggle = () => {
    accessAllSignal.set(!accessAllSignal.get())
  }

  const toggleCollectionIncluded = (collectionId: string) => {
    const current = { ...collectionAccessSignal.get() }
    if (current[collectionId]) {
      delete current[collectionId]
    } else {
      current[collectionId] = { hidePasswords: false, manage: false, readOnly: false }
    }
    collectionAccessSignal.set(current)
  }

  const isCollectionIncluded = (collectionId: string) => {
    return Boolean(collectionAccessSignal.get()[collectionId])
  }

  const updateCollectionPerm = (
    collectionId: string,
    field: "hidePasswords" | "manage" | "readOnly",
    value: boolean,
  ) => {
    const current = { ...collectionAccessSignal.get() }
    if (!current[collectionId]) {
      current[collectionId] = { hidePasswords: false, manage: false, readOnly: false }
    }
    current[collectionId] = { ...current[collectionId], [field]: value }
    collectionAccessSignal.set(current)
  }

  const handleSubmit = async (event: Event) => {
    event.preventDefault()
    const mem = props.member()
    if (!mem) return

    const accessAll = accessAllSignal.get()
    const selectedCols: OrganizationCollectionAccess[] = []
    if (!accessAll) {
      for (const [id, perms] of Object.entries(collectionAccessSignal.get())) {
        selectedCols.push({
          hidePasswords: perms.hidePasswords,
          id,
          manage: perms.manage,
          readOnly: perms.readOnly,
        })
      }
    }

    isSubmitting.set(true)
    errorSignal.set(null)
    try {
      const success = await props.onSave(mem.id, {
        accessAll,
        collections: selectedCols,
        groups: mem.groups ?? [],
        type: roleSignal.get(),
      })
      if (success) {
        props.onClose()
      } else {
        errorSignal.set("Failed to update member permissions.")
      }
    } finally {
      isSubmitting.set(false)
    }
  }

  return {
    accessAll: accessAllSignal.get,
    collectionAccess: collectionAccessSignal.get,
    collections: props.collections,
    errorMessage: errorSignal.get,
    handleAccessAllToggle,
    handleRoleChange,
    handleSubmit,
    isCollectionIncluded,
    isOpen: props.isOpen,
    isSubmitting: isSubmitting.get,
    member: props.member,
    onClose: props.onClose,
    role: roleSignal.get,
    toggleCollectionIncluded,
    updateCollectionPerm,
  }
}
