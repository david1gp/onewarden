import { createMemo } from "solid-js"
import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.js"
import { base64UrlDecode } from "../../shared/crypto/base64UrlDecode.js"
import type { ExtensionFullWindowCommands } from "../fullwindow/ExtensionFullWindowCommands.js"
import type { ExtensionLoginChallenge } from "./extensionLoginChallengeSchema.js"
import { extensionLoginTwoFactorProvider } from "./extensionLoginTwoFactorProvider.js"

export function extensionLoginChallengeViewStateCreate(options: {
  challenge: () => ExtensionLoginChallenge
  commands: () => ExtensionFullWindowCommands
  busy: () => boolean
}) {
  const selectedProviderSignal = createSignalObject(String(options.challenge().providers[0] ?? 0))
  const tokenSignal = createSignalObject("")
  const rememberDeviceSignal = createSignalObject(false)
  const webAuthnStatusSignal = createSignalObject<string | null>(null)
  const selectedProvider = createMemo(() => Number(selectedProviderSignal.get()))
  const providerKeys = createMemo(() => options.challenge().providers.map(String))
  const tokenInputSignal: SignalObject<string> = {
    get: tokenSignal.get,
    set: tokenSignal.set,
  }
  const providerSelectSignal: SignalObject<string> = {
    get: selectedProviderSignal.get,
    set: (value) => {
      selectedProviderSignal.set(value)
      tokenSignal.set("")
      webAuthnStatusSignal.set(null)
    },
  }
  const providerLabel = (value: string): string => {
    const provider = Number(value)
    if (provider === extensionLoginTwoFactorProvider.authenticator) return "Authenticator app"
    if (provider === extensionLoginTwoFactorProvider.email) return "Email"
    if (provider === extensionLoginTwoFactorProvider.webauthn) return "Security key or passkey"
    if (provider === extensionLoginTwoFactorProvider.recoveryCode) return "Recovery code"
    return value
  }
  const emailSend = () => options.commands().loginChallengeEmailSend(options.challenge().challengeId)
  const cancel = () => {
    tokenSignal.set("")
    options.commands().loginChallengeCancel(options.challenge().challengeId)
  }
  const submit = (event: SubmitEvent) => {
    event.preventDefault()
    const token = tokenSignal.get().trim()
    if (token === "" || options.busy()) return
    options.commands().loginChallengeSubmit({
      challengeId: options.challenge().challengeId,
      provider: selectedProvider() as 0 | 1 | 7 | 8,
      token,
      rememberDevice: rememberDeviceSignal.get(),
    })
  }
  const webAuthnPrompt = async () => {
    webAuthnStatusSignal.set(null)
    const challenge = options.challenge().webAuthn
    if (challenge === null || challenge === undefined) {
      webAuthnStatusSignal.set("The security-key challenge is unavailable.")
      return
    }
    if (navigator.credentials?.get === undefined) {
      webAuthnStatusSignal.set("WebAuthn is not supported by this browser.")
      return
    }
    const challengeBytesResult = base64UrlDecode(challenge.challenge)
    if (!challengeBytesResult.success) {
      webAuthnStatusSignal.set("The security-key challenge is invalid.")
      return
    }
    const allowCredentials: PublicKeyCredentialDescriptor[] = []
    for (const credential of challenge.allowCredentials ?? []) {
      const credentialIdResult = base64UrlDecode(credential.id)
      if (!credentialIdResult.success) {
        webAuthnStatusSignal.set("A security-key identifier is invalid.")
        return
      }
      allowCredentials.push({
        id: Uint8Array.from(credentialIdResult.data),
        type: credential.type,
        transports: credential.transports,
      })
    }
    webAuthnStatusSignal.set("Waiting for your security key or passkey…")
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: Uint8Array.from(challengeBytesResult.data),
          rpId: challenge.rpId ?? challenge.rp?.id,
          timeout: challenge.timeout ?? 60_000,
          userVerification: challenge.userVerification ?? "preferred",
          allowCredentials,
          extensions: challenge.extensions,
        },
      })
      if (credential === null) {
        webAuthnStatusSignal.set("Security-key verification was cancelled.")
        return
      }
      const publicKeyCredential = credential as PublicKeyCredential
      const response = publicKeyCredential.response as AuthenticatorAssertionResponse
      tokenSignal.set(
        JSON.stringify({
          id: publicKeyCredential.id,
          rawId: Array.from(new Uint8Array(publicKeyCredential.rawId)),
          type: publicKeyCredential.type,
          response: {
            clientDataJSON: Array.from(new Uint8Array(response.clientDataJSON)),
            authenticatorData: Array.from(new Uint8Array(response.authenticatorData)),
            signature: Array.from(new Uint8Array(response.signature)),
            userHandle: response.userHandle === null ? null : Array.from(new Uint8Array(response.userHandle)),
          },
        }),
      )
      webAuthnStatusSignal.set("Security key verified. Submit to continue.")
    } catch (error) {
      webAuthnStatusSignal.set(error instanceof Error ? error.message : "Security-key verification failed.")
    }
  }

  return {
    selectedProvider,
    providerSelectSignal,
    providerKeys,
    providerLabel,
    tokenInputSignal,
    rememberDevice: rememberDeviceSignal.get,
    rememberDeviceSet: rememberDeviceSignal.set,
    webAuthnStatus: webAuthnStatusSignal.get,
    emailSend,
    webAuthnPrompt,
    submit,
    cancel,
  }
}
