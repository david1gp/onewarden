import { createMemo, onCleanup } from "solid-js"
import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.js"
import type { ExtensionCreateLoginRequest } from "../create/extensionCreateLoginRequestSchema.js"
import type { ExtensionFullWindowCreateField } from "./ExtensionFullWindowCreateField.js"
import type { ExtensionFullWindowCreatePrefill } from "./ExtensionFullWindowCreatePrefill.js"
import { extensionFullWindowCreateRequestCreate } from "./extensionFullWindowCreateRequestCreate.js"
import { extensionFullWindowCreateRequestValidate } from "./extensionFullWindowCreateRequestValidate.js"
import { extensionFullWindowCreateStatus } from "./ExtensionFullWindowCreateStatus.js"
import { extensionFullWindowDraftScheduleCreate } from "./extensionFullWindowDraftScheduleCreate.js"
import { extensionFullWindowDraftIdCreate } from "./extensionFullWindowDraftIdCreate.js"

export interface ExtensionFullWindowCreatePaneStateOptions {
  prefill: () => ExtensionFullWindowCreatePrefill
  status: () => string
  serverErrorMessage: () => string | null
  loginCreate: (request: ExtensionCreateLoginRequest) => void
  draftSave: (request: ExtensionCreateLoginRequest) => void
  draftDiscard: (draftId: string) => void
  cancel: () => void
}

