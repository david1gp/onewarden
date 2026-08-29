import { onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { bitwardenCipherStringEncrypt } from "../../../shared/crypto/bitwardenCipherStringEncrypt.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import { webSendApiClientCreate } from "../model/webSendApiClientCreate.js"

export interface SendCreateDialogProps {
  session: ReturnType<typeof webAuthSessionCreate>
  apiClient?: ReturnType<typeof webSendApiClientCreate>
  isOpen: () => boolean
  onClose: () => void
  onCreated: () => void
  onNotifySuccess?: (msg: string) => void
  onNotifyError?: (msg: string) => void
}

export function sendCreateDialogStateCreate(props: SendCreateDialogProps) {
  const apiClient = props.apiClient ?? webSendApiClientCreate()

  const sendType = createSignalObject<0 | 1>(0)
  const name = createSignalObject("")
  const textContent = createSignalObject("")
  const notes = createSignalObject("")
  const password = createSignalObject("")
  const maxAccessCount = createSignalObject<string>("")
  const hideEmail = createSignalObject(false)
  const expirationOption = createSignalObject("7days")
  const isSubmitting = createSignalObject(false)
  const selectedFile = createSignalObject<File | null>(null)

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && props.isOpen()) props.onClose()
  }
  onMount(() => document.addEventListener("keydown", handleKeyDown))
  onCleanup(() => document.removeEventListener("keydown", handleKeyDown))

  const resetForm = () => {
    sendType.set(0)
    name.set("")
    textContent.set("")
    notes.set("")
    password.set("")
    maxAccessCount.set("")
    hideEmail.set(false)
    expirationOption.set("7days")
    selectedFile.set(null)
  }

  const expirationDateResolve = (option: string): string | null => {
    const now = new Date()
    if (option === "1hour") {
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString()
    }
    if (option === "1day") {
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    }
    if (option === "7days") {
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
    if (option === "30days") {
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
    return null
  }

  const deletionDateResolve = (option: string): string => {
    return expirationDateResolve(option) ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000).toISOString()
  }

  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    const file = target.files && target.files.length > 0 ? (target.files[0] ?? null) : null
    selectedFile.set(file)
    if (file && !name.get().trim()) {
      name.set(file.name)
    }
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    const sessionData = props.session.session()
    if (sessionData === null) return
    const userKey = props.session.getUserKey()
    if (userKey === null) {
      props.onNotifyError?.("Unlock your vault before creating a Send.")
      return
    }

    const sendName = name.get().trim()
    if (!sendName) {
      props.onNotifyError?.("Name is required.")
      return
    }

    if (sendType.get() === 0 && !textContent.get()) {
      props.onNotifyError?.("Text content cannot be empty.")
      return
    }

    if (sendType.get() === 1 && !selectedFile.get()) {
      props.onNotifyError?.("Please select a file to send.")
      return
    }

    const expDate = expirationDateResolve(expirationOption.get())
    const deletionDate = deletionDateResolve(expirationOption.get())
    const maxCountParsed = maxAccessCount.get().trim() ? Number(maxAccessCount.get().trim()) : null

    isSubmitting.set(true)
    const sendKeyResult = secureRandomBytes(64)
    if (!sendKeyResult.success) {
      isSubmitting.set(false)
      props.onNotifyError?.(sendKeyResult.errorMessage)
      return
    }
    const sendKey = sendKeyResult.data
    const encryptedKeyResult = await bitwardenCipherStringEncrypt(sendKey, userKey)
    if (!encryptedKeyResult.success) {
      sendKey.fill(0)
      isSubmitting.set(false)
      props.onNotifyError?.(encryptedKeyResult.errorMessage)
      return
    }

    if (sendType.get() === 1 && selectedFile.get()) {
      const file = selectedFile.get()!
      const encryptedFileResult = await bitwardenCipherStringEncrypt(new Uint8Array(await file.arrayBuffer()), sendKey)
      sendKey.fill(0)
      if (!encryptedFileResult.success) {
        isSubmitting.set(false)
        props.onNotifyError?.(encryptedFileResult.errorMessage)
        return
      }
      const encryptedFile = new Blob([encryptedFileResult.data], { type: "application/octet-stream" })
      const createResult = await apiClient.sendFileCreate(
        sessionData.accessToken,
        {
          type: 1,
          name: sendName,
          notes: notes.get().trim() || null,
          password: password.get().trim() || null,
          maxAccessCount: maxCountParsed,
          key: encryptedKeyResult.data,
          disabled: false,
          hideEmail: hideEmail.get(),
          expirationDate: expDate,
          deletionDate,
          file: {
            fileName: file.name,
            size: String(encryptedFile.size),
          },
        },
        encryptedFile,
        file.name,
      )
      isSubmitting.set(false)
      if (createResult.success) {
        props.onNotifySuccess?.("File send created successfully.")
        resetForm()
        props.onClose()
        props.onCreated()
      } else {
        props.onNotifyError?.(createResult.errorMessage)
      }
      return
    }

    const encryptedTextResult = await bitwardenCipherStringEncrypt(textContent.get(), sendKey)
    sendKey.fill(0)
    if (!encryptedTextResult.success) {
      isSubmitting.set(false)
      props.onNotifyError?.(encryptedTextResult.errorMessage)
      return
    }

    const createResult = await apiClient.sendCreate(sessionData.accessToken, {
      type: 0,
      name: sendName,
      notes: notes.get().trim() || null,
      text: { text: encryptedTextResult.data },
      key: encryptedKeyResult.data,
      password: password.get().trim() || null,
      maxAccessCount: maxCountParsed,
      disabled: false,
      hideEmail: hideEmail.get(),
      expirationDate: expDate,
      deletionDate,
    })

    isSubmitting.set(false)
    if (createResult.success) {
      props.onNotifySuccess?.("Text send created successfully.")
      resetForm()
      props.onClose()
      props.onCreated()
    } else {
      props.onNotifyError?.(createResult.errorMessage)
    }
  }

  return {
    sendType: sendType.get,
    setSendType: sendType.set,
    name: name.get,
    setName: name.set,
    textContent: textContent.get,
    setTextContent: textContent.set,
    notes: notes.get,
    setNotes: notes.set,
    password: password.get,
    setPassword: password.set,
    maxAccessCount: maxAccessCount.get,
    setMaxAccessCount: maxAccessCount.set,
    hideEmail: hideEmail.get,
    setHideEmail: hideEmail.set,
    expirationOption: expirationOption.get,
    expirationOptionSignal: expirationOption,
    setExpirationOption: expirationOption.set,
    selectedFile: selectedFile.get,
    isSubmitting: isSubmitting.get,
    handleFileChange,
    handleSubmit,
    handleClose: props.onClose,
  }
}
