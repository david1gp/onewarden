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
  const passwordInput = createSignalObject("")
  const errorMessage = createSignalObject<string | null>(null)
  const isCopied = createSignalObject(false)

  const sendKeyResolve = () => {
    const encodedKey = typeof window === "undefined" ? "" : window.location.hash.slice(1)
    const keyResult = base64UrlDecode(encodedKey)
    if (!keyResult.success || keyResult.data.byteLength !== 64) return null
    return keyResult.data
  }

  const loadSend = async (password?: string) => {
    const id = props.accessId()
    if (!id) {
      errorMessage.set("No Send access ID provided.")
      isLoading.set(false)
      return
    }

    if (password) {
      isUnlocking.set(true)
    } else {
      isLoading.set(true)
    }
    errorMessage.set(null)

    const result = await apiClient.sendAccess(id, password)

    isLoading.set(false)
    isUnlocking.set(false)

    if (result.success) {
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
    } else {
      if (
        result.errorMessage.toLowerCase().includes("password") ||
        result.errorMessage.toLowerCase().includes("unauthorized") ||
        result.errorMessage.toLowerCase().includes("invalid password")
      ) {
        isPasswordRequired.set(true)
        if (password) {
          errorMessage.set("Incorrect password. Please try again.")
        }
      } else {
        errorMessage.set(result.errorMessage)
      }
    }
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
    const fileResult = await apiClient.sendAccessFile(data.id, data.file.id, passwordInput.get().trim() || null)

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
    passwordInput: passwordInput.get,
    setPasswordInput: passwordInput.set,
    errorMessage: errorMessage.get,
    isCopied: isCopied.get,
    handleUnlockWithPassword,
    handleCopyText,
    handleDownloadFile,
    handleNavigateHome: props.onNavigateHome,
  }
}
