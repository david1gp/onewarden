import { createEffect, createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { ExtensionCipherAttachment } from "../crypto/extensionCipherAttachmentSchema.js"
import type { ExtensionCipherPasswordHistoryEntry } from "../crypto/extensionCipherPasswordHistoryEntrySchema.js"
import type { ExtensionCipher } from "../crypto/extensionCipherSchema.js"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"

type CipherExtrasStateOptions = {
  cipher: () => ExtensionCipher
  model: () => ExtensionFullWindowViewModel
  commands: () => ExtensionFullWindowCommands
}

export function extensionFullWindowCipherExtrasStateCreate(options: CipherExtrasStateOptions) {
  const deleteCandidateSignal = createSignalObject<ExtensionCipherAttachment | null>(null)
  const restoreCandidateSignal = createSignalObject<ExtensionCipherPasswordHistoryEntry | null>(null)
  const revealedSignal = createSignalObject<Record<string, boolean>>({})
  let fileInput: HTMLInputElement | undefined
  let currentCipherId = options.cipher().id

  createEffect(() => {
    const cipherId = options.cipher().id
    if (cipherId === currentCipherId) return
    currentCipherId = cipherId
    deleteCandidateSignal.set(null)
    restoreCandidateSignal.set(null)
    revealedSignal.set({})
  })

  const attachments = createMemo(() => options.cipher().attachments ?? [])
  const history = createMemo(() => (options.cipher().type === 1 ? (options.cipher().passwordHistory ?? []) : []))
  const canEdit = createMemo(() => options.cipher().edit !== false && options.cipher().deletedDate === null)
  const canViewHistory = createMemo(() => options.cipher().type === 1 && options.cipher().viewPassword !== false)
  const operationId = () => options.model().attachmentOperationId
  const operationProgress = () => options.model().attachmentProgress
  const attachmentBusy = (attachment: ExtensionCipherAttachment) => operationId() === attachment.id
  const uploadBusy = () => operationId() === "upload"
  const anyAttachmentBusy = () => operationId() !== null
  const fileInputSet = (element: HTMLInputElement) => {
    fileInput = element
  }
  const uploadOpen = () => fileInput?.click()
  const uploadChange = (event: Event) => {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ""
    if (file === undefined || !canEdit()) return
    options.commands().attachmentUpload(options.cipher(), file)
  }
  const download = (attachment: ExtensionCipherAttachment) =>
    options.commands().attachmentDownload(options.cipher(), attachment)
  const deleteOpen = (attachment: ExtensionCipherAttachment) => {
    if (canEdit()) deleteCandidateSignal.set(attachment)
  }
  const deleteCancel = () => deleteCandidateSignal.set(null)
  const deleteConfirm = () => {
    const attachment = deleteCandidateSignal.get()
    if (attachment === null || !canEdit()) return
    options.commands().attachmentDelete(options.cipher(), attachment)
    deleteCandidateSignal.set(null)
  }
  const restoreOpen = (entry: ExtensionCipherPasswordHistoryEntry) => restoreCandidateSignal.set(entry)
  const restoreCancel = () => restoreCandidateSignal.set(null)
  const restoreConfirm = () => {
    const cipher = options.cipher()
    const entry = restoreCandidateSignal.get()
    if (cipher.type !== 1 || entry === null || !canEdit() || !canViewHistory()) return
    options.commands().passwordHistoryRestore(cipher, entry)
    restoreCandidateSignal.set(null)
    revealedSignal.set({})
  }
  const historyKey = (entry: ExtensionCipherPasswordHistoryEntry, index: number) =>
    `history:${options.cipher().id}:${entry.lastUsedDate}:${index}`
  const historyRevealed = (entry: ExtensionCipherPasswordHistoryEntry, index: number) =>
    revealedSignal.get()[historyKey(entry, index)] === true
  const historyRevealToggle = (entry: ExtensionCipherPasswordHistoryEntry, index: number) => {
    const key = historyKey(entry, index)
    revealedSignal.set({ ...revealedSignal.get(), [key]: !revealedSignal.get()[key] })
  }
  const historyCopy = (entry: ExtensionCipherPasswordHistoryEntry, index: number) =>
    options.commands().cipherFieldCopy(historyKey(entry, index), entry.password)
  const historyCopied = (entry: ExtensionCipherPasswordHistoryEntry, index: number) =>
    options.model().copiedFieldKey === historyKey(entry, index)
  const sizeFormat = (attachment: ExtensionCipherAttachment) => {
    if (attachment.sizeName) return attachment.sizeName
    const size = Number(attachment.size)
    if (!Number.isFinite(size) || size < 0) return "Size unavailable"
    if (size < 1024) return `${size} bytes`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }
  const dateFormat = (value: string) => {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
  }

  return {
    attachments,
    history,
    canEdit,
    canViewHistory,
    fileInputSet,
    uploadOpen,
    uploadChange,
    uploadBusy,
    anyAttachmentBusy,
    attachmentBusy,
    operationProgress,
    download,
    deleteCandidate: deleteCandidateSignal.get,
    deleteOpen,
    deleteCancel,
    deleteConfirm,
    restoreCandidate: restoreCandidateSignal.get,
    restoreOpen,
    restoreCancel,
    restoreConfirm,
    historyRevealed,
    historyRevealToggle,
    historyCopy,
    historyCopied,
    sizeFormat,
    dateFormat,
    busy: () => options.model().busy,
    errorMessage: () => options.model().errorMessage,
  }
}
