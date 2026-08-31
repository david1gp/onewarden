import { createMemo } from "solid-js"
import * as v from "valibot"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { base64UrlDecode } from "../../../shared/crypto/base64UrlDecode.js"
import { twoFactorProviderType } from "../model/twoFactorProviderType.js"
import { twoFactorWebAuthnChallengeResponseSchema } from "../model/twoFactorWebAuthnChallengeResponseSchema.js"
import type { webAuthSessionCreate } from "../model/webAuthSessionCreate.js"
import { webAuthSessionDefault } from "../model/webAuthSessionDefault.js"

export interface AuthTwoFactorChallengeCardProps {
  session?: ReturnType<typeof webAuthSessionCreate>
  onSuccess?: () => void
  onCancel?: () => void
  initialProvider?: number | string
  headingLevel?: "h1" | "h2" | "h3"
  class?: string
}

export function authTwoFactorChallengeCardStateCreate(props: AuthTwoFactorChallengeCardProps = {}) {
  const session = props.session ?? webAuthSessionDefault()
  const pending = session.pendingTwoFactor()

  const availableProviders = createMemo(() => {
    const rawProviders = pending?.challenge?.TwoFactorProviders ?? [0]
    const list: number[] = []
    for (const p of rawProviders) {
      const num = typeof p === "number" ? p : Number.parseInt(String(p), 10)
      if (Number.isSafeInteger(num) && !list.includes(num)) {
        list.push(num)
      }
    }
    if (!list.includes(twoFactorProviderType.recoveryCode)) {
      list.push(twoFactorProviderType.recoveryCode)
    }
    return list
  })

  const defaultProvider = () => {
    if (props.initialProvider !== undefined) {
      const num = Number(props.initialProvider)
      if (availableProviders().includes(num)) return num
    }
    const first = availableProviders()[0]
    return first !== undefined ? first : twoFactorProviderType.authenticator
  }

  const selectedProviderString = createSignalObject<string>(String(defaultProvider()))
  const selectedProvider = () => Number(selectedProviderString.get())
  const token = createSignalObject("")
  const rememberDevice = createSignalObject(false)
  const isSubmitting = createSignalObject(false)
  const isEmailSending = createSignalObject(false)
  const emailSentMessage = createSignalObject<string | null>(null)
  const webAuthnStatus = createSignalObject<string | null>(null)
  const errorMessage = createSignalObject<string | null>(null)

  const obscuredEmail = createMemo(() => {
    const providers2 = pending?.challenge?.TwoFactorProviders2
    if (providers2 && typeof providers2 === "object") {
      const emailResult = v.safeParse(
        v.object({ Email: v.pipe(v.string(), v.minLength(1)) }),
        providers2[String(twoFactorProviderType.email)],
      )
      if (emailResult.success) return emailResult.output.Email
    }
    const rawEmail = pending?.email
    if (!rawEmail) return null
    const at = rawEmail.indexOf("@")
    if (at <= 2) return `*@${rawEmail.slice(at + 1)}`
    return `${rawEmail.slice(0, 2)}***@${rawEmail.slice(at + 1)}`
  })

  const selectProvider = (provider: number) => {
    selectedProviderString.set(String(provider))
    token.set("")
    errorMessage.set(null)
    emailSentMessage.set(null)
    webAuthnStatus.set(null)
  }

  const handleSendLoginEmail = async () => {
    errorMessage.set(null)
    isEmailSending.set(true)
    const result = await session.emailTwoFactorLoginSend(pending?.email)
    isEmailSending.set(false)
    if (!result.success) {
      errorMessage.set(result.errorMessage || "Failed to send login verification email.")
      return
    }
    emailSentMessage.set("Verification code sent! Please check your email.")
  }

  const handleWebAuthnPrompt = async () => {
    errorMessage.set(null)
    webAuthnStatus.set("Waiting for security key interaction...")
    try {
      if (typeof navigator === "undefined" || !navigator.credentials || !navigator.credentials.get) {
        webAuthnStatus.set("WebAuthn is not supported by this browser. Enter credential assertion JSON manually.")
        return
      }

      const providers2 = pending?.challenge?.TwoFactorProviders2
      const webauthnDataResult = v.safeParse(
        v.object({ Challenge: twoFactorWebAuthnChallengeResponseSchema }),
        providers2?.[String(twoFactorProviderType.webauthn)],
      )
      if (!webauthnDataResult.success) {
        webAuthnStatus.set("The WebAuthn challenge was invalid.")
        return
      }
      const challenge = webauthnDataResult.output.Challenge
      const challengeBytesResult = base64UrlDecode(challenge.challenge)
      if (!challengeBytesResult.success) {
        webAuthnStatus.set("The WebAuthn challenge was invalid.")
        return
      }
      const allowCredentials = []
      for (const credential of challenge.allowCredentials ?? []) {
        const credentialIdResult = base64UrlDecode(credential.id)
        if (!credentialIdResult.success) {
          webAuthnStatus.set("A WebAuthn credential identifier was invalid.")
          return
        }
        allowCredentials.push({
          id: Uint8Array.from(credentialIdResult.data),
          transports: credential.transports,
          type: credential.type,
        })
      }

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: Uint8Array.from(challengeBytesResult.data),
          timeout: 60000,
          userVerification: challenge.userVerification ?? "preferred",
          allowCredentials,
        },
      })

      if (!credential) {
        webAuthnStatus.set("Security key interaction was cancelled.")
        return
      }

      const pubKeyCred = credential as PublicKeyCredential
      const response = pubKeyCred.response as AuthenticatorAssertionResponse
      const payload = {
        id: pubKeyCred.id,
        rawId: Array.from(new Uint8Array(pubKeyCred.rawId)),
        type: pubKeyCred.type,
        response: {
          clientDataJSON: Array.from(new Uint8Array(response.clientDataJSON)),
          authenticatorData: Array.from(new Uint8Array(response.authenticatorData)),
          signature: Array.from(new Uint8Array(response.signature)),
          userHandle: response.userHandle ? Array.from(new Uint8Array(response.userHandle)) : null,
        },
      }

      token.set(JSON.stringify(payload))
      webAuthnStatus.set("Security key verified. Ready to submit.")
    } catch (err) {
      webAuthnStatus.set(err instanceof Error ? err.message : "Failed to interact with security key.")
    }
  }

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault()
    errorMessage.set(null)

    const tokenValue = token.get().trim()
    if (tokenValue === "") {
      errorMessage.set("Please enter the verification code or token.")
      return
    }

    isSubmitting.set(true)
    const result = await session.loginTwoFactor({
      provider: selectedProvider(),
      token: tokenValue,
      remember: rememberDevice.get(),
      email: pending?.email,
      masterPassword: pending?.masterPassword,
    })
    isSubmitting.set(false)

    if (!result.success) {
      errorMessage.set(result.errorMessage || "Two-factor verification failed. Please try again.")
      return
    }

    props.onSuccess?.()
  }

  return {
    headingLevel: () => props.headingLevel ?? "h1",
    availableProviders,
    availableProviderKeys: () => availableProviders().map(String),
    selectedProvider,
    selectedProviderSignal: selectedProviderString,
    selectProvider,
    token: token.get,
    setToken: token.set,
    rememberDevice: rememberDevice.get,
    setRememberDevice: rememberDevice.set,
    isSubmitting: isSubmitting.get,
    isEmailSending: isEmailSending.get,
    emailSentMessage: emailSentMessage.get,
    webAuthnStatus: webAuthnStatus.get,
    errorMessage: errorMessage.get,
    obscuredEmail,
    handleSendLoginEmail,
    handleWebAuthnPrompt,
    handleSubmit,
    cancel: () => props.onCancel?.(),
  }
}
