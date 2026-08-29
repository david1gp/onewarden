import { createEffect, type Accessor } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { OrganizationPolicy } from "../schemas/organizationPolicySchema.js"
import type { OrganizationPolicyInput } from "../schemas/organizationPolicyInputSchema.js"
import { organizationPolicyNameResolve } from "../api/organizationPolicyNameResolve.js"
import { organizationPolicyDescriptionResolve } from "../api/organizationPolicyDescriptionResolve.js"

export interface OrganizationPolicyEditDialogProps {
  isOpen: Accessor<boolean>
  onClose: () => void
  onSave: (policyType: number, input: OrganizationPolicyInput) => Promise<boolean>
  policy: Accessor<OrganizationPolicy | null>
}

export function organizationPolicyEditDialogStateCreate(props: OrganizationPolicyEditDialogProps) {
  const initialPolicy = props.policy()
  const initialRaw = initialPolicy?.data as Record<string, unknown> | null

  const enabledSignal = createSignalObject(initialPolicy?.enabled ?? false)
  const isSubmittingSignal = createSignalObject(false)
  const errorMessageSignal = createSignalObject<string | null>(null)

  // Master password policy inputs
  const minLengthSignal = createSignalObject(typeof initialRaw?.minLength === "number" ? initialRaw.minLength : 14)
  const requireUpperSignal = createSignalObject(
    typeof initialRaw?.requireUpper === "boolean" ? initialRaw.requireUpper : true,
  )
  const requireLowerSignal = createSignalObject(
    typeof initialRaw?.requireLower === "boolean" ? initialRaw.requireLower : true,
  )
  const requireNumberSignal = createSignalObject(
    typeof initialRaw?.requireNumber === "boolean" ? initialRaw.requireNumber : true,
  )
  const requireSpecialSignal = createSignalObject(
    typeof initialRaw?.requireSpecial === "boolean" ? initialRaw.requireSpecial : true,
  )

  // Password generator policy inputs
  const defaultGenLengthSignal = createSignalObject(
    typeof initialRaw?.defaultLength === "number" ? initialRaw.defaultLength : 16,
  )

  // Send options policy inputs
  const maxExpirationDaysSignal = createSignalObject(
    typeof initialRaw?.maxExpirationDays === "number" ? initialRaw.maxExpirationDays : 7,
  )

  createEffect(() => {
    const pol = props.policy()
    if (pol) {
      enabledSignal.set(pol.enabled)
      errorMessageSignal.set(null)

      const rawData = pol.data as Record<string, unknown> | null
      if (rawData && typeof rawData === "object") {
        if (typeof rawData.minLength === "number") minLengthSignal.set(rawData.minLength)
        if (typeof rawData.requireUpper === "boolean") requireUpperSignal.set(rawData.requireUpper)
        if (typeof rawData.requireLower === "boolean") requireLowerSignal.set(rawData.requireLower)
        if (typeof rawData.requireNumber === "boolean") requireNumberSignal.set(rawData.requireNumber)
        if (typeof rawData.requireSpecial === "boolean") requireSpecialSignal.set(rawData.requireSpecial)
        if (typeof rawData.defaultLength === "number") defaultGenLengthSignal.set(rawData.defaultLength)
        if (typeof rawData.maxExpirationDays === "number") maxExpirationDaysSignal.set(rawData.maxExpirationDays)
      }
    }
  })

  const policyName = () => {
    const pol = props.policy()
    return pol ? organizationPolicyNameResolve(pol.type) : "Policy Configuration"
  }

  const policyDescription = () => {
    const pol = props.policy()
    return pol ? organizationPolicyDescriptionResolve(pol.type) : ""
  }

  const handleClose = () => {
    errorMessageSignal.set(null)
    props.onClose()
  }

  const handleEnabledToggle = (checked: boolean) => {
    enabledSignal.set(checked)
  }

  const handleMinLengthChange = (e: Event) => {
    minLengthSignal.set(Number((e.target as HTMLInputElement).value))
  }

  const handleDefaultGenLengthChange = (e: Event) => {
    defaultGenLengthSignal.set(Number((e.target as HTMLInputElement).value))
  }

  const handleMaxExpirationDaysChange = (e: Event) => {
    maxExpirationDaysSignal.set(Number((e.target as HTMLInputElement).value))
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    const pol = props.policy()
    if (!pol) return

    isSubmittingSignal.set(true)
    errorMessageSignal.set(null)

    let policyData: unknown = null
    if (pol.type === 1) {
      policyData = {
        minComplexity: 3,
        minLength: minLengthSignal.get(),
        requireLower: requireLowerSignal.get(),
        requireNumber: requireNumberSignal.get(),
        requireSpecial: requireSpecialSignal.get(),
        requireUpper: requireUpperSignal.get(),
      }
    } else if (pol.type === 2) {
      policyData = {
        defaultLength: defaultGenLengthSignal.get(),
        useLower: true,
        useNumbers: true,
        useSpecial: true,
        useUpper: true,
      }
    } else if (pol.type === 7) {
      policyData = {
        maxExpirationDays: maxExpirationDaysSignal.get(),
      }
    }

    const input: OrganizationPolicyInput = {
      data: policyData,
      enabled: enabledSignal.get(),
    }

    try {
      const success = await props.onSave(pol.type, input)
      if (success) {
        handleClose()
      }
    } catch {
      errorMessageSignal.set("An error occurred while saving policy.")
    } finally {
      isSubmittingSignal.set(false)
    }
  }

  return {
    defaultGenLength: defaultGenLengthSignal.get,
    enabled: enabledSignal.get,
    errorMessage: errorMessageSignal.get,
    handleDefaultGenLengthChange,
    handleEnabledToggle,
    handleMaxExpirationDaysChange,
    handleMinLengthChange,
    handleSubmit,
    isOpen: props.isOpen,
    isSubmitting: isSubmittingSignal.get,
    maxExpirationDays: maxExpirationDaysSignal.get,
    minLength: minLengthSignal.get,
    onClose: handleClose,
    policy: props.policy,
    policyDescription,
    policyName,
    requireLower: requireLowerSignal.get,
    requireNumber: requireNumberSignal.get,
    requireSpecial: requireSpecialSignal.get,
    requireUpper: requireUpperSignal.get,
    setRequireLower: requireLowerSignal.set,
    setRequireNumber: requireNumberSignal.set,
    setRequireSpecial: requireSpecialSignal.set,
    setRequireUpper: requireUpperSignal.set,
  }
}
