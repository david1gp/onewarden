import { type Accessor, createEffect } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { OrganizationCollection } from "../schemas/organizationCollectionSchema.js"
import type { OrganizationCollectionAccess } from "../schemas/organizationCollectionAccessSchema.js"
import type { OrganizationMemberInviteInput } from "../schemas/organizationMemberInviteInputSchema.js"
import { organizationMemberRole } from "../schemas/organizationMemberRole.js"

export interface OrganizationMemberInviteDialogProps {
  collections: Accessor<OrganizationCollection[]>
  isOpen: Accessor<boolean>
  onClose: () => void
  onInvite: (input: OrganizationMemberInviteInput) => Promise<boolean>
}

export function organizationMemberInviteDialogStateCreate(props: OrganizationMemberInviteDialogProps) {
  const emailsInputSignal = createSignalObject("")
  const roleSignal = createSignalObject<number>(organizationMemberRole.user)
  const accessAllSignal = createSignalObject(true)
  const collectionAccessSignal = createSignalObject<
    Record<string, { hidePasswords: boolean; manage: boolean; readOnly: boolean }>
  >({})
  const isSubmitting = createSignalObject(false)
  const errorSignal = createSignalObject<string | null>(null)

  createEffect(() => {
    if (props.isOpen()) {
      emailsInputSignal.set("")
      roleSignal.set(organizationMemberRole.user)
      accessAllSignal.set(true)
      collectionAccessSignal.set({})
      errorSignal.set(null)
    }
  })

  const handleEmailsInput = (event: Event) => {
    const target = event.target as HTMLTextAreaElement
    emailsInputSignal.set(target.value)
    errorSignal.set(null)
  }

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
    const rawEmails = emailsInputSignal.get()
    const emails = rawEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0 && e.includes("@"))

    if (emails.length === 0) {
      errorSignal.set("Please provide at least one valid email address.")
      return
    }

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
      const success = await props.onInvite({
        accessAll,
        collections: selectedCols,
        emails,
        type: roleSignal.get(),
      })
      if (success) {
        props.onClose()
      } else {
        errorSignal.set("Failed to send invitations. Please try again.")
      }
    } finally {
      isSubmitting.set(false)
    }
  }

  return {
    accessAll: accessAllSignal.get,
    collectionAccess: collectionAccessSignal.get,
    collections: props.collections,
    emailsInput: emailsInputSignal.get,
    errorMessage: errorSignal.get,
    handleAccessAllToggle,
    handleEmailsInput,
    handleRoleChange,
    handleSubmit,
    isCollectionIncluded,
    isOpen: props.isOpen,
    isSubmitting: isSubmitting.get,
    onClose: props.onClose,
    role: roleSignal.get,
    toggleCollectionIncluded,
    updateCollectionPerm,
  }
}
