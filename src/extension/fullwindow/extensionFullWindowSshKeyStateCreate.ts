import { createMemo, onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { ExtensionBackgroundCipherSummary } from "../background/extensionBackgroundCipherSummarySchema.js"
import type { ExtensionCipher } from "../crypto/extensionCipherSchema.js"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionFullWindowUrlSignalCreate } from "./extensionFullWindowUrlSignalCreate.js"

type SshKeyMode = "list" | "create" | "detail" | "edit" | "delete"

export function extensionFullWindowSshKeyStateCreate(
  model: () => ExtensionFullWindowViewModel,
  commands: () => ExtensionFullWindowCommands,
) {
  const querySignal = extensionFullWindowUrlSignalCreate("q")
  const selectedIdSignal = extensionFullWindowUrlSignalCreate("ssh-key")
  const modeSignal = createSignalObject<SshKeyMode>(selectedIdSignal.get() ? "detail" : "list")
  const nameSignal = createSignalObject("")
  const privateKeySignal = createSignalObject("")
  const publicKeySignal = createSignalObject("")
  const fingerprintSignal = createSignalObject("")
  const notesSignal = createSignalObject("")
  const validationSignal = createSignalObject<string | null>(null)
  const privateKeyRevealedSignal = createSignalObject(false)
  const selectedSummary = createMemo(() => model().sshKeys.find((item) => item.id === selectedIdSignal.get()) ?? null)
  const selectedDetail = createMemo(() => {
    const detail = model().selectedSshKey
    return detail?.type === 5 && detail.id === selectedIdSignal.get() ? detail : null
  })
  const visibleSshKeys = createMemo(() => {
    const query = querySignal.get().trim().toLocaleLowerCase()
    if (query === "") return model().sshKeys
    return model().sshKeys.filter((item) => item.name.toLocaleLowerCase().includes(query))
  })
  const canViewSensitive = createMemo(() => selectedSummary()?.viewPassword !== false)
  const canEdit = createMemo(() => selectedSummary()?.edit !== false && canViewSensitive())
  const canDelete = createMemo(() => canEdit() && selectedSummary()?.permissions?.delete !== false)
  const modeIs = (mode: SshKeyMode) => modeSignal.get() === mode
  const formOpen = createMemo(() => modeIs("create") || modeIs("edit"))
  const detailsOpen = createMemo(() => modeIs("detail") || modeIs("edit") || modeIs("delete"))
  const formReset = () => {
    nameSignal.set("")
    privateKeySignal.set("")
    publicKeySignal.set("")
    fingerprintSignal.set("")
    notesSignal.set("")
    validationSignal.set(null)
  }
  const sshKeySelect = (summary: ExtensionBackgroundCipherSummary) => {
    selectedIdSignal.set(summary.id)
    privateKeyRevealedSignal.set(false)
    modeSignal.set("detail")
    commands().sshKeyRead(summary.id)
  }
  const sshKeyClose = () => {
    selectedIdSignal.set("")
    privateKeyRevealedSignal.set(false)
    modeSignal.set("list")
  }
  const sshKeyCreateOpen = () => {
    formReset()
    selectedIdSignal.set("")
    modeSignal.set("create")
  }
  const sshKeyEditOpen = () => {
    const detail = selectedDetail()
    if (detail === null || !canEdit()) return
    nameSignal.set(detail.name)
    privateKeySignal.set(detail.sshKey.privateKey ?? "")
    publicKeySignal.set(detail.sshKey.publicKey ?? "")
    fingerprintSignal.set(detail.sshKey.keyFingerprint ?? "")
    notesSignal.set(detail.notes ?? "")
    validationSignal.set(null)
    modeSignal.set("edit")
  }
  const sshKeyDeleteOpen = () => {
    if (canDelete()) modeSignal.set("delete")
  }
  const actionCancel = () => modeSignal.set(selectedIdSignal.get() ? "detail" : "list")
  const formSubmit = (event: SubmitEvent) => {
    event.preventDefault()
    const name = nameSignal.get().trim()
    if (name === "") {
      validationSignal.set("Name is required.")
      return
    }
    const privateKey = privateKeySignal.get().trim()
    const publicKey = publicKeySignal.get().trim()
    const fingerprint = fingerprintSignal.get().trim()
    if (privateKey === "" || publicKey === "" || fingerprint === "") {
      validationSignal.set("Private key, public key, and fingerprint are required.")
      return
    }
    if (!publicKey.includes(" ")) {
      validationSignal.set("Public key must include a key type and encoded key.")
      return
    }
    const now = new Date().toISOString()
    const existing = selectedDetail()
    const sshKey = { privateKey, publicKey, keyFingerprint: fingerprint }
    const cipher: ExtensionCipher = existing
      ? { ...existing, name, notes: notesSignal.get(), revisionDate: now, sshKey }
      : {
          object: "cipherDetails",
          id: crypto.randomUUID(),
          type: 5,
          creationDate: now,
          revisionDate: now,
          deletedDate: null,
          organizationId: null,
          folderId: null,
          name,
          notes: notesSignal.get(),
          favorite: false,
          fields: [],
          sshKey,
        }
    if (modeIs("edit") && existing !== null) {
      commands().sshKeyUpdate(existing.id, cipher)
      sshKeyClose()
      return
    }
    commands().sshKeyCreate(cipher)
    sshKeyClose()
  }
  const sshKeyDeleteConfirm = () => {
    const id = selectedIdSignal.get()
    if (id === "" || !canDelete()) return
    commands().sshKeyDelete(id)
    sshKeyClose()
  }
  const privateKeyRevealToggle = () => {
    if (!canViewSensitive()) return
    privateKeyRevealedSignal.set(!privateKeyRevealedSignal.get())
  }
  const privateKeyValue = (value: string) =>
    canViewSensitive()
      ? privateKeyRevealedSignal.get()
        ? value
        : "•".repeat(Math.min(value.length, 64))
      : "Hidden by organization policy"
  const fieldCopy = (field: string, value: string) => {
    if (!canViewSensitive() && field === "privateKey") return
    commands().cipherFieldCopy(`sshKey:${selectedIdSignal.get()}:${field}`, value)
  }
  const fieldIsCopied = (field: string) => model().copiedFieldKey === `sshKey:${selectedIdSignal.get()}:${field}`
  const keyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || (!detailsOpen() && !formOpen())) return
    event.preventDefault()
    if (modeIs("edit") || modeIs("delete")) actionCancel()
    else sshKeyClose()
  }
  onMount(() => window.addEventListener("keydown", keyDown))
  onCleanup(() => window.removeEventListener("keydown", keyDown))
  if (selectedIdSignal.get()) commands().sshKeyRead(selectedIdSignal.get())
  return {
    querySignal,
    nameSignal,
    privateKeySignal,
    publicKeySignal,
    fingerprintSignal,
    notesSignal,
    validation: validationSignal.get,
    visibleSshKeys,
    selectedSummary,
    selectedDetail,
    canEdit,
    canViewSensitive,
    canDelete,
    formOpen,
    creating: () => modeIs("create"),
    deleting: () => modeIs("delete"),
    loading: () => model().sshKeysLoading,
    detailLoading: () => model().sshKeyDetailLoading,
    busy: () => model().busy,
    errorMessage: () => model().errorMessage,
    sshKeysEmpty: () => model().sshKeys.length === 0,
    privateKeyIsRevealed: privateKeyRevealedSignal.get,
    privateKeyRevealToggle,
    privateKeyValue,
    fieldCopy,
    fieldIsCopied,
    sshKeySelect,
    sshKeyClose,
    sshKeyCreateOpen,
    sshKeyEditOpen,
    sshKeyDeleteOpen,
    sshKeyDeleteConfirm,
    actionCancel,
    formSubmit,
  }
}
