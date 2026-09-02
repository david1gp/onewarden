import { createEffect, onCleanup, onMount } from "solid-js"
import { themeInit } from "#ui/interactive/theme/themeSignal.js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { demoNavigationClickHandleCreate } from "./demoNavigationClickHandleCreate.js"
import { demoSettingsData } from "./demoSettingsData.js"
import { demoSettingsSectionResolve } from "./demoSettingsSectionResolve.js"
import { pageNameDemo } from "./demo_url/pageNameDemo.js"
import { pageRouteDemo } from "./demo_url/pageRouteDemo.js"
import { urlDemo } from "./demo_url/urlDemo.js"

type DemoSettingsSection = (typeof demoSettingsData.navigation)[number]["id"]
type DemoDevice = { id: string; name: string; detail: string; current: boolean }
type DemoEmergencyContact = {
  id: string
  name: string
  email: string
  access: "View" | "Takeover"
  waitDays: number
  status: "Invited" | "Accepted" | "Confirmed" | "Recovery Initiated" | "Recovery Approved"
}
type DemoEmergencyVault = {
  id: string
  email: string
  access: "View" | "Takeover"
  waitDays: number
  status: "Invited" | "Confirmed" | "Recovery Approved"
}
type DemoFeedback = { tone: "success" | "error"; message: string }

type DemoSettingsStateProps = Readonly<{
  readonly pathname?: () => string
  readonly search?: () => string
  readonly hash?: () => string
  readonly navigate?: (path: string) => void
}>

