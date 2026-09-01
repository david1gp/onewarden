import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { webSsoAuthorizationCreate } from "../../sso/model/webSsoAuthorizationCreate.js"
import { webSsoDomainHintResolve } from "../../sso/model/webSsoDomainHintResolve.js"
import { webSsoTransactionStorageCreate } from "../../sso/model/webSsoTransactionStorageCreate.js"
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
  const isSsoStarting = createSignalObject(false)

  const togglePasswordVisibility = () => {
    showPassword.set(!showPassword.get())
  }

  const handleContinueWithSso = async () => {
    errorMessage.set(null)
    isSsoStarting.set(true)
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost"
    const domainHint = webSsoDomainHintResolve(email.get())
    const authResult = await webSsoAuthorizationCreate({
      origin,
      nowMs: Date.now(),
      email: domainHint,
    })

    if (!authResult.success) {
      errorMessage.set(authResult.errorMessage)
      isSsoStarting.set(false)
      return
    }

    const storageResult = webSsoTransactionStorageCreate().save(authResult.data.transaction)
    if (!storageResult.success) {
      errorMessage.set("Failed to store SSO session.")
      isSsoStarting.set(false)
      return
    }

    if (typeof window !== "undefined") {
      window.location.assign(authResult.data.authorizationUrl)
    }
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
    isSsoStarting: isSsoStarting.get,
    requiresTwoFactor: () => session.pendingTwoFactor() !== null,
    handleSubmit,
    handleContinueWithSso,
    handleTwoFactorCancel,
    navigateToRegister: () => props.onNavigateToRegister?.(),
    navigateToVerify: () => props.onNavigateToVerify?.(),
  }
}
