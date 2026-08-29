import { type Accessor, createEffect } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { Organization } from "../schemas/organizationSchema.js"
import type { OrganizationUpdateInput } from "../schemas/organizationUpdateInputSchema.js"

export interface OrganizationSettingsCardProps {
  onUpdateOrg: (input: OrganizationUpdateInput) => Promise<boolean>
  organization: Accessor<Organization | null>
}

export function organizationSettingsCardStateCreate(props: OrganizationSettingsCardProps) {
  const nameSignal = createSignalObject("")
  const billingEmailSignal = createSignalObject("")
  const isSaving = createSignalObject(false)
  const feedbackMessage = createSignalObject<{ error: boolean; text: string } | null>(null)

  createEffect(() => {
    const org = props.organization()
    if (org) {
      nameSignal.set(org.name)
      billingEmailSignal.set(org.billingEmail ?? "")
      feedbackMessage.set(null)
    }
  })

  const handleNameInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    nameSignal.set(target.value)
    feedbackMessage.set(null)
  }

  const handleBillingEmailInput = (event: Event) => {
    const target = event.target as HTMLInputElement
    billingEmailSignal.set(target.value)
    feedbackMessage.set(null)
  }

  const handleSave = async (event: Event) => {
    event.preventDefault()
    const name = nameSignal.get().trim()
    const billingEmail = billingEmailSignal.get().trim()

    if (!name) {
      feedbackMessage.set({ error: true, text: "Organization name cannot be empty." })
      return
    }
    if (!billingEmail?.includes("@")) {
      feedbackMessage.set({ error: true, text: "Please enter a valid billing email." })
      return
    }

    isSaving.set(true)
    feedbackMessage.set(null)
    try {
      const success = await props.onUpdateOrg({ billingEmail, name })
      if (success) {
        feedbackMessage.set({ error: false, text: "Organization settings updated successfully." })
      } else {
        feedbackMessage.set({ error: true, text: "Failed to update organization settings." })
      }
    } finally {
      isSaving.set(false)
    }
  }

  return {
    billingEmail: billingEmailSignal.get,
    feedback: feedbackMessage.get,
    handleBillingEmailInput,
    handleNameInput,
    handleSave,
    isSaving: isSaving.get,
    name: nameSignal.get,
    org: props.organization,
  }
}
