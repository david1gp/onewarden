import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { webAuthSessionCreate } from "../model/webAuthSessionCreate.js"
import { webAuthSessionDefault } from "../model/webAuthSessionDefault.js"

export interface AuthLoginViewProps {
  session?: ReturnType<typeof webAuthSessionCreate>
  initialEmail?: string
  onSuccess?: () => void
  onNavigateToRegister?: () => void
  onNavigateToVerify?: () => void
}

export function authLoginViewStateCreate(props: AuthLoginViewProps = {}) {
  const session = props.session ?? webAuthSessionDefault()
  const remembered = session.rememberedEmail()
  const defaultEmail = props.initialEmail ?? remembered ?? ""

  const email = createSignalObject(defaultEmail)
  const masterPassword = createSignalObject("")
  const rememberEmail = createSignalObject(remembered !== null)
  const showPassword = createSignalObject(false)
  const errorMessage = createSignalObject<string | null>(null)
  const isSubmitting = createSignalObject(false)

  const togglePasswordVisibility = () => {
    showPassword.set(!showPassword.get())
  }

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault()
    errorMessage.set(null)

    const trimmedEmail = email.get().trim()
    const password = masterPassword.get()
    if (trimmedEmail === "") {
      errorMessage.set("Please enter your email address.")
      return
    }
    if (password === "") {
      errorMessage.set("Please enter your master password.")
      return
    }

    isSubmitting.set(true)
    const result = await session.login({
      email: trimmedEmail,
      masterPassword: password,
      rememberEmail: rememberEmail.get(),
    })
    isSubmitting.set(false)

    if (!result.success) {
      if (result.code === "auth.two-factor-required") {
        // Two-factor challenge is now active in session.pendingTwoFactor
        return
      }
      errorMessage.set(result.errorMessage || "Login failed. Check your email and master password.")
      return
    }

    props.onSuccess?.()
  }

  const handleTwoFactorCancel = () => {
    session.pendingTwoFactorSet(null)
    errorMessage.set(null)
  }

  return {
    session,
    email: email.get,
    setEmail: email.set,
    masterPassword: masterPassword.get,
    setMasterPassword: masterPassword.set,
    rememberEmail: rememberEmail.get,
    setRememberEmail: rememberEmail.set,
    showPassword: showPassword.get,
    togglePasswordVisibility,
    errorMessage: errorMessage.get,
    isSubmitting: isSubmitting.get,
    requiresTwoFactor: () => session.pendingTwoFactor() !== null,
    handleSubmit,
    handleTwoFactorCancel,
    navigateToRegister: () => props.onNavigateToRegister?.(),
    navigateToVerify: () => props.onNavigateToVerify?.(),
  }
}
