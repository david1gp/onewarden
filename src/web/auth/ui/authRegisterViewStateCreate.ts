import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { webAuthSessionCreate } from "../model/webAuthSessionCreate.js"
import { webAuthSessionDefault } from "../model/webAuthSessionDefault.js"

export interface AuthRegisterViewProps {
  session?: ReturnType<typeof webAuthSessionCreate>
  onSuccess?: () => void
  onNavigateToLogin?: () => void
}

export function authRegisterViewStateCreate(props: AuthRegisterViewProps = {}) {
  const session = props.session ?? webAuthSessionDefault()
  const email = createSignalObject("")
  const name = createSignalObject("")
  const masterPassword = createSignalObject("")
  const confirmPassword = createSignalObject("")
  const passwordHint = createSignalObject("")
  const showPassword = createSignalObject(false)
  const errorMessage = createSignalObject<string | null>(null)
  const successMessage = createSignalObject<string | null>(null)
  const isSubmitting = createSignalObject(false)

  const togglePasswordVisibility = () => {
    showPassword.set(!showPassword.get())
  }

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault()
    errorMessage.set(null)
    successMessage.set(null)

    const trimmedEmail = email.get().trim()
    const password = masterPassword.get()
    const confirm = confirmPassword.get()
    const hint = passwordHint.get().trim()
    const trimmedName = name.get().trim()

    if (trimmedEmail === "" || !trimmedEmail.includes("@")) {
      errorMessage.set("Please enter a valid email address.")
      return
    }
    if (password.length < 8) {
      errorMessage.set("Master password must be at least 8 characters long.")
      return
    }
    if (password !== confirm) {
      errorMessage.set("Master passwords do not match.")
      return
    }

    isSubmitting.set(true)
    const registerResult = await session.register({
      email: trimmedEmail,
      masterPassword: password,
      name: trimmedName.length > 0 ? trimmedName : null,
      masterPasswordHint: hint.length > 0 ? hint : null,
      rememberEmail: true,
    })

    if (!registerResult.success) {
      isSubmitting.set(false)
      errorMessage.set(registerResult.errorMessage || "Registration failed.")
      return
    }

    // After registration, attempt to log the user in immediately
    const loginResult = await session.login({
      email: trimmedEmail,
      masterPassword: password,
      rememberEmail: true,
    })
    isSubmitting.set(false)

    if (loginResult.success) {
      props.onSuccess?.()
    } else {
      successMessage.set("Account created successfully! Please log in.")
    }
  }

  return {
    email: email.get,
    setEmail: email.set,
    name: name.get,
    setName: name.set,
    masterPassword: masterPassword.get,
    setMasterPassword: masterPassword.set,
    confirmPassword: confirmPassword.get,
    setConfirmPassword: confirmPassword.set,
    passwordHint: passwordHint.get,
    setPasswordHint: passwordHint.set,
    showPassword: showPassword.get,
    togglePasswordVisibility,
    errorMessage: errorMessage.get,
    successMessage: successMessage.get,
    isSubmitting: isSubmitting.get,
    handleSubmit,
    navigateToLogin: () => props.onNavigateToLogin?.(),
  }
}
