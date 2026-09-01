import { createMemo, onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { ExtensionBackgroundCipherSummary } from "../background/extensionBackgroundCipherSummarySchema.js"
import type { ExtensionCipherIdentity } from "../crypto/extensionCipherIdentitySchema.js"
import type { ExtensionCipher } from "../crypto/extensionCipherSchema.js"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionFullWindowUrlSignalCreate } from "./extensionFullWindowUrlSignalCreate.js"

type IdentityMode = "list" | "create" | "detail" | "edit" | "delete"
type IdentityField =
  | "title"
  | "firstName"
  | "middleName"
  | "lastName"
  | "address1"
  | "address2"
  | "address3"
  | "city"
  | "state"
  | "postalCode"
  | "country"
  | "company"
  | "email"
  | "phone"
  | "ssn"
  | "username"
  | "passportNumber"
  | "licenseNumber"

const identityFieldNames: IdentityField[] = [
  "title",
  "firstName",
  "middleName",
  "lastName",
  "company",
  "username",
  "email",
  "phone",
  "address1",
  "address2",
  "address3",
  "city",
  "state",
  "postalCode",
  "country",
  "ssn",
  "passportNumber",
  "licenseNumber",
]

export function extensionFullWindowIdentityStateCreate(
  model: () => ExtensionFullWindowViewModel,
  commands: () => ExtensionFullWindowCommands,
) {
  const querySignal = extensionFullWindowUrlSignalCreate("q")
  const selectedIdSignal = extensionFullWindowUrlSignalCreate("identity")
  const modeSignal = createSignalObject<IdentityMode>(selectedIdSignal.get() ? "detail" : "list")
  const nameSignal = createSignalObject("")
  const notesSignal = createSignalObject("")
  const validationSignal = createSignalObject<string | null>(null)
  const revealedSignal = createSignalObject<Record<string, boolean>>({})
  const fieldSignals = Object.fromEntries(identityFieldNames.map((field) => [field, createSignalObject("")])) as Record<
    IdentityField,
    ReturnType<typeof createSignalObject<string>>
  >
  const selectedSummary = createMemo(
    () => model().identities.find((item) => item.id === selectedIdSignal.get()) ?? null,
  )
  const selectedDetail = createMemo(() => {
    const detail = model().selectedIdentity
    return detail?.type === 4 && detail.id === selectedIdSignal.get() ? detail : null
  })
  const visibleIdentities = createMemo(() => {
    const query = querySignal.get().trim().toLocaleLowerCase()
    if (query === "") return model().identities
    return model().identities.filter((item) => item.name.toLocaleLowerCase().includes(query))
  })
  const canViewSensitive = createMemo(() => selectedSummary()?.viewPassword !== false)
  const canEdit = createMemo(() => selectedSummary()?.edit !== false && canViewSensitive())
  const canDelete = createMemo(() => canEdit() && selectedSummary()?.permissions?.delete !== false)
  const modeIs = (mode: IdentityMode) => modeSignal.get() === mode
  const detailsOpen = createMemo(() => modeIs("detail") || modeIs("edit") || modeIs("delete"))
  const formOpen = createMemo(() => modeIs("create") || modeIs("edit"))
  const detailSections = createMemo(() => {
    const identity = selectedDetail()?.identity
    if (!identity) return []
    const locality = [identity.city, identity.state, identity.postalCode].filter(Boolean).join(" ")
    const fullAddress = [identity.address1, identity.address2, identity.address3, locality, identity.country]
      .filter(Boolean)
      .join("\n")
    return [
      {
        title: "Personal information",
        fields: [
          [
            "fullName",
            "Full name",
            [identity.title, identity.firstName, identity.middleName, identity.lastName].filter(Boolean).join(" "),
          ],
          ["company", "Company", identity.company],
          ["username", "Username", identity.username],
        ],
      },
      {
        title: "Contact information",
        fields: [
          ["email", "Email", identity.email],
          ["phone", "Phone", identity.phone],
        ],
      },
      {
        title: "Address",
        fields: [
          ["fullAddress", "Full address", fullAddress],
          ["address1", "Address line 1", identity.address1],
          ["address2", "Address line 2", identity.address2],
          ["address3", "Address line 3", identity.address3],
          ["city", "City", identity.city],
          ["state", "State / Province", identity.state],
          ["postalCode", "Postal code", identity.postalCode],
          ["country", "Country", identity.country],
        ],
      },
      {
        title: "Identification",
        fields: [
          ["ssn", "Social security number", identity.ssn, true],
          ["passportNumber", "Passport number", identity.passportNumber, true],
          ["licenseNumber", "License number", identity.licenseNumber, true],
        ],
      },
    ]
      .map((section) => ({
        ...section,
        fields: section.fields
          .filter((field) => Boolean(field[2]))
          .map(([key, label, value, sensitive]) => ({
            key: String(key),
            label: String(label),
            value: String(value),
            sensitive: Boolean(sensitive),
          })),
      }))
      .filter((section) => section.fields.length > 0)
  })

  const formReset = () => {
    nameSignal.set("")
    notesSignal.set("")
    for (const signal of Object.values(fieldSignals)) signal.set("")
    validationSignal.set(null)
  }
  const identitySelect = (summary: ExtensionBackgroundCipherSummary) => {
    selectedIdSignal.set(summary.id)
    revealedSignal.set({})
    modeSignal.set("detail")
    commands().identityRead(summary.id)
  }
  const identityClose = () => {
    selectedIdSignal.set("")
    revealedSignal.set({})
    modeSignal.set("list")
  }
  const identityCreateOpen = () => {
    formReset()
    selectedIdSignal.set("")
    modeSignal.set("create")
  }
  const identityEditOpen = () => {
    const detail = selectedDetail()
    if (detail === null || !canEdit()) return
    nameSignal.set(detail.name)
    notesSignal.set(detail.notes ?? "")
    for (const field of identityFieldNames) fieldSignals[field].set(detail.identity[field] ?? "")
    validationSignal.set(null)
    modeSignal.set("edit")
  }
  const identityDeleteOpen = () => {
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
    const email = fieldSignals.email.get().trim()
    if (email !== "" && !email.includes("@")) {
      validationSignal.set("Enter a valid email address.")
      return
    }
    const identity = Object.fromEntries(
      identityFieldNames.map((field) => [field, fieldSignals[field].get().trim() || null]),
    ) as ExtensionCipherIdentity
    const now = new Date().toISOString()
    const existing = selectedDetail()
    const cipher: ExtensionCipher = existing
      ? { ...existing, name, notes: notesSignal.get(), revisionDate: now, identity }
      : {
          object: "cipherDetails",
          id: crypto.randomUUID(),
          type: 4,
          creationDate: now,
          revisionDate: now,
          deletedDate: null,
          organizationId: null,
          folderId: null,
          name,
          notes: notesSignal.get(),
          favorite: false,
          fields: [],
          identity,
        }
    if (modeIs("edit") && existing !== null) {
      commands().identityUpdate(existing.id, cipher)
      identityClose()
      return
    }
    commands().identityCreate(cipher)
    identityClose()
  }
  const identityDeleteConfirm = () => {
    const id = selectedIdSignal.get()
    if (id === "" || !canDelete()) return
    commands().identityDelete(id)
    identityClose()
  }
  const fieldRevealToggle = (field: string) => {
    if (!canViewSensitive()) return
    revealedSignal.set({ ...revealedSignal.get(), [field]: !revealedSignal.get()[field] })
  }
  const fieldIsRevealed = (field: string) => Boolean(revealedSignal.get()[field])
  const fieldValue = (field: { key: string; value: string; sensitive: boolean }) => {
    if (field.sensitive && !canViewSensitive()) return "Hidden by organization policy"
    if (!field.sensitive || fieldIsRevealed(field.key)) return field.value
    return "•".repeat(field.value.length)
  }
  const fieldCopy = (field: string, value: string) => {
    const sensitive = detailSections()
      .flatMap((section) => section.fields)
      .some((entry) => entry.key === field && entry.sensitive)
    if (sensitive && !canViewSensitive()) return
    commands().cipherFieldCopy(`identity:${selectedIdSignal.get()}:${field}`, value)
  }
  const fieldIsCopied = (field: string) => model().copiedFieldKey === `identity:${selectedIdSignal.get()}:${field}`
  const keyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || (!detailsOpen() && !formOpen())) return
    event.preventDefault()
    if (modeIs("edit") || modeIs("delete")) actionCancel()
    else identityClose()
  }
  onMount(() => window.addEventListener("keydown", keyDown))
  onCleanup(() => window.removeEventListener("keydown", keyDown))
  if (selectedIdSignal.get()) commands().identityRead(selectedIdSignal.get())

  return {
    querySignal,
    nameSignal,
    notesSignal,
    fieldSignal: (field: IdentityField) => fieldSignals[field],
    validation: validationSignal.get,
    visibleIdentities,
    selectedSummary,
    selectedDetail,
    detailSections,
    canEdit,
    canViewSensitive,
    canDelete,
    formOpen,
    creating: () => modeIs("create"),
    deleting: () => modeIs("delete"),
    loading: () => model().identitiesLoading,
    detailLoading: () => model().identityDetailLoading,
    busy: () => model().busy,
    errorMessage: () => model().errorMessage,
    identitiesEmpty: () => model().identities.length === 0,
    fieldValue,
    fieldIsRevealed,
    fieldRevealToggle,
    fieldCopy,
    fieldIsCopied,
    identitySelect,
    identityClose,
    identityCreateOpen,
    identityEditOpen,
    identityDeleteOpen,
    identityDeleteConfirm,
    actionCancel,
    formSubmit,
  }
}
