import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import { accountKdfChangeExecute } from "../model/accountKdfChangeExecute.js"
import { accountKeysRotateExecute } from "../model/accountKeysRotateExecute.js"
import { accountPasswordChangeExecute } from "../model/accountPasswordChangeExecute.js"
import { webSettingsApiClientCreate } from "../model/webSettingsApiClientCreate.js"

export interface AccountSecurityCardProps {
  session: ReturnType<typeof webAuthSessionCreate>
  apiClient?: ReturnType<typeof webSettingsApiClientCreate>
  onNotifySuccess?: (message: string) => void
  onNotifyError?: (message: string) => void
}

export function accountSecurityCardStateCreate(props: AccountSecurityCardProps) {
  const apiClient = props.apiClient ?? webSettingsApiClientCreate()

  // Master password change state
  const currentPassword = createSignalObject("")
  const newPassword = createSignalObject("")
  const confirmPassword = createSignalObject("")
  const passwordHint = createSignalObject("")
  const isChangingPassword = createSignalObject(false)

  // KDF settings state
  const kdfType = createSignalObject(0) // 0 = PBKDF2, 1 = Argon2id
  const kdfIterations = createSignalObject(600_000)
  const kdfMemory = createSignalObject(64)
  const kdfParallelism = createSignalObject(4)
  const kdfMasterPassword = createSignalObject("")
  const isChangingKdf = createSignalObject(false)

  // Key rotation state
  const isRotateDialogOpen = createSignalObject(false)
  const rotateMasterPassword = createSignalObject("")
  const isRotatingKeys = createSignalObject(false)

  // Deauthorize sessions state
  const isDeauthorizeDialogOpen = createSignalObject(false)
  const deauthorizePassword = createSignalObject("")
  const isDeauthorizing = createSignalObject(false)

  onMount(() => {
    const sessionData = props.session.session()
    if (sessionData) {
      kdfType.set(sessionData.kdf)
      kdfIterations.set(sessionData.kdfIterations)
      if (sessionData.kdfMemory) kdfMemory.set(sessionData.kdfMemory)
      if (sessionData.kdfParallelism) kdfParallelism.set(sessionData.kdfParallelism)
    }
  })

  const handleChangePassword = async (e: Event) => {
    e.preventDefault()
    if (currentPassword.get().length === 0) {
      props.onNotifyError?.("Current master password is required.")
      return
    }
    if (newPassword.get().length < 8) {
      props.onNotifyError?.("New master password must be at least 8 characters.")
      return
    }
    if (newPassword.get() !== confirmPassword.get()) {
      props.onNotifyError?.("New passwords do not match.")
      return
    }

    isChangingPassword.set(true)
    const result = await accountPasswordChangeExecute({
      session: props.session,
      currentPassword: currentPassword.get(),
      newPassword: newPassword.get(),
      newHint: passwordHint.get().trim() || null,
      apiClient,
    })
    isChangingPassword.set(false)

    if (result.success) {
      currentPassword.set("")
      newPassword.set("")
      confirmPassword.set("")
      passwordHint.set("")
      props.onNotifySuccess?.("Master password changed successfully. Please remember your new password!")
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  const handleChangeKdf = async (e: Event) => {
    e.preventDefault()
    if (kdfMasterPassword.get().length === 0) {
      props.onNotifyError?.("Master password is required to change KDF settings.")
      return
    }

    const type = kdfType.get()
    const iters = kdfIterations.get()
    const mem = type === 1 ? kdfMemory.get() : null
    const par = type === 1 ? kdfParallelism.get() : null

    if (type === 0 && iters < 100_000) {
      props.onNotifyError?.("PBKDF2 iterations should be at least 100,000.")
      return
    }
    if (type === 1 && iters < 1) {
      props.onNotifyError?.("Argon2id iterations must be at least 1.")
      return
    }

    isChangingKdf.set(true)
    const result = await accountKdfChangeExecute({
      session: props.session,
      currentPassword: kdfMasterPassword.get(),
      kdfType: type,
      iterations: iters,
      memory: mem,
      parallelism: par,
      apiClient,
    })
    isChangingKdf.set(false)

    if (result.success) {
      kdfMasterPassword.set("")
      props.onNotifySuccess?.("KDF settings updated successfully.")
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  const openRotateDialog = () => {
    rotateMasterPassword.set("")
    isRotateDialogOpen.set(true)
  }

  const closeRotateDialog = () => {
    isRotateDialogOpen.set(false)
    rotateMasterPassword.set("")
  }

  const handleRotateKeys = async () => {
    if (rotateMasterPassword.get().length === 0) {
      props.onNotifyError?.("Master password is required.")
      return
    }

    isRotatingKeys.set(true)
    const result = await accountKeysRotateExecute({
      session: props.session,
      currentPassword: rotateMasterPassword.get(),
      apiClient,
    })
    isRotatingKeys.set(false)

    if (result.success) {
      closeRotateDialog()
      props.onNotifySuccess?.("Account encryption keys rotated successfully.")
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  const openDeauthorizeDialog = () => {
    deauthorizePassword.set("")
    isDeauthorizeDialogOpen.set(true)
  }

  const closeDeauthorizeDialog = () => {
    isDeauthorizeDialogOpen.set(false)
    deauthorizePassword.set("")
  }

  const handleDeauthorizeSessions = async () => {
    const sessionData = props.session.session()
    if (sessionData === null) return
    if (deauthorizePassword.get().length === 0) {
      props.onNotifyError?.("Master password is required.")
      return
    }

    isDeauthorizing.set(true)
    const hashResult = await props.session.masterPasswordHashDeriveForSession(deauthorizePassword.get())
    if (!hashResult.success) {
      isDeauthorizing.set(false)
      props.onNotifyError?.(hashResult.errorMessage)
      return
    }

    const result = await apiClient.securityStampRotate(sessionData.accessToken, hashResult.data)
    isDeauthorizing.set(false)

    if (result.success) {
      closeDeauthorizeDialog()
      props.onNotifySuccess?.("All active sessions and devices deauthorized successfully.")
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  return {
    // Password change
    currentPassword: currentPassword.get,
    setCurrentPassword: currentPassword.set,
    newPassword: newPassword.get,
    setNewPassword: newPassword.set,
    confirmPassword: confirmPassword.get,
    setConfirmPassword: confirmPassword.set,
    passwordHint: passwordHint.get,
    setPasswordHint: passwordHint.set,
    isChangingPassword: isChangingPassword.get,
    handleChangePassword,

    // KDF settings
    kdfType: kdfType.get,
    setKdfType: (val: number) => {
      kdfType.set(val)
      if (val === 1 && kdfIterations.get() > 100) {
        kdfIterations.set(3)
      } else if (val === 0 && kdfIterations.get() < 100_000) {
        kdfIterations.set(600_000)
      }
    },
    kdfIterations: kdfIterations.get,
    setKdfIterations: kdfIterations.set,
    kdfMemory: kdfMemory.get,
    setKdfMemory: kdfMemory.set,
    kdfParallelism: kdfParallelism.get,
    setKdfParallelism: kdfParallelism.set,
    kdfMasterPassword: kdfMasterPassword.get,
    setKdfMasterPassword: kdfMasterPassword.set,
    isChangingKdf: isChangingKdf.get,
    handleChangeKdf,

    // Rotate keys
    isRotateDialogOpen: isRotateDialogOpen.get,
    openRotateDialog,
    closeRotateDialog,
    rotateMasterPassword: rotateMasterPassword.get,
    setRotateMasterPassword: rotateMasterPassword.set,
    isRotatingKeys: isRotatingKeys.get,
    handleRotateKeys,

    // Deauthorize sessions
    isDeauthorizeDialogOpen: isDeauthorizeDialogOpen.get,
    openDeauthorizeDialog,
    closeDeauthorizeDialog,
    deauthorizePassword: deauthorizePassword.get,
    setDeauthorizePassword: deauthorizePassword.set,
    isDeauthorizing: isDeauthorizing.get,
    handleDeauthorizeSessions,
  }
}
