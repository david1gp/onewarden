import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import type { ExtensionCipher } from "../../../src/extension/crypto/extensionCipherSchema.js"
import { ExtensionFullWindowView } from "../../../src/extension/fullwindow/ExtensionFullWindowView.jsx"
import { extensionFullWindowCommandsCreate } from "../../../src/extension/fullwindow/extensionFullWindowCommandsCreate.js"
import { extensionFullWindowViewModelCreate } from "../../../src/extension/fullwindow/extensionFullWindowViewModelCreate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { createSignalObject } from "../../../ui/utils/createSignalObject.js"

const note: ExtensionCipher = {
  object: "cipherDetails",
  id: "note-1",
  type: 2,
  creationDate: "2026-09-01T00:00:00.000Z",
  revisionDate: "2026-09-01T00:00:00.000Z",
  deletedDate: null,
  organizationId: null,
  folderId: null,
  name: "Recovery plan",
  notes: "Keep this private",
  favorite: false,
  fields: [],
  secureNote: { type: 0 },
}

test("full-window secure notes provide searchable list, detail, keyboard close and permission states", () => {
  window.history.replaceState(null, "", "/?category=notes")
  const model = extensionFullWindowViewModelCreate({
    status: "ready",
    secureNotes: [
      {
        object: "cipherMini",
        id: "note-1",
        type: 2,
        revisionDate: note.revisionDate,
        deletedDate: null,
        name: note.name,
        edit: false,
        permissions: { delete: false },
      },
    ],
    selectedSecureNote: note,
  })
  const read: string[] = []
  const root = render(() => (
    <ExtensionFullWindowView
      model={() => model}
      commands={extensionFullWindowCommandsCreate({ secureNoteRead: (id) => read.push(id) })}
    />
  ))

  fireEvent.click(root.getByRole("button", { name: "Secure notes" }))
  fireEvent.click(root.getByRole("button", { name: "Recovery plan" }))
  expect(read).toEqual(["note-1"])
  expect(root.getByLabelText("Details of Recovery plan").textContent).toContain("Keep this private")
  expect(root.getByText("You have view-only access to this item.")).toBeDefined()
  expect((root.getByRole("button", { name: "Edit" }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.keyDown(window, { key: "Escape" })
  expect(root.getByText("Select a secure note to see its details.")).toBeDefined()
  root.unmount()
})

test("full-window secure-note create validates and dispatches a type-specific cipher", () => {
  window.history.replaceState(null, "", "/?category=notes")
  const created: ExtensionCipher[] = []
  const root = render(() => (
    <ExtensionFullWindowView
      model={() => extensionFullWindowViewModelCreate({ status: "ready" })}
      commands={extensionFullWindowCommandsCreate({ secureNoteCreate: (cipher) => created.push(cipher) })}
    />
  ))

  fireEvent.click(root.getByRole("button", { name: "Secure notes" }))
  fireEvent.click(root.getByRole("button", { name: "New note" }))
  fireEvent.click(root.getByRole("button", { name: "Save note" }))
  expect(root.getByRole("alert").textContent).toContain("Name is required")
  fireEvent.input(root.getByLabelText("Name"), { target: { value: "Travel codes" } })
  fireEvent.input(root.getByLabelText("Note"), { target: { value: "codes" } })
  fireEvent.click(root.getByRole("button", { name: "Save note" }))
  expect(created[0]).toMatchObject({ type: 2, name: "Travel codes", notes: "codes", secureNote: { type: 0 } })
  root.unmount()
})

test("full-window secure-note commands consume task-3 search, detail and delete messages", async () => {
  const sent: unknown[] = []
  const model = createSignalObject(extensionFullWindowViewModelCreate({ status: "ready" }))
  const commands = extensionFullWindowCommandsCreate(
    {},
    {
      messageSend: async (message) => {
        sent.push(message)
        if (message.type === "vaultSearch") return resultCreate({ ciphers: [], folders: [], collections: [] })
        if (message.type === "cipherDetailRead") return resultCreate(note)
        return resultCreate(undefined)
      },
      onModelUpdate: (update) => model.set(update(model.get())),
    },
  )
  commands.secureNotesLoad()
  commands.secureNoteRead("note-1")
  commands.secureNoteDelete("note-1")
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(sent).toContainEqual({ type: "cipherDetailRead", request: { cipherId: "note-1" } })
  expect(sent).toContainEqual({ type: "cipherDelete", request: { cipherId: "note-1", hard: false } })
  expect(sent).toContainEqual({
    type: "vaultSearch",
    request: { query: "", type: 2, includeDeleted: false, includeArchived: false },
  })
})