export function demoSettingsStateCreate(props: DemoSettingsStateProps = {}) {
  const pathname = props.pathname ?? (() => pageRouteDemo.demoSettings)
  const currentSection = createSignalObject<DemoSettingsSection>(demoSettingsSectionResolve(pathname()))
  const feedback = createSignalObject<DemoFeedback | null>(null)
  const name = createSignalObject<string>(demoSettingsData.profile.name)
  const currentEmail = createSignalObject<string>(demoSettingsData.profile.email)
  const avatarColor = createSignalObject<string>(demoSettingsData.profile.avatarColor)
  const emailVerified = createSignalObject(false)
  const verificationEmailSent = createSignalObject(false)
  const apiKeyPanelOpen = createSignalObject(false)
  const apiKeyVisible = createSignalObject(false)
  const apiKeyPassword = createSignalObject("")
  const apiKeyError = createSignalObject("")
  const passwordHint = createSignalObject("First concert and year")
  const kdfAlgorithm = createSignalObject<"PBKDF2 SHA-256" | "Argon2id">("Argon2id")
  const kdfIterations = createSignalObject("3")
  const kdfMemory = createSignalObject("64")
  const kdfParallelism = createSignalObject("4")
  const kdfMasterPassword = createSignalObject("")
  const rotateConfirmationOpen = createSignalObject(false)
  const rotateMasterPassword = createSignalObject("")
  const deauthorizeConfirmationOpen = createSignalObject(false)
  const deauthorizeMasterPassword = createSignalObject("")
  const emailStep = createSignalObject<1 | 2>(1)
  const newEmail = createSignalObject("")
  const emailCode = createSignalObject("")
  const emailConfirmMasterPassword = createSignalObject("")
  const twoFactorCode = createSignalObject("")
  const twoFactorEnabled = createSignalObject(false)
  const devices = createSignalObject<DemoDevice[]>(demoSettingsData.devices.map((device) => ({ ...device })))
  const contacts = createSignalObject<DemoEmergencyContact[]>(
    demoSettingsData.emergencyContacts.map((contact) => ({ ...contact })),
  )
  const emergencyVaults = createSignalObject<DemoEmergencyVault[]>(
    demoSettingsData.emergencyVaults.map((vault) => ({ ...vault })),
  )
  const contactEmail = createSignalObject("")
  const contactAccess = createSignalObject<"View" | "Takeover">("View")
  const contactWaitDays = createSignalObject(7)
  const contactEditingId = createSignalObject<string | null>(null)
  const contactEditAccess = createSignalObject<"View" | "Takeover">("View")
  const contactEditWaitDays = createSignalObject(7)
  const importFormat = createSignalObject<"Bitwarden JSON" | "Bitwarden CSV">("Bitwarden JSON")
  const importFileName = createSignalObject("")
  const importContent = createSignalObject("")
  const importMasterPassword = createSignalObject("")
  const exportFormat = createSignalObject<"Decrypted JSON" | "Decrypted CSV" | "Encrypted JSON">("Encrypted JSON")
  const exportMasterPassword = createSignalObject("")
  const exportData = createSignalObject("")
  const compactMode = createSignalObject(false)
  const reduceMotion = createSignalObject(false)
  const deleteConfirmationOpen = createSignalObject(false)
  const deleteConfirmation = createSignalObject("")
  const deleteMasterPassword = createSignalObject("")
  const deleteOtp = createSignalObject("")
  const recoveryDeletionOpen = createSignalObject(false)
  const recoveryEmail = createSignalObject<string>(demoSettingsData.profile.email)
  let feedbackTimer: ReturnType<typeof setTimeout> | undefined

  const notify = (message: string, tone: DemoFeedback["tone"] = "success") => {
    feedback.set({ message, tone })
    if (feedbackTimer) clearTimeout(feedbackTimer)
    feedbackTimer = setTimeout(() => feedback.set(null), 5000)
  }

  onMount(() => {
    themeInit()
  })
  onCleanup(() => {
    if (feedbackTimer) clearTimeout(feedbackTimer)
  })

  createEffect(() => currentSection.set(demoSettingsSectionResolve(pathname())))

  const sectionSelect = (section: DemoSettingsSection) => {
    currentSection.set(section)
    feedback.set(null)
    const path =
      section === "profile" ? urlDemo(pageNameDemo.demoSettings) : `${urlDemo(pageNameDemo.demoSettings)}/${section}`
    props.navigate?.(`${path}${props.search?.() ?? ""}${props.hash?.() ?? ""}`)
  }
  const navigateTo = demoNavigationClickHandleCreate(props.navigate)

  const profileSave = (event: SubmitEvent) => {
    event.preventDefault()
    if (!name.get().trim()) {
      notify("Display name is required.", "error")
      return
    }
    notify("Demo profile saved locally.")
  }

  const verificationEmailSend = () => {
    verificationEmailSent.set(true)
    notify("Verification email sent! Check your inbox.")
  }

  const apiKeyOpen = () => {
    apiKeyPassword.set("")
    apiKeyError.set("")
    apiKeyVisible.set(false)
    apiKeyPanelOpen.set(true)
  }

  const apiKeyClose = () => {
    apiKeyPanelOpen.set(false)
    apiKeyPassword.set("")
    apiKeyError.set("")
    apiKeyVisible.set(false)
  }

  const apiKeyReveal = () => {
    if (!apiKeyPassword.get()) {
      apiKeyError.set("Master password is required.")
      return
    }
    apiKeyError.set("")
    apiKeyVisible.set(true)
  }

  const apiKeyRotate = () => {
    if (!apiKeyPassword.get()) {
      apiKeyError.set("Master password is required.")
      return
    }
    apiKeyError.set("")
    apiKeyVisible.set(true)
    notify("Demo API key rotated locally.")
  }

  const passwordChange = (event: SubmitEvent) => {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    const values = new FormData(form)
    const nextPassword = String(values.get("newPassword") ?? "")
    const confirmation = String(values.get("confirmPassword") ?? "")
    if (nextPassword.length < 8 || nextPassword !== confirmation) {
      notify("Use at least 8 characters and make both new passwords match.", "error")
      return
    }
    form.reset()
    notify("Demo master password updated locally.")
  }

  const kdfSave = (event: SubmitEvent) => {
    event.preventDefault()
    const invalidArgon2 =
      kdfAlgorithm.get() === "Argon2id" && (Number(kdfMemory.get()) < 1 || Number(kdfParallelism.get()) < 1)
    if (Number(kdfIterations.get()) < 1 || invalidArgon2) {
      notify("KDF iterations, memory, and parallelism must be greater than zero.", "error")
      return
    }
    if (!kdfMasterPassword.get()) {
      notify("Enter your master password to save KDF settings.", "error")
      return
    }
    kdfMasterPassword.set("")
    notify(`Demo KDF changed to ${kdfAlgorithm.get()}.`)
  }

  const keysRotate = () => {
    if (!rotateMasterPassword.get()) {
      notify("Enter your master password to rotate encryption keys.", "error")
      return
    }
    rotateMasterPassword.set("")
    rotateConfirmationOpen.set(false)
    notify("Demo encryption keys rotated locally.")
  }

  const emailCodeSend = (event: SubmitEvent) => {
    event.preventDefault()
    if (!newEmail.get().includes("@")) {
      notify("Enter a valid email address.", "error")
      return
    }
    emailStep.set(2)
    notify("Demo verification code sent. Use 123456.")
  }

  const emailChange = (event: SubmitEvent) => {
    event.preventDefault()
    if (emailCode.get() !== "123456") {
      notify("For this demo, enter verification code 123456.", "error")
      return
    }
    if (!emailConfirmMasterPassword.get()) {
      notify("Confirm your master password to change the email address.", "error")
      return
    }
    emailStep.set(1)
    emailCode.set("")
    emailConfirmMasterPassword.set("")
    currentEmail.set(newEmail.get())
    notify(`Demo email changed locally to ${newEmail.get()}.`)
  }

  const twoFactorConfirm = (event: SubmitEvent) => {
    event.preventDefault()
    if (twoFactorCode.get() !== "246810") {
      notify("For this demo, enter authenticator code 246810.", "error")
      return
    }
    twoFactorCode.set("")
    twoFactorEnabled.set(true)
    notify("Demo authenticator enabled. Save the displayed recovery codes in a safe place.")
  }

  const twoFactorReset = () => {
    twoFactorEnabled.set(false)
    twoFactorCode.set("")
    notify("Demo authenticator setup reset locally.")
  }

  const deviceRemove = (id: string) => {
    devices.set(devices.get().filter((device) => device.id !== id || device.current))
    notify("Demo device deauthorized locally.")
  }

  const devicesRemoveOthers = () => {
    if (!deauthorizeMasterPassword.get()) {
      notify("Enter your master password to deauthorize sessions.", "error")
      return
    }
    devices.set(devices.get().filter((device) => device.current))
    deauthorizeMasterPassword.set("")
    deauthorizeConfirmationOpen.set(false)
    notify("All other demo sessions were deauthorized locally.")
  }

  const contactInvite = (event: SubmitEvent) => {
    event.preventDefault()
    const email = contactEmail.get().trim()
    if (!email.includes("@")) {
      notify("Enter a valid contact email.", "error")
      return
    }
    contacts.set([
      ...contacts.get(),
      {
        id: `contact-${contacts.get().length + 1}`,
        name: email.split("@")[0] ?? email,
        email,
        access: contactAccess.get(),
        waitDays: contactWaitDays.get(),
        status: "Invited",
      },
    ])
    contactEmail.set("")
    notify("Demo emergency contact invited locally.")
  }

  const contactRemove = (id: string) => {
    contacts.set(contacts.get().filter((contact) => contact.id !== id))
    notify("Demo emergency contact removed locally.")
  }

  const contactConfirm = (id: string) => {
    contacts.set(contacts.get().map((contact) => (contact.id === id ? { ...contact, status: "Confirmed" } : contact)))
    notify("Demo emergency contact confirmed locally.")
  }

  const contactReinvite = (id: string) => {
    const contact = contacts.get().find((candidate) => candidate.id === id)
    if (!contact) return
    notify(`Demo invitation re-sent to ${contact.email}.`)
  }

  const contactEditOpen = (id: string) => {
    const contact = contacts.get().find((candidate) => candidate.id === id)
    if (!contact) return
    contactEditAccess.set(contact.access)
    contactEditWaitDays.set(contact.waitDays)
    contactEditingId.set(id)
  }

  const contactEditCancel = () => contactEditingId.set(null)

  const contactEditSave = (event: SubmitEvent) => {
    event.preventDefault()
    const id = contactEditingId.get()
    if (!id) return
    contacts.set(
      contacts
        .get()
        .map((contact) =>
          contact.id === id
            ? { ...contact, access: contactEditAccess.get(), waitDays: contactEditWaitDays.get() }
            : contact,
        ),
    )
    contactEditingId.set(null)
    notify("Demo emergency contact updated locally.")
  }

  const contactRecoveryApprove = (id: string) => {
    contacts.set(
      contacts
        .get()
        .map((contact) => (contact.id === id ? { ...contact, status: "Recovery Approved" as const } : contact)),
    )
    notify("Demo recovery request approved locally.")
  }

  const contactRecoveryReject = (id: string) => {
    contacts.set(
      contacts.get().map((contact) => (contact.id === id ? { ...contact, status: "Confirmed" as const } : contact)),
    )
    notify("Demo recovery request rejected locally.")
  }

  const emergencyVaultAccept = (id: string) => {
    emergencyVaults.set(
      emergencyVaults.get().map((vault) => (vault.id === id ? { ...vault, status: "Confirmed" } : vault)),
    )
    notify("Demo emergency access invitation accepted locally.")
  }

  const importSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    if (!importFileName.get() && !importContent.get().trim()) {
      notify("Choose a demo vault file or paste vault data first.", "error")
      return
    }
    const source = importFileName.get() || "Pasted vault data"
    notify(`${source} parsed as ${importFormat.get()} in demo mode. Nothing was uploaded.`)
  }

  const exportSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    if (exportFormat.get() !== "Encrypted JSON" && !exportMasterPassword.get()) {
      notify("Enter your master password to export a decrypted vault.", "error")
      return
    }
    exportData.set(`OneWarden demo ${exportFormat.get()} vault export`)
    notify(`Demo ${exportFormat.get()} export prepared locally.`)
  }

  const exportCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportData.get())
      notify("Demo vault export copied to the clipboard.")
    } catch {
      notify("Clipboard access is unavailable in this browser.", "error")
    }
  }

  const deleteSimulate = (event: SubmitEvent) => {
    event.preventDefault()
    if (deleteConfirmation.get().toLowerCase() !== "delete my account") {
      notify('Type "delete my account" to continue.', "error")
      return
    }
    if (!deleteMasterPassword.get()) {
      notify("Enter your master password to continue.", "error")
      return
    }
    deleteConfirmation.set("")
    deleteMasterPassword.set("")
    deleteOtp.set("")
    deleteConfirmationOpen.set(false)
    notify("Demo account deletion simulated. No account or data was changed.")
  }

  const recoveryDeletionSend = (event: SubmitEvent) => {
    event.preventDefault()
    if (!recoveryEmail.get().includes("@")) {
      notify("Enter a valid account email.", "error")
      return
    }
    notify("Demo deletion link queued locally. No email was sent.")
  }

  return {
    navigation: demoSettingsData.navigation,
    profile: demoSettingsData.profile,
    currentSection: currentSection.get,
    sectionSelect,
    navigateTo,
    feedback: feedback.get,
    notify,
    name,
    currentEmail: currentEmail.get,
    avatarColor,
    profileSave,
    emailVerified: emailVerified.get,
    verificationEmailSent: verificationEmailSent.get,
    verificationEmailSend,
    apiKeyPanelOpen: apiKeyPanelOpen.get,
    apiKeyVisible: apiKeyVisible.get,
    apiKeyPassword,
    apiKeyError: apiKeyError.get,
    apiKeyOpen,
    apiKeyClose,
    apiKeyReveal,
    apiKeyRotate,
    passwordHint,
    passwordChange,
    kdfAlgorithm,
    kdfIterations,
    kdfMemory,
    kdfParallelism,
    kdfMasterPassword,
    kdfSave,
    rotateConfirmationOpen: rotateConfirmationOpen.get,
    rotateMasterPassword,
    rotateOpen: () => rotateConfirmationOpen.set(true),
    rotateClose: () => rotateConfirmationOpen.set(false),
    keysRotate,
    deauthorizeConfirmationOpen: deauthorizeConfirmationOpen.get,
    deauthorizeMasterPassword,
    deauthorizeOpen: () => deauthorizeConfirmationOpen.set(true),
    deauthorizeClose: () => deauthorizeConfirmationOpen.set(false),
    emailStep: emailStep.get,
    newEmail,
    emailCode,
    emailConfirmMasterPassword,
    emailCodeSend,
    emailChange,
    emailReset: () => {
      emailStep.set(1)
      emailCode.set("")
      emailConfirmMasterPassword.set("")
    },
    twoFactorSecret: "JBSWY3DPEHPK3PXP",
    twoFactorRecoveryCodes: ["OW-DEMO-7K4P", "OW-DEMO-9M2Q", "OW-DEMO-3X8R"],
    twoFactorCode,
    twoFactorEnabled: twoFactorEnabled.get,
    twoFactorConfirm,
    twoFactorReset,
    devices: devices.get,
    deviceRemove,
    devicesRemoveOthers,
    contacts: contacts.get,
    emergencyVaults: emergencyVaults.get,
    contactEmail,
    contactAccess,
    contactWaitDays,
    contactInvite,
    contactRemove,
    contactConfirm,
    contactReinvite,
    contactEditingId: contactEditingId.get,
    contactEditAccess,
    contactEditWaitDays,
    contactEditOpen,
    contactEditCancel,
    contactEditSave,
    contactRecoveryApprove,
    contactRecoveryReject,
    emergencyVaultAccept,
    importFormat,
    importFileName,
    importContent,
    importMasterPassword,
    importFileSelect: (event: Event & { currentTarget: HTMLInputElement }) =>
      importFileName.set(event.currentTarget.files?.[0]?.name ?? ""),
    importSubmit,
    exportFormat,
    exportMasterPassword,
    exportData: exportData.get,
    exportSubmit,
    exportCopy,
    compactMode,
    reduceMotion,
    deleteConfirmationOpen: deleteConfirmationOpen.get,
    deleteOpen: () => deleteConfirmationOpen.set(true),
    deleteClose: () => deleteConfirmationOpen.set(false),
    deleteConfirmation,
    deleteMasterPassword,
    deleteOtp,
    deleteSimulate,
    recoveryDeletionOpen: recoveryDeletionOpen.get,
    recoveryDeletionToggle: () => recoveryDeletionOpen.set(!recoveryDeletionOpen.get()),
    recoveryEmail,
    recoveryDeletionSend,
  }
}
