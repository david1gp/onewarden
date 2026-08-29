import type { JSX } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

export type AuthUnlockHeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6"

export interface AuthUnlockCardProps {
  email?: () => string | null
  onSubmit: (password: string) => Promise<void> | void
  onBiometricUnlock?: () => void
  onLogout?: () => void
  errorMessage?: () => string | null
  isSubmitting?: () => boolean
  footerNote?: () => JSX.Element | null
  headingLevel?: AuthUnlockHeadingLevel
  class?: string
}

export function authUnlockCardStateCreate(props: AuthUnlockCardProps) {
  const masterPassword = createSignalObject("")

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault()
    if (masterPassword.get().trim() === "") return
    await props.onSubmit(masterPassword.get())
  }

  const handlePasswordInput = (value: string) => {
    masterPassword.set(value)
  }

  return {
    masterPassword: masterPassword.get,
    setMasterPassword: handlePasswordInput,
    handleSubmit,
    email: () => props.email?.() ?? null,
    errorMessage: () => props.errorMessage?.() ?? null,
    isSubmitting: () => props.isSubmitting?.() ?? false,
    hasBiometricUnlock: () => typeof props.onBiometricUnlock === "function",
    handleBiometricUnlock: () => props.onBiometricUnlock?.(),
    hasLogout: () => typeof props.onLogout === "function",
    handleLogout: () => props.onLogout?.(),
    footerNote: () => props.footerNote?.() ?? null,
    headingLevel: () => props.headingLevel ?? "h1",
  }
}
