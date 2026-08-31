import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { base64UrlDecode } from "../../../shared/crypto/base64UrlDecode.js"
import { bitwardenCipherStringDecrypt } from "../../../shared/crypto/bitwardenCipherStringDecrypt.js"
import { bitwardenCipherStringDecryptText } from "../../../shared/crypto/bitwardenCipherStringDecryptText.js"
import type { SendAccessResponse } from "../model/sendAccessResponseSchema.js"
import { webSendApiClientCreate } from "../model/webSendApiClientCreate.js"

export interface SendAccessViewProps {
  accessId: () => string
  apiClient?: ReturnType<typeof webSendApiClientCreate>
  onNavigateHome?: () => void
}

export function sendAccessViewStateCreate(props: SendAccessViewProps) {
  const apiClient = props.apiClient ?? webSendApiClientCreate()

  const sendData = createSignalObject<SendAccessResponse | null>(null)
  const isLoading = createSignalObject(true)
  const isUnlocking = createSignalObject(false)
  const isDownloading = createSignalObject(false)
  const isPasswordRequired = createSignalObject(false)
  const isEmailRequired = createSignalObject(false)
  const isOtpRequired = createSignalObject(false)
  const passwordInput = createSignalObject("")
  const emailInput = createSignalObject("")
  const otpInput = createSignalObject("")
  const recipientAccessToken = createSignalObject<string | null>(null)
  const errorMessage = createSignalObject<string | null>(null)
  const isCopied = createSignalObject(false)

  const sendKeyResolve = () => {
    const encodedKey = typeof window === "undefined" ? "" : window.location.hash.slice(1)
    const keyResult = base64UrlDecode(encodedKey)
    if (!keyResult.success || keyResult.data.byteLength !== 64) return null
    return keyResult.data
  }

  const handleAccessError = (message: string) => {
    const normalizedMessage = message.toLowerCase()
    if (normalizedMessage.includes("verification code was sent")) {
      isEmailRequired.set(true)
      isOtpRequired.set(true)
      errorMessage.set("A verification code was sent. Enter it below to continue.")
      return
    }
    if (normalizedMessage.includes("verification code") || normalizedMessage.includes("otp")) {
      isEmailRequired.set(true)
      isOtpRequired.set(true)
      errorMessage.set(message)
      return
    }
    if (normalizedMessage.includes("email")) {
      isEmailRequired.set(true)
      isOtpRequired.set(false)
      errorMessage.set(normalizedMessage.includes("required") ? null : message)
      return
    }
    if (
      normalizedMessage.includes("password") ||
      normalizedMessage.includes("unauthorized") ||
      normalizedMessage.includes("invalid password")
    ) {
      isPasswordRequired.set(true)
      if (passwordInput.get()) errorMessage.set("Incorrect password. Please try again.")
      return
    }
    errorMessage.set(message)
  }

  const sendDataSet = async (result: Awaited<ReturnType<typeof apiClient.sendAccess>>) => {
    if (!result.success) {
      handleAccessError(result.errorMessage)
      return
    }
    const sendKey = sendKeyResolve()
    if (sendKey === null) {
      errorMessage.set("This Send link is missing a valid decryption key.")
      return
    }
    if (result.data.text?.text) {
      const textResult = await bitwardenCipherStringDecryptText(result.data.text.text, sendKey)
      if (!textResult.success) {
        errorMessage.set("This Send could not be decrypted.")
        return
      }
      sendData.set({ ...result.data, text: { ...result.data.text, text: textResult.data } })
    } else {
      sendData.set(result.data)
    }
    isPasswordRequired.set(false)
    isEmailRequired.set(false)
    isOtpRequired.set(false)
    errorMessage.set(null)
  }

  const loadSend = async (password?: string, email?: string, otp?: string) => {
    const id = props.accessId()
    if (!id) {
      errorMessage.set("No Send access ID provided.")
      isLoading.set(false)
      return
    }

    if (password !== undefined || email !== undefined) {
      isUnlocking.set(true)
    } else {
      isLoading.set(true)
    }
    errorMessage.set(null)

    let result: Awaited<ReturnType<typeof apiClient.sendAccess>>
    if (email !== undefined) {
      const tokenResult = await apiClient.sendAccessToken(id, email, otp)
      if (!tokenResult.success) {
        isLoading.set(false)
        isUnlocking.set(false)
        handleAccessError(tokenResult.errorMessage)
        return
      }
      recipientAccessToken.set(tokenResult.data.accessToken)
      result = await apiClient.sendAccessAuthenticated(tokenResult.data.accessToken)
    } else {
      result = await apiClient.sendAccess(id, password)
    }

    isLoading.set(false)
    isUnlocking.set(false)

    await sendDataSet(result)
  }

  onMount(() => {
    loadSend()
  })

  const handleUnlockWithPassword = async (e: Event) => {
    e.preventDefault()
    const pwd = passwordInput.get().trim()
    if (!pwd) {
      errorMessage.set("Password is required.")
      return
    }
    await loadSend(pwd)
  }

  const handleRecipientSubmit = async (e: Event) => {
    e.preventDefault()
    const email = emailInput.get().trim()
    if (!email) {
      errorMessage.set("Email is required.")
      return
    }
    const otp = isOtpRequired.get() ? otpInput.get().trim() : undefined
    if (isOtpRequired.get() && !otp) {
      errorMessage.set("Verification code is required.")
      return
    }
    await loadSend(undefined, email, otp)
  }

  const handleCopyText = async () => {
    const text = sendData.get()?.text?.text
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      isCopied.set(true)
      setTimeout(() => isCopied.set(false), 3000)
    } catch {
      errorMessage.set("Failed to copy text.")
    }
  }

  const handleDownloadFile = async () => {
    const data = sendData.get()
    if (!data?.file?.id) return

    isDownloading.set(true)
    const fileResult =
      recipientAccessToken.get() !== null
        ? await apiClient.sendAccessFileAuthenticated(recipientAccessToken.get()!, data.file.id)
        : await apiClient.sendAccessFile(data.id, data.file.id, passwordInput.get().trim() || null)

    if (fileResult.success && fileResult.data.url) {
      const sendKey = sendKeyResolve()
      if (sendKey === null) {
        errorMessage.set("This Send link is missing a valid decryption key.")
        isDownloading.set(false)
        return
      }
      try {
        const response = await fetch(fileResult.data.url)
        if (!response.ok) {
          errorMessage.set("The encrypted file could not be downloaded.")
          isDownloading.set(false)
          return
        }
        const encryptedFile = await response.text()
        const decryptedResult = await bitwardenCipherStringDecrypt(encryptedFile, sendKey)
        if (!decryptedResult.success) {
          errorMessage.set("This Send file could not be decrypted.")
          isDownloading.set(false)
          return
        }
        const blob = new Blob([new Uint8Array(decryptedResult.data)], { type: "application/octet-stream" })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = data.file.fileName ?? "download"
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        URL.revokeObjectURL(url)
      } catch {
        errorMessage.set("The Send file could not be downloaded.")
      }
    } else {
      errorMessage.set(fileResult.success ? "Could not retrieve download link." : fileResult.errorMessage)
    }
    isDownloading.set(false)
  }

  return {
    sendData: sendData.get,
    isLoading: isLoading.get,
    isUnlocking: isUnlocking.get,
    isDownloading: isDownloading.get,
    isPasswordRequired: isPasswordRequired.get,
    isEmailRequired: isEmailRequired.get,
    isOtpRequired: isOtpRequired.get,
    passwordInput: passwordInput.get,
    setPasswordInput: passwordInput.set,
    emailInput: emailInput.get,
    setEmailInput: emailInput.set,
    otpInput: otpInput.get,
    setOtpInput: otpInput.set,
    errorMessage: errorMessage.get,
    isCopied: isCopied.get,
    handleUnlockWithPassword,
    handleRecipientSubmit,
    handleCopyText,
    handleDownloadFile,
    handleNavigateHome: props.onNavigateHome,
  }
}
