import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { twoFactorProviderType } from "../model/twoFactorProviderType.js"
import type { TwoFactorWebAuthnKey } from "../model/twoFactorWebAuthnKeySchema.js"
import type { webAuthSessionCreate } from "../model/webAuthSessionCreate.js"
import { webAuthSessionDefault } from "../model/webAuthSessionDefault.js"

export interface AuthTwoFactorSetupViewProps {
  session?: ReturnType<typeof webAuthSessionCreate>
  onBack?: () => void
}

export type ActiveSetupSection =
  | null
  | "authenticator"
  | "email"
  | "webauthn"
  | "duo"
  | "yubikey"
  | "recovery"
  | "rememberedDevices"

export function authTwoFactorSetupViewStateCreate(props: AuthTwoFactorSetupViewProps = {}) {
  const session = props.session ?? webAuthSessionDefault()

  const activeSection = createSignalObject<ActiveSetupSection>(null)
  const masterPasswordPrompt = createSignalObject("")
  const isLoading = createSignalObject(false)
  const isActionLoading = createSignalObject(false)
  const errorMessage = createSignalObject<string | null>(null)
  const successMessage = createSignalObject<string | null>(null)

  // Provider states
  const enabledProviders = createSignalObject<number[]>([])

  // Authenticator state
  const authenticatorKey = createSignalObject("")
  const authenticatorToken = createSignalObject("")
  const authenticatorEnabled = createSignalObject(false)

  // Email state
  const emailAddress = createSignalObject(session.session()?.email ?? "")
  const emailToken = createSignalObject("")
  const emailEnabled = createSignalObject(false)
  const emailSent = createSignalObject(false)

  // WebAuthn state
  const webAuthnKeys = createSignalObject<TwoFactorWebAuthnKey[]>([])
  const webAuthnKeyName = createSignalObject("")
  const webAuthnDeviceResponse = createSignalObject("")
  const webAuthnEnabled = createSignalObject(false)
  const webAuthnStatus = createSignalObject<string | null>(null)

  // Duo state
  const duoHost = createSignalObject("")
  const duoClientId = createSignalObject("")
  const duoClientSecret = createSignalObject("")
  const duoEnabled = createSignalObject(false)

  // YubiKey state
  const yubikeyKey1 = createSignalObject("")
  const yubikeyKey2 = createSignalObject("")
  const yubikeyNfc = createSignalObject(false)
  const yubikeyEnabled = createSignalObject(false)

  // Recovery code state
  const recoveryCode = createSignalObject<string | null>(null)
  const recoveryCopied = createSignalObject(false)

  // Remembered devices state
  const rememberedDevicesStatus = createSignalObject<string | null>(null)

  const clearMessages = () => {
    errorMessage.set(null)
    successMessage.set(null)
  }

  const loadProviders = async () => {
    isLoading.set(true)
    clearMessages()
    const result = await session.providersTwoFactorGet()
    isLoading.set(false)
    if (!result.success) {
      errorMessage.set(result.errorMessage || "Failed to load two-factor status.")
      return
    }

    const enabledList = result.data.data.filter((p) => p.enabled).map((p) => p.type)
    enabledProviders.set(enabledList)
    authenticatorEnabled.set(enabledList.includes(twoFactorProviderType.authenticator))
    emailEnabled.set(enabledList.includes(twoFactorProviderType.email))
    duoEnabled.set(enabledList.includes(twoFactorProviderType.duo))
    yubikeyEnabled.set(enabledList.includes(twoFactorProviderType.yubikey))
    webAuthnEnabled.set(enabledList.includes(twoFactorProviderType.webauthn))
  }

  onMount(() => {
    if (session.session()) {
      void loadProviders()
    }
  })

  const openSection = async (section: ActiveSetupSection) => {
    clearMessages()
    activeSection.set(section)
    const pwd = masterPasswordPrompt.get() || undefined

    if (section === "authenticator") {
      isActionLoading.set(true)
      const res = await session.authenticatorTwoFactorGet(pwd)
      isActionLoading.set(false)
      if (res.success) {
        authenticatorKey.set(res.data.key)
        authenticatorEnabled.set(res.data.enabled)
      }
    } else if (section === "email") {
      isActionLoading.set(true)
      const res = await session.emailTwoFactorGet(pwd)
      isActionLoading.set(false)
      if (res.success) {
        if (res.data.email) emailAddress.set(res.data.email)
        emailEnabled.set(res.data.enabled)
      }
    } else if (section === "webauthn") {
      isActionLoading.set(true)
      const res = await session.webauthnTwoFactorGet(pwd)
      isActionLoading.set(false)
      if (res.success) {
        webAuthnKeys.set(res.data.keys)
        webAuthnEnabled.set(res.data.enabled)
      }
    } else if (section === "duo") {
      isActionLoading.set(true)
      const res = await session.duoTwoFactorGet(pwd)
      isActionLoading.set(false)
      if (res.success) {
        duoHost.set(res.data.host ?? "")
        duoClientId.set(res.data.clientId ?? "")
        duoClientSecret.set(res.data.clientSecret ?? "")
        duoEnabled.set(res.data.enabled)
      }
    } else if (section === "yubikey") {
      isActionLoading.set(true)
      const res = await session.yubikeyTwoFactorGet(pwd)
      isActionLoading.set(false)
      if (res.success) {
        yubikeyKey1.set(res.data.Key1 ?? "")
        yubikeyKey2.set(res.data.Key2 ?? "")
        yubikeyNfc.set(res.data.nfc ?? false)
        yubikeyEnabled.set(res.data.enabled)
      }
    } else if (section === "recovery") {
      recoveryCode.set(null)
      recoveryCopied.set(false)
    }
  }

  const closeSection = () => {
    activeSection.set(null)
    clearMessages()
    authenticatorToken.set("")
    emailToken.set("")
    webAuthnKeyName.set("")
    webAuthnDeviceResponse.set("")
    webAuthnStatus.set(null)
    recoveryCode.set(null)
    recoveryCopied.set(false)
  }

  // --- Authenticator Actions ---
  const handleActivateAuthenticator = async () => {
    clearMessages()
    const token = authenticatorToken.get().trim()
    const key = authenticatorKey.get().trim()
    if (!token) {
      errorMessage.set("Please enter the 6-digit verification code from your authenticator app.")
      return
    }
    isActionLoading.set(true)
    const result = await session.authenticatorTwoFactorActivate(key, token, masterPasswordPrompt.get() || undefined)
    isActionLoading.set(false)
    if (!result.success) {
      errorMessage.set(result.errorMessage || "Failed to activate authenticator.")
      return
    }
    authenticatorEnabled.set(true)
    authenticatorToken.set("")
    successMessage.set("Authenticator app successfully activated!")
    await loadProviders()
  }

  const handleDisableAuthenticator = async () => {
    clearMessages()
    const pwd = masterPasswordPrompt.get().trim()
    if (!pwd) {
      errorMessage.set("Master password is required to disable authenticator.")
      return
    }
    isActionLoading.set(true)
    const result = await session.authenticatorTwoFactorDisable(authenticatorKey.get(), pwd)
    isActionLoading.set(false)
    if (!result.success) {
      errorMessage.set(result.errorMessage || "Failed to disable authenticator.")
      return
    }
    authenticatorEnabled.set(false)
    successMessage.set("Authenticator app disabled.")
    await loadProviders()
  }

  // --- Email Actions ---
  const handleSendEmailVerification = async () => {
    clearMessages()
    const email = emailAddress.get().trim()
    if (!email) {
      errorMessage.set("Please enter an email address.")
      return
    }
    isActionLoading.set(true)
    const result = await session.emailTwoFactorSend(email, masterPasswordPrompt.get() || undefined)
    isActionLoading.set(false)
    if (!result.success) {
      errorMessage.set(result.errorMessage || "Failed to send email verification token.")
      return
    }
    emailSent.set(true)
    successMessage.set("Verification email sent! Check your inbox.")
  }

  const handleActivateEmail = async () => {
    clearMessages()
    const email = emailAddress.get().trim()
    const token = emailToken.get().trim()
    if (!email || !token) {
      errorMessage.set("Please enter both email address and verification code.")
      return
    }
    isActionLoading.set(true)
    const result = await session.emailTwoFactorActivate(email, token, masterPasswordPrompt.get() || undefined)
    isActionLoading.set(false)
    if (!result.success) {
      errorMessage.set(result.errorMessage || "Failed to activate email two-factor.")
      return
    }
    emailEnabled.set(true)
    emailToken.set("")
    successMessage.set("Email two-factor authentication enabled!")
    await loadProviders()
  }

  const handleDisableEmail = async () => {
    clearMessages()
    const pwd = masterPasswordPrompt.get().trim()
    if (!pwd) {
      errorMessage.set("Master password is required to disable email 2FA.")
      return
    }
    isActionLoading.set(true)
    const result = await session.providerTwoFactorDisable(twoFactorProviderType.email, pwd)
    isActionLoading.set(false)
    if (!result.success) {
      errorMessage.set(result.errorMessage || "Failed to disable email 2FA.")
      return
    }
    emailEnabled.set(false)
    successMessage.set("Email two-factor authentication disabled.")
    await loadProviders()
  }

  // --- WebAuthn Actions ---
  const handleWebAuthnRegisterPrompt = async () => {
    clearMessages()
    webAuthnStatus.set("Requesting registration challenge from server...")
    const pwd = masterPasswordPrompt.get() || undefined
    const challengeRes = await session.webauthnTwoFactorChallengeGet(pwd)
    if (!challengeRes.success) {
      webAuthnStatus.set(challengeRes.errorMessage || "Failed to get registration challenge.")
      return
    }

    const challenge = challengeRes.data
    webAuthnStatus.set("Waiting for security key interaction...")

    try {
      if (typeof navigator === "undefined" || !navigator.credentials || !navigator.credentials.create) {
        webAuthnStatus.set(
          "WebAuthn is not supported by this browser. Enter credential registration response JSON below.",
        )
        return
      }

      const cred = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: {
            name: challenge.rpName ?? "OneWarden",
            id: challenge.rpId ?? (typeof window !== "undefined" ? window.location.hostname : undefined),
          },
          user: {
            id: new Uint8Array(16),
            name: challenge.userName ?? session.session()?.email ?? "user",
            displayName: challenge.userDisplayName ?? "User",
          },
          pubKeyCredParams: (challenge.pubKeyCredParams as unknown as PublicKeyCredentialParameters[]) ?? [
            { alg: -7, type: "public-key" },
            { alg: -257, type: "public-key" },
          ],
          timeout: challenge.timeout ?? 60000,
          attestation: (challenge.attestation as AttestationConveyancePreference) ?? "direct",
        },
      })

      if (!cred) {
        webAuthnStatus.set("Security key registration was cancelled.")
        return
      }

      const pubKeyCred = cred as PublicKeyCredential
      const response = pubKeyCred.response as AuthenticatorAttestationResponse
      const payload = {
        id: pubKeyCred.id,
        rawId: Array.from(new Uint8Array(pubKeyCred.rawId)),
        type: pubKeyCred.type,
        response: {
          clientDataJSON: Array.from(new Uint8Array(response.clientDataJSON)),
          attestationObject: Array.from(new Uint8Array(response.attestationObject)),
        },
      }

      webAuthnDeviceResponse.set(JSON.stringify(payload))
      webAuthnStatus.set("Security key registered. Click 'Save Security Key' to complete.")
    } catch (err) {
      webAuthnStatus.set(err instanceof Error ? err.message : "Failed to register security key.")
    }
  }

  const handleActivateWebAuthn = async () => {
    clearMessages()
    const name = webAuthnKeyName.get().trim() || "Security Key"
    const rawResponse = webAuthnDeviceResponse.get().trim()
    if (!rawResponse) {
      errorMessage.set("Please interact with your security key or provide registration response JSON.")
      return
    }

    let parsedResponse: unknown
    try {
      parsedResponse = JSON.parse(rawResponse)
    } catch {
      parsedResponse = rawResponse
    }

    const nextId = webAuthnKeys.get().length + 1
    isActionLoading.set(true)
    const result = await session.webauthnTwoFactorActivate(
      { id: nextId, name, deviceResponse: parsedResponse },
      masterPasswordPrompt.get() || undefined,
    )
    isActionLoading.set(false)

    if (!result.success) {
      errorMessage.set(result.errorMessage || "Failed to save WebAuthn security key.")
      return
    }

    webAuthnKeys.set(result.data.keys)
    webAuthnEnabled.set(result.data.enabled)
    webAuthnKeyName.set("")
    webAuthnDeviceResponse.set("")
    webAuthnStatus.set(null)
    successMessage.set("Security key successfully added!")
    await loadProviders()
  }

  const handleDeleteWebAuthnKey = async (id: number) => {
    clearMessages()
    const pwd = masterPasswordPrompt.get().trim()
    if (!pwd) {
      errorMessage.set("Master password is required to delete a WebAuthn key.")
      return
    }
    isActionLoading.set(true)
    const result = await session.webauthnTwoFactorDelete(id, pwd)
    isActionLoading.set(false)
    if (!result.success) {
      errorMessage.set(result.errorMessage || "Failed to delete WebAuthn key.")
      return
    }
    webAuthnKeys.set(result.data.keys)
    webAuthnEnabled.set(result.data.enabled)
    successMessage.set("Security key deleted.")
    await loadProviders()
  }

  const handleDisableWebAuthnAll = async () => {
    clearMessages()
    const pwd = masterPasswordPrompt.get().trim()
    if (!pwd) {
      errorMessage.set("Master password is required to disable WebAuthn.")
      return
    }
    isActionLoading.set(true)
    const result = await session.providerTwoFactorDisable(twoFactorProviderType.webauthn, pwd)
    isActionLoading.set(false)
    if (!result.success) {
      errorMessage.set(result.errorMessage || "Failed to disable WebAuthn.")
      return
    }
    webAuthnEnabled.set(false)
    webAuthnKeys.set([])
    successMessage.set("WebAuthn security keys disabled.")
    await loadProviders()
  }

  // --- Duo Actions ---
  const handleActivateDuo = async () => {
    clearMessages()
    const host = duoHost.get().trim()
    const clientId = duoClientId.get().trim()
    const clientSecret = duoClientSecret.get().trim()
    if (!host || !clientId || !clientSecret) {
      errorMessage.set("Please provide Duo Host, Integration Key, and Secret Key.")
      return
    }
    isActionLoading.set(true)
    const result = await session.duoTwoFactorActivate(
      { host, clientId, clientSecret },
      masterPasswordPrompt.get() || undefined,
    )
    isActionLoading.set(false)
    if (!result.success) {
      errorMessage.set(result.errorMessage || "Failed to activate Duo.")
      return
    }
    duoEnabled.set(true)
    successMessage.set("Duo Security activated!")
    await loadProviders()
  }

  const handleDisableDuo = async () => {
    clearMessages()
    const pwd = masterPasswordPrompt.get().trim()
    if (!pwd) {
      errorMessage.set("Master password is required to disable Duo.")
      return
    }
    isActionLoading.set(true)
    const result = await session.providerTwoFactorDisable(twoFactorProviderType.duo, pwd)
    isActionLoading.set(false)
    if (!result.success) {
      errorMessage.set(result.errorMessage || "Failed to disable Duo.")
      return
    }
    duoEnabled.set(false)
    successMessage.set("Duo Security disabled.")
    await loadProviders()
  }

  // --- YubiKey Actions ---
  const handleActivateYubikey = async () => {
    clearMessages()
    const key1 = yubikeyKey1.get().trim() || null
    const key2 = yubikeyKey2.get().trim() || null
    if (!key1 && !key2) {
      errorMessage.set("Please insert your YubiKey and touch the gold contact button in Key 1.")
      return
    }
    isActionLoading.set(true)
    const result = await session.yubikeyTwoFactorActivate(
      { key1, key2, nfc: yubikeyNfc.get() },
      masterPasswordPrompt.get() || undefined,
    )
    isActionLoading.set(false)
    if (!result.success) {
      errorMessage.set(result.errorMessage || "Failed to activate YubiKey.")
      return
    }
    yubikeyEnabled.set(true)
    successMessage.set("YubiKey OTP activated!")
    await loadProviders()
  }

  const handleDisableYubikey = async () => {
    clearMessages()
    const pwd = masterPasswordPrompt.get().trim()
    if (!pwd) {
      errorMessage.set("Master password is required to disable YubiKey.")
      return
    }
    isActionLoading.set(true)
    const result = await session.providerTwoFactorDisable(twoFactorProviderType.yubikey, pwd)
    isActionLoading.set(false)
    if (!result.success) {
      errorMessage.set(result.errorMessage || "Failed to disable YubiKey.")
      return
    }
    yubikeyEnabled.set(false)
    successMessage.set("YubiKey OTP disabled.")
    await loadProviders()
  }

  // --- Recovery Code Actions ---
  const handleGetRecoveryCode = async () => {
    clearMessages()
    const pwd = masterPasswordPrompt.get().trim()
    if (!pwd) {
      errorMessage.set("Master password is required to view your recovery code.")
      return
    }
    isActionLoading.set(true)
    const result = await session.recoverTwoFactorGet(pwd)
    isActionLoading.set(false)
    if (!result.success) {
      errorMessage.set(result.errorMessage || "Failed to retrieve recovery code.")
      return
    }
    recoveryCode.set(result.data.code)
    successMessage.set("Recovery code generated/retrieved.")
  }

  const handleCopyRecoveryCode = async () => {
    const code = recoveryCode.get()
    if (code && typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(code)
        recoveryCopied.set(true)
        setTimeout(() => recoveryCopied.set(false), 2000)
      } catch {
        // Ignore clipboard failure
      }
    }
  }

  // --- Remembered Devices Actions ---
  const handleClearRememberedDevices = () => {
    session.rememberedDevicesClear()
    rememberedDevicesStatus.set("Local remembered device tokens have been cleared.")
    successMessage.set("Remembered device token cleared.")
  }

  return {
    session,
    activeSection: activeSection.get,
    openSection,
    closeSection,
    masterPasswordPrompt: masterPasswordPrompt.get,
    setMasterPasswordPrompt: masterPasswordPrompt.set,
    isLoading: isLoading.get,
    isActionLoading: isActionLoading.get,
    errorMessage: errorMessage.get,
    successMessage: successMessage.get,

    // Provider status
    enabledProviders: enabledProviders.get,
    authenticatorEnabled: authenticatorEnabled.get,
    emailEnabled: emailEnabled.get,
    webAuthnEnabled: webAuthnEnabled.get,
    duoEnabled: duoEnabled.get,
    yubikeyEnabled: yubikeyEnabled.get,

    // Authenticator
    authenticatorKey: authenticatorKey.get,
    authenticatorToken: authenticatorToken.get,
    setAuthenticatorToken: authenticatorToken.set,
    handleActivateAuthenticator,
    handleDisableAuthenticator,

    // Email
    emailAddress: emailAddress.get,
    setEmailAddress: emailAddress.set,
    emailToken: emailToken.get,
    setEmailToken: emailToken.set,
    emailSent: emailSent.get,
    handleSendEmailVerification,
    handleActivateEmail,
    handleDisableEmail,

    // WebAuthn
    webAuthnKeys: webAuthnKeys.get,
    webAuthnKeyName: webAuthnKeyName.get,
    setWebAuthnKeyName: webAuthnKeyName.set,
    webAuthnDeviceResponse: webAuthnDeviceResponse.get,
    setWebAuthnDeviceResponse: webAuthnDeviceResponse.set,
    webAuthnStatus: webAuthnStatus.get,
    handleWebAuthnRegisterPrompt,
    handleActivateWebAuthn,
    handleDeleteWebAuthnKey,
    handleDisableWebAuthnAll,

    // Duo
    duoHost: duoHost.get,
    setDuoHost: duoHost.set,
    duoClientId: duoClientId.get,
    setDuoClientId: duoClientId.set,
    duoClientSecret: duoClientSecret.get,
    setDuoClientSecret: duoClientSecret.set,
    handleActivateDuo,
    handleDisableDuo,

    // YubiKey
    yubikeyKey1: yubikeyKey1.get,
    setYubikeyKey1: yubikeyKey1.set,
    yubikeyKey2: yubikeyKey2.get,
    setYubikeyKey2: yubikeyKey2.set,
    yubikeyNfc: yubikeyNfc.get,
    setYubikeyNfc: yubikeyNfc.set,
    handleActivateYubikey,
    handleDisableYubikey,

    // Recovery
    recoveryCode: recoveryCode.get,
    recoveryCopied: recoveryCopied.get,
    handleGetRecoveryCode,
    handleCopyRecoveryCode,

    // Remembered devices
    rememberedDevicesStatus: rememberedDevicesStatus.get,
    handleClearRememberedDevices,

    // Navigation
    back: () => props.onBack?.(),
  }
}
