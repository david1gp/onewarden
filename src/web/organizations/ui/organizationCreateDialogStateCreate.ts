import { type Accessor, createEffect } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { OrganizationCreateInput } from "../schemas/organizationCreateInputSchema.js"

export interface OrganizationCreateDialogProps {
  isOpen: Accessor<boolean>
  onClose: () => void
  onCreate: (input: OrganizationCreateInput) => Promise<boolean>
}

export function organizationCreateDialogStateCreate(props: OrganizationCreateDialogProps) {
  const nameSignal = createSignalObject("")
  const billingEmailSignal = createSignalObject("")
  const collectionNameSignal = createSignalObject("Default Collection")
  const isSubmitting = createSignalObject(false)
  const errorSignal = createSignalObject<string | null>(null)

  createEffect(() => {
    if (props.isOpen()) {
      nameSignal.set("")
      billingEmailSignal.set("")
      collectionNameSignal.set("Default Collection")
      errorSignal.set(null)
    }
  })

  const handleNameInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    nameSignal.set(target.value)
    errorSignal.set(null)
  }

  const handleBillingEmailInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    billingEmailSignal.set(target.value)
    errorSignal.set(null)
  }

  const handleCollectionNameInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    collectionNameSignal.set(target.value)
  }

  const handleSubmit = async (event: Event) => {
    event.preventDefault()
    const name = nameSignal.get().trim()
    const billingEmail = billingEmailSignal.get().trim()
    const collectionName = collectionNameSignal.get().trim() || "Default Collection"

    if (!name) {
      errorSignal.set("Organization name is required.")
      return
    }
    if (!billingEmail?.includes("@")) {
      errorSignal.set("Valid billing email is required.")
      return
    }

    isSubmitting.set(true)
    errorSignal.set(null)
    try {
      const success = await props.onCreate({
        billingEmail,
        collectionName,
        name,
      })
      if (success) {
        props.onClose()
      } else {
        errorSignal.set("Failed to create organization. Please try again.")
      }
    } finally {
      isSubmitting.set(false)
    }
  }

  return {
    billingEmail: billingEmailSignal.get,
    collectionName: collectionNameSignal.get,
    errorMessage: errorSignal.get,
    handleBillingEmailInput,
    handleCollectionNameInput,
    handleNameInput,
    handleSubmit,
    isOpen: props.isOpen,
    isSubmitting: isSubmitting.get,
    name: nameSignal.get,
    onClose: props.onClose,
  }
}
