import { createMemo, onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { ExtensionBackgroundCipherSummary } from "../background/extensionBackgroundCipherSummarySchema.js"
import type { ExtensionCipher } from "../crypto/extensionCipherSchema.js"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionFullWindowUrlSignalCreate } from "./extensionFullWindowUrlSignalCreate.js"

type SecureNoteMode = "list" | "create" | "detail" | "edit" | "delete"

export function extensionFullWindowSecureNoteStateCreate(
  model: () => ExtensionFullWindowViewModel,
  commands: () => ExtensionFullWindowCommands,
) {
  const querySignal = extensionFullWindowUrlSignalCreate("q")
  const selectedIdSignal = extensionFullWindowUrlSignalCreate("note")
  const modeSignal = createSignalObject<SecureNoteMode>(selectedIdSignal.get() ? "detail" : "list")
  const nameSignal = createSignalObject("")
  const noteSignal = createSignalObject("")
  const validationSignal = createSignalObject<string | null>(null)
  const selectedSummary = createMemo(
    () => model().secureNotes.find((item) => item.id === selectedIdSignal.get()) ?? null,
  )
  const selectedDetail = createMemo(() => {
    const detail = model().selectedSecureNote
    return detail?.type === 2 && detail.id === selectedIdSignal.get() ? detail : null
  })
  const visibleNotes = createMemo(() => {
    const query = querySignal.get().trim().toLocaleLowerCase()
    if (query === "") return model().secureNotes
    return model().secureNotes.filter((item) => item.name.toLocaleLowerCase().includes(query))
  })
  const canEdit = createMemo(() => selectedSummary()?.edit !== false)
  const canDelete = createMemo(() => canEdit() && selectedSummary()?.permissions?.delete !== false)
  const modeIs = (mode: SecureNoteMode) => modeSignal.get() === mode
  const detailsOpen = createMemo(() => modeIs("detail") || modeIs("edit") || modeIs("delete"))
  const formOpen = createMemo(() => modeIs("create") || modeIs("edit"))

  const noteSelect = (summary: ExtensionBackgroundCipherSummary) => {
    selectedIdSignal.set(summary.id)
    modeSignal.set("detail")
    commands().secureNoteRead(summary.id)
  }
  const noteClose = () => {
    selectedIdSignal.set("")
    modeSignal.set("list")
  }
  const noteCreateOpen = () => {
    nameSignal.set("")
    noteSignal.set("")
    validationSignal.set(null)
    selectedIdSignal.set("")
    modeSignal.set("create")
  }
  const noteEditOpen = () => {
    const detail = selectedDetail()
    if (detail === null || !canEdit()) return
    nameSignal.set(detail.name)
    noteSignal.set(detail.notes ?? "")
    validationSignal.set(null)
    modeSignal.set("edit")
  }
  const noteDeleteOpen = () => {
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
    const now = new Date().toISOString()
    const existing = selectedDetail()
    const cipher: ExtensionCipher = existing
      ? { ...existing, revisionDate: now, name, notes: noteSignal.get() }
      : {
          object: "cipherDetails",
          id: crypto.randomUUID(),
          type: 2,
          creationDate: now,
          revisionDate: now,
          deletedDate: null,
          organizationId: null,
          folderId: null,
          name,
          notes: noteSignal.get(),
          favorite: false,
          fields: [],
          secureNote: { type: 0 },
        }
    if (modeIs("edit") && existing !== null) {
      commands().secureNoteUpdate(existing.id, cipher)
      noteClose()
      return
    }
    commands().secureNoteCreate(cipher)
    noteClose()
  }
  const noteDeleteConfirm = () => {
    const id = selectedIdSignal.get()
    if (id === "" || !canDelete()) return
    commands().secureNoteDelete(id)
    noteClose()
  }
  const noteCopy = () => {
    const note = selectedDetail()?.notes
    if (note) commands().secureNoteCopy(note)
  }
  const keyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || (!detailsOpen() && !formOpen())) return
    event.preventDefault()
    if (modeIs("edit") || modeIs("delete")) actionCancel()
    else noteClose()
  }
  onMount(() => window.addEventListener("keydown", keyDown))
  onCleanup(() => window.removeEventListener("keydown", keyDown))
  if (selectedIdSignal.get()) commands().secureNoteRead(selectedIdSignal.get())

  return {
    querySignal,
    nameSignal,
    noteSignal,
    validation: validationSignal.get,
    visibleNotes,
    selectedSummary,
    selectedDetail,
    canEdit,
    canDelete,
    detailsOpen,
    formOpen,
    creating: () => modeIs("create"),
    deleting: () => modeIs("delete"),
    loading: () => model().secureNotesLoading,
    detailLoading: () => model().secureNoteDetailLoading,
    busy: () => model().busy,
    errorMessage: () => model().errorMessage,
    noteSelect,
    noteClose,
    noteCreateOpen,
    noteEditOpen,
    noteDeleteOpen,
    actionCancel,
    formSubmit,
    noteDeleteConfirm,
    noteCopy,
    notesEmpty: () => model().secureNotes.length === 0,
  }
}