/** Component-local form state, validation, draft scheduling, and command glue for the create-login pane. */
export function extensionFullWindowCreatePaneStateCreate(options: ExtensionFullWindowCreatePaneStateOptions) {
  const draftId = extensionFullWindowDraftIdCreate()

  const nameSignal = createSignalObject(options.prefill().name)
  const usernameSignal = createSignalObject("")
  const passwordSignal = createSignalObject("")
  const notesSignal = createSignalObject("")
  const folderIdSignal = createSignalObject("")
  const favoriteSignal = createSignalObject("false")
  const passwordVisibleSignal = createSignalObject(false)
  const uriListSignal = createSignalObject<string[]>([options.prefill().uri])
  const fieldListSignal = createSignalObject<ExtensionFullWindowCreateField[]>([])
  const localErrorSignal = createSignalObject<string | null>(null)
  const discardPendingSignal = createSignalObject(false)

  const draftSchedule = extensionFullWindowDraftScheduleCreate((request) => options.draftSave(request))
  onCleanup(draftSchedule.cancel)

  const isSaving = createMemo(() => options.status() === extensionFullWindowCreateStatus.saving)
  const isSaved = createMemo(() => options.status() === extensionFullWindowCreateStatus.saved)
  const errorMessage = createMemo(() => localErrorSignal.get() ?? options.serverErrorMessage())
  const passwordType = createMemo(() => (passwordVisibleSignal.get() ? "text" : "password"))
  const passwordToggleLabel = createMemo(() => (passwordVisibleSignal.get() ? "Hide password" : "Show password"))
  const discardPending = createMemo(() => discardPendingSignal.get())

  const requestCreate = (): ExtensionCreateLoginRequest =>
    extensionFullWindowCreateRequestCreate({
      draftId,
      name: nameSignal.get(),
      uris: uriListSignal.get(),
      username: usernameSignal.get(),
      password: passwordSignal.get(),
      notes: notesSignal.get(),
      favorite: favoriteSignal.get() === "true",
      folderId: folderIdSignal.get(),
      fields: fieldListSignal.get(),
    })

  const isDirty = () => {
    const request = requestCreate()
    if (request.name !== options.prefill().name.trim()) return true
    if (request.uris.join("\n") !== options.prefill().uri.trim()) return true
    return (
      request.username !== null ||
      request.password !== null ||
      request.notes !== null ||
      request.favorite ||
      request.folderId !== null ||
      request.fields.length > 0
    )
  }

  const changed = (): void => {
    localErrorSignal.set(null)
    draftSchedule.schedule(requestCreate())
  }

  const trackedSignal = <T>(signal: SignalObject<T>): SignalObject<T> => ({
    get: signal.get,
    set: (value: T) => {
      signal.set(value)
      changed()
    },
  })

  const uriSignal = (index: number): SignalObject<string> => ({
    get: () => uriListSignal.get()[index] ?? "",
    set: (value: string) => {
      uriListSignal.set(uriListSignal.get().map((uri, position) => (position === index ? value : uri)))
      changed()
    },
  })

  const uriAdd = (): void => {
    uriListSignal.set([...uriListSignal.get(), ""])
    changed()
  }

  const uriRemove = (index: number): void => {
    uriListSignal.set(uriListSignal.get().filter((_uri, position) => position !== index))
    changed()
  }

  const fieldPatch = (id: string, patch: Partial<ExtensionFullWindowCreateField>): void => {
    fieldListSignal.set(fieldListSignal.get().map((field) => (field.id === id ? { ...field, ...patch } : field)))
    changed()
  }

  const fieldNameSignal = (field: ExtensionFullWindowCreateField): SignalObject<string> => ({
    get: () => fieldListSignal.get().find((entry) => entry.id === field.id)?.name ?? "",
    set: (value: string) => fieldPatch(field.id, { name: value }),
  })

  const fieldValueSignal = (field: ExtensionFullWindowCreateField): SignalObject<string> => ({
    get: () => fieldListSignal.get().find((entry) => entry.id === field.id)?.value ?? "",
    set: (value: string) => fieldPatch(field.id, { value }),
  })

  const fieldBooleanSignal = (field: ExtensionFullWindowCreateField): SignalObject<string> => ({
    get: () => fieldListSignal.get().find((entry) => entry.id === field.id)?.value ?? "false",
    set: (value: string) => fieldPatch(field.id, { value: value === "true" ? "true" : "false" }),
  })

  const fieldTypeSignal = (field: ExtensionFullWindowCreateField): SignalObject<string> => ({
    get: () => fieldListSignal.get().find((entry) => entry.id === field.id)?.type ?? "text",
    set: (value: string) => {
      const type = value === "hidden" || value === "boolean" ? value : "text"
      fieldPatch(field.id, { type, value: type === "boolean" ? "false" : "" })
    },
  })

  const fieldAdd = (type: ExtensionFullWindowCreateField["type"]): void => {
    fieldListSignal.set([
      ...fieldListSignal.get(),
      { id: extensionFullWindowDraftIdCreate(), name: "", type, value: type === "boolean" ? "false" : "" },
    ])
    changed()
  }

  const fieldRemove = (field: ExtensionFullWindowCreateField): void => {
    fieldListSignal.set(fieldListSignal.get().filter((entry) => entry.id !== field.id))
    changed()
  }

  const save = (): void => {
    const validated = extensionFullWindowCreateRequestValidate(requestCreate())
    if (!validated.success) {
      localErrorSignal.set(validated.errorMessage)
      return
    }
    localErrorSignal.set(null)
    draftSchedule.cancel()
    options.loginCreate(validated.data)
  }

  const cancel = (): void => {
    if (isDirty() && !discardPendingSignal.get()) {
      discardPendingSignal.set(true)
      return
    }
    discardPendingSignal.set(false)
    draftSchedule.cancel()
    options.draftDiscard(draftId)
    options.cancel()
  }

  const discardKeep = (): void => discardPendingSignal.set(false)

  return {
    nameSignal: trackedSignal(nameSignal),
    usernameSignal: trackedSignal(usernameSignal),
    passwordSignal: trackedSignal(passwordSignal),
    notesSignal: trackedSignal(notesSignal),
    folderIdSignal: trackedSignal(folderIdSignal),
    favoriteSignal: trackedSignal(favoriteSignal),
    passwordVisibleSignal,
    passwordType,
    passwordToggleLabel,
    uris: () => uriListSignal.get(),
    uriSignal,
    uriAdd,
    uriRemove,
    fields: () => fieldListSignal.get(),
    fieldNameSignal,
    fieldValueSignal,
    fieldBooleanSignal,
    fieldTypeSignal,
    fieldAdd,
    fieldRemove,
    errorMessage,
    isSaving,
    isSaved,
    discardPending,
    discardKeep,
    save,
    cancel,
  }
}
