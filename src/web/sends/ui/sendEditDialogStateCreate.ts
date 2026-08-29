import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import type { SendItem } from "../model/sendItemSchema.js"
import { webSendApiClientCreate } from "../model/webSendApiClientCreate.js"

export interface SendEditDialogProps {
  session: ReturnType<typeof webAuthSessionCreate>
  send: () => SendItem | null
  isOpen: () => boolean
  apiClient?: ReturnType<typeof webSendApiClientCreate>
  onClose: () => void
  onUpdated: () => void
  onNotifySuccess?: (msg: string) => void
  onNotifyError?: (msg: string) => void
}

export function sendEditDialogStateCreate(props: SendEditDialogProps) {
  const apiClient = props.apiClient ?? webSendApiClientCreate()

  const name = createSignalObject("")
  const notes = createSignalObject("")
  const password = createSignalObject("")
  const maxAccessCount = createSignalObject<string>("")
  const hideEmail = createSignalObject(false)
  const disabled = createSignalObject(false)
  const isSubmitting = createSignalObject(false)
  const isRemovingPassword = createSignalObject(false)

  const syncFromSend = (item: SendItem | null) => {
    if (item === null) return
    name.set(item.name)
    notes.set(item.notes ?? "")
    password.set("")
    maxAccessCount.set(item.maxAccessCount !== null ? String(item.maxAccessCount) : "")
    hideEmail.set(item.hideEmail)
    disabled.set(item.disabled)
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    const currentSend = props.send()
    const sessionData = props.session.session()
    if (currentSend === null || sessionData === null) return

    const sendName = name.get().trim()
    if (!sendName) {
      props.onNotifyError?.("Name is required.")
      return
    }

    const maxCountParsed = maxAccessCount.get().trim() ? Number(maxAccessCount.get().trim()) : null

    isSubmitting.set(true)
    const updateResult = await apiClient.sendUpdate(sessionData.accessToken, currentSend.id, {
      type: currentSend.type,
      name: sendName,
      notes: notes.get().trim() || null,
      text: currentSend.text?.text !== undefined ? { text: currentSend.text.text } : null,
      file: currentSend.file
        ? { fileName: currentSend.file.fileName ?? "file", size: String(currentSend.file.size ?? "") }
        : null,
      key: currentSend.key ?? crypto.randomUUID(),
      maxAccessCount: maxCountParsed,
      password: password.get().trim() || undefined,
      disabled: disabled.get(),
      hideEmail: hideEmail.get(),
      expirationDate: currentSend.expirationDate,
      deletionDate: currentSend.deletionDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000).toISOString(),
    })
    isSubmitting.set(false)

    if (updateResult.success) {
      props.onNotifySuccess?.("Send updated successfully.")
      props.onClose()
      props.onUpdated()
    } else {
      props.onNotifyError?.(updateResult.errorMessage)
    }
  }

  const handleRemovePassword = async () => {
    const currentSend = props.send()
    const sessionData = props.session.session()
    if (currentSend === null || sessionData === null) return

    isRemovingPassword.set(true)
    const result = await apiClient.sendRemovePassword(sessionData.accessToken, currentSend.id)
    isRemovingPassword.set(false)

    if (result.success) {
      props.onNotifySuccess?.("Password removed from Send.")
      props.onClose()
      props.onUpdated()
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  return {
    syncFromSend,
    name: name.get,
    setName: name.set,
    notes: notes.get,
    setNotes: notes.set,
    password: password.get,
    setPassword: password.set,
    maxAccessCount: maxAccessCount.get,
    setMaxAccessCount: maxAccessCount.set,
    hideEmail: hideEmail.get,
    setHideEmail: hideEmail.set,
    disabled: disabled.get,
    setDisabled: disabled.set,
    isSubmitting: isSubmitting.get,
    isRemovingPassword: isRemovingPassword.get,
    handleSubmit,
    handleRemovePassword,
    handleClose: props.onClose,
  }
}
