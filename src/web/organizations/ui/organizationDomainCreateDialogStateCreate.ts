import { type Accessor } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { OrganizationDomainInput } from "../schemas/organizationDomainInputSchema.js"

export interface OrganizationDomainCreateDialogProps {
  isOpen: Accessor<boolean>
  onClose: () => void
  onCreate: (input: OrganizationDomainInput) => Promise<boolean>
}

export function organizationDomainCreateDialogStateCreate(props: OrganizationDomainCreateDialogProps) {
  const domainNameSignal = createSignalObject("")
  const isSubmittingSignal = createSignalObject(false)
  const errorMessageSignal = createSignalObject<string | null>(null)

  const resetForm = () => {
    domainNameSignal.set("")
    errorMessageSignal.set(null)
  }

  const handleClose = () => {
    resetForm()
    props.onClose()
  }

  const handleDomainNameInput = (e: Event) => {
    domainNameSignal.set((e.target as HTMLInputElement).value)
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    const domainName = domainNameSignal.get().trim().toLowerCase()
    if (!domainName) {
      errorMessageSignal.set("Domain name is required.")
      return
    }

    isSubmittingSignal.set(true)
    errorMessageSignal.set(null)

    try {
      const success = await props.onCreate({ domainName })
      if (success) {
        handleClose()
      }
    } catch {
      errorMessageSignal.set("Failed to claim domain.")
    } finally {
      isSubmittingSignal.set(false)
    }
  }

  return {
    domainName: domainNameSignal.get,
    errorMessage: errorMessageSignal.get,
    handleDomainNameInput,
    handleSubmit,
    isOpen: props.isOpen,
    isSubmitting: isSubmittingSignal.get,
    onClose: handleClose,
  }
}
