import { createMemo, onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { ExtensionBackgroundCipherSummary } from "../background/extensionBackgroundCipherSummarySchema.js"
import type { ExtensionCipher } from "../crypto/extensionCipherSchema.js"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionFullWindowUrlSignalCreate } from "./extensionFullWindowUrlSignalCreate.js"

type CardMode = "list" | "create" | "detail" | "edit" | "delete"
type CardField = "cardholderName" | "brand" | "number" | "expMonth" | "expYear" | "code"

export function extensionFullWindowCardStateCreate(
  model: () => ExtensionFullWindowViewModel,
  commands: () => ExtensionFullWindowCommands,
) {
  const querySignal = extensionFullWindowUrlSignalCreate("q")
  const selectedIdSignal = extensionFullWindowUrlSignalCreate("card")
  const modeSignal = createSignalObject<CardMode>(selectedIdSignal.get() ? "detail" : "list")
  const nameSignal = createSignalObject("")
  const notesSignal = createSignalObject("")
  const cardholderNameSignal = createSignalObject("")
  const brandSignal = createSignalObject("")
  const numberSignal = createSignalObject("")
  const expMonthSignal = createSignalObject("")
  const expYearSignal = createSignalObject("")
  const codeSignal = createSignalObject("")
  const validationSignal = createSignalObject<string | null>(null)
  const revealedSignal = createSignalObject<Record<string, boolean>>({})
  const fieldSignals = {
    cardholderName: cardholderNameSignal,
    brand: brandSignal,
    number: numberSignal,
    expMonth: expMonthSignal,
    expYear: expYearSignal,
    code: codeSignal,
  }
  const selectedSummary = createMemo(() => model().cards.find((item) => item.id === selectedIdSignal.get()) ?? null)
  const selectedDetail = createMemo(() => {
    const detail = model().selectedCard
    return detail?.type === 3 && detail.id === selectedIdSignal.get() ? detail : null
  })
  const visibleCards = createMemo(() => {
    const query = querySignal.get().trim().toLocaleLowerCase()
    if (query === "") return model().cards
    return model().cards.filter((item) => item.name.toLocaleLowerCase().includes(query))
  })
  const canViewSensitive = createMemo(() => selectedSummary()?.viewPassword !== false)
  const canEdit = createMemo(() => selectedSummary()?.edit !== false && canViewSensitive())
  const canDelete = createMemo(() => canEdit() && selectedSummary()?.permissions?.delete !== false)
  const modeIs = (mode: CardMode) => modeSignal.get() === mode
  const detailsOpen = createMemo(() => modeIs("detail") || modeIs("edit") || modeIs("delete"))
  const formOpen = createMemo(() => modeIs("create") || modeIs("edit"))
  const sensitiveValue = (field: "number" | "code", value: string) => {
    if (!canViewSensitive()) return "Hidden by organization policy"
    if (revealedSignal.get()[field]) return value
    return "•".repeat(value.length)
  }
  const expiration = createMemo(() => {
    const card = selectedDetail()?.card
    if (!card?.expMonth && !card?.expYear) return ""
    const month = card.expMonth?.trim().padStart(2, "0") ?? ""
    return [month, card.expYear?.trim() ?? ""].filter(Boolean).join(" / ")
  })

  const formReset = () => {
    nameSignal.set("")
    notesSignal.set("")
    for (const signal of Object.values(fieldSignals)) signal.set("")
    validationSignal.set(null)
  }
  const cardSelect = (summary: ExtensionBackgroundCipherSummary) => {
    selectedIdSignal.set(summary.id)
    revealedSignal.set({})
    modeSignal.set("detail")
    commands().cardRead(summary.id)
  }
  const cardClose = () => {
    selectedIdSignal.set("")
    revealedSignal.set({})
    modeSignal.set("list")
  }
  const cardCreateOpen = () => {
    formReset()
    selectedIdSignal.set("")
    modeSignal.set("create")
  }
  const cardEditOpen = () => {
    const detail = selectedDetail()
    if (detail === null || !canEdit()) return
    nameSignal.set(detail.name)
    notesSignal.set(detail.notes ?? "")
    for (const [field, signal] of Object.entries(fieldSignals) as [CardField, (typeof fieldSignals)[CardField]][]) {
      signal.set(detail.card[field] ?? "")
    }
    validationSignal.set(null)
    modeSignal.set("edit")
  }
  const cardDeleteOpen = () => {
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
    const month = expMonthSignal.get().trim()
    if (month !== "" && (!/^\d{1,2}$/.test(month) || Number(month) < 1 || Number(month) > 12)) {
      validationSignal.set("Expiration month must be between 1 and 12.")
      return
    }
    const year = expYearSignal.get().trim()
    if (year !== "" && !/^\d{2}(\d{2})?$/.test(year)) {
      validationSignal.set("Expiration year must use two or four digits.")
      return
    }
    const now = new Date().toISOString()
    const existing = selectedDetail()
    const card = Object.fromEntries(
      (Object.entries(fieldSignals) as [CardField, (typeof fieldSignals)[CardField]][]).map(([field, signal]) => [
        field,
        signal.get().trim() || null,
      ]),
    ) as Extract<ExtensionCipher, { type: 3 }>["card"]
    const cipher: ExtensionCipher = existing
      ? { ...existing, name, notes: notesSignal.get(), revisionDate: now, card }
      : {
          object: "cipherDetails",
          id: crypto.randomUUID(),
          type: 3,
          creationDate: now,
          revisionDate: now,
          deletedDate: null,
          organizationId: null,
          folderId: null,
          name,
          notes: notesSignal.get(),
          favorite: false,
          fields: [],
          card,
        }
    if (modeIs("edit") && existing !== null) {
      commands().cardUpdate(existing.id, cipher)
      cardClose()
      return
    }
    commands().cardCreate(cipher)
    cardClose()
  }
  const cardDeleteConfirm = () => {
    const id = selectedIdSignal.get()
    if (id === "" || !canDelete()) return
    commands().cardDelete(id)
    cardClose()
  }
  const fieldRevealToggle = (field: "number" | "code") => {
    if (!canViewSensitive()) return
    revealedSignal.set({ ...revealedSignal.get(), [field]: !revealedSignal.get()[field] })
  }
  const fieldIsRevealed = (field: "number" | "code") => Boolean(revealedSignal.get()[field])
  const fieldCopy = (field: string, value: string) => {
    if (!canViewSensitive() && (field === "number" || field === "code")) return
    commands().cipherFieldCopy(`card:${selectedIdSignal.get()}:${field}`, value)
  }
  const fieldIsCopied = (field: string) => model().copiedFieldKey === `card:${selectedIdSignal.get()}:${field}`
  const keyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || (!detailsOpen() && !formOpen())) return
    event.preventDefault()
    if (modeIs("edit") || modeIs("delete")) actionCancel()
    else cardClose()
  }
  onMount(() => window.addEventListener("keydown", keyDown))
  onCleanup(() => window.removeEventListener("keydown", keyDown))
  if (selectedIdSignal.get()) commands().cardRead(selectedIdSignal.get())

  return {
    querySignal,
    nameSignal,
    notesSignal,
    cardholderNameSignal,
    brandSignal,
    numberSignal,
    expMonthSignal,
    expYearSignal,
    codeSignal,
    validation: validationSignal.get,
    visibleCards,
    selectedSummary,
    selectedDetail,
    canEdit,
    canViewSensitive,
    canDelete,
    formOpen,
    creating: () => modeIs("create"),
    deleting: () => modeIs("delete"),
    loading: () => model().cardsLoading,
    detailLoading: () => model().cardDetailLoading,
    busy: () => model().busy,
    errorMessage: () => model().errorMessage,
    cardsEmpty: () => model().cards.length === 0,
    expiration,
    sensitiveValue,
    fieldIsRevealed,
    fieldRevealToggle,
    fieldCopy,
    fieldIsCopied,
    cardSelect,
    cardClose,
    cardCreateOpen,
    cardEditOpen,
    cardDeleteOpen,
    cardDeleteConfirm,
    actionCancel,
    formSubmit,
  }
}
