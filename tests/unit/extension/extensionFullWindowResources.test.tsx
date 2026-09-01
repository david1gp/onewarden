import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import type { ExtensionLogin } from "../../../src/extension/ExtensionLogin.js"
import type { ExtensionFullWindowCommands } from "../../../src/extension/fullwindow/ExtensionFullWindowCommands.js"
import { ExtensionFullWindowView } from "../../../src/extension/fullwindow/ExtensionFullWindowView.jsx"
import type { ExtensionFullWindowViewModel } from "../../../src/extension/fullwindow/ExtensionFullWindowViewModel.js"
import { extensionFullWindowCommandsCreate } from "../../../src/extension/fullwindow/extensionFullWindowCommandsCreate.js"
import { extensionFullWindowViewModelCreate } from "../../../src/extension/fullwindow/extensionFullWindowViewModelCreate.js"
import type { ExtensionRuntimeMessage } from "../../../src/extension/messaging/extensionRuntimeMessageSchema.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"

const personalLogin: ExtensionLogin = {
  id: "personal-login",
  name: "Personal login",
  username: "personal@example.test",
  uri: null,
  organizationId: null,
  folderId: "folder-work",
  collectionIds: [],
  copyableFields: [],
}
const organizationLogin: ExtensionLogin = {
  id: "organization-login",
  name: "Organization login",
  username: "org@example.test",
  uri: null,
  organizationId: "org-1",
  folderId: null,
  collectionIds: ["collection-shared"],
  viewPassword: false,
  copyableFields: [],
}

function resourceModelCreate(overrides: Partial<ExtensionFullWindowViewModel> = {}) {
  return extensionFullWindowViewModelCreate({
    status: "ready",
    logins: [personalLogin, organizationLogin],
    folders: [{ id: "folder-work", name: "Work", object: "folder" }],
    collections: [
      {
        id: "collection-shared",
        organizationId: "org-1",
        name: "Shared",
        assigned: true,
        hidePasswords: true,
        manage: true,
      },
      {
        id: "collection-read-only",
        organizationId: "org-1",
        name: "Audited",
        assigned: true,
        readOnly: true,
        unmanaged: true,
      },
    ],
    profile: {
      organizations: [
        {
          id: "org-1",
          name: "Acme",
          status: 2,
          permissions: { createNewCollections: true },
        },
      ],
    },
    ...overrides,
  })
}

test("full-window resource navigation filters by folders, organizations, and collections with counts", () => {
  window.history.replaceState(null, "", "/")
  const model = resourceModelCreate()
  const root = render(() => (
    <ExtensionFullWindowView model={() => model} commands={extensionFullWindowCommandsCreate()} />
  ))

  expect(root.getByRole("navigation", { name: "Organizations" })).toBeDefined()
  expect(root.getByRole("button", { name: "All (2)" })).toBeDefined()
  fireEvent.click(root.getByRole("button", { name: "Work (1)" }))
  expect(root.getByRole("button", { name: "Personal login" })).toBeDefined()
  expect(root.queryByRole("button", { name: "Organization login" })).toBeNull()

  fireEvent.click(root.getByRole("button", { name: "Acme (1)" }))
  expect(root.queryByRole("button", { name: "Personal login" })).toBeNull()
  expect(root.getByRole("button", { name: "Organization login" })).toBeDefined()

  fireEvent.click(root.getByRole("button", { name: "Shared (1)" }))
  expect(root.getByRole("list", { name: "Permissions for Shared" }).textContent).toContain("Manage")
  expect(root.getByRole("list", { name: "Permissions for Shared" }).textContent).toContain("Passwords hidden")
  expect(root.getByRole("button", { name: "Organization login" })).toBeDefined()
  root.unmount()
})

test("full-window collection management reflects read-only and unmanaged permissions", () => {
  window.history.replaceState(null, "", "/")
  const model = resourceModelCreate()
  const root = render(() => (
    <ExtensionFullWindowView model={() => model} commands={extensionFullWindowCommandsCreate()} />
  ))

  fireEvent.click(root.getByRole("button", { name: "Audited (0)" }))
  expect(root.getByRole("list", { name: "Permissions for Audited" }).textContent).toContain("Read only")
  expect(root.getByRole("list", { name: "Permissions for Audited" }).textContent).toContain("Unmanaged")
  expect((root.getByRole("button", { name: "Edit collection" }) as HTMLButtonElement).disabled).toBe(true)
  expect((root.getByRole("button", { name: "Delete collection" }) as HTMLButtonElement).disabled).toBe(true)
  root.unmount()
})

test("full-window resource management creates, edits, and deletes through commands", () => {
  window.history.replaceState(null, "", "/")
  const calls: string[] = []
  const model = resourceModelCreate()
  const commands: Partial<ExtensionFullWindowCommands> = {
    folderCreate: (folder) => calls.push(`folder-create:${folder.name}`),
    folderUpdate: (folder) => calls.push(`folder-update:${folder.name}`),
    folderDelete: (id) => calls.push(`folder-delete:${id}`),
    collectionCreate: (collection) => calls.push(`collection-create:${collection.organizationId}:${collection.name}`),
    collectionUpdate: (collection) => calls.push(`collection-update:${collection.name}`),
    collectionDelete: (collection) => calls.push(`collection-delete:${collection.id}`),
  }
  const root = render(() => (
    <ExtensionFullWindowView model={() => model} commands={extensionFullWindowCommandsCreate(commands)} />
  ))

  fireEvent.click(root.getAllByRole("button", { name: "New" })[0] as HTMLButtonElement)
  fireEvent.input(root.getByLabelText("Name"), { target: { value: "Personal" } })
  fireEvent.submit(root.getByRole("form", { name: "Manage folder" }))

  fireEvent.click(root.getByRole("button", { name: "Work (1)" }))
  fireEvent.click(root.getByRole("button", { name: "Edit folder" }))
  fireEvent.input(root.getByLabelText("Name"), { target: { value: "Work renamed" } })
  fireEvent.submit(root.getByRole("form", { name: "Manage folder" }))
  fireEvent.click(root.getByRole("button", { name: "Delete folder" }))
  fireEvent.click(root.getByRole("button", { name: "Delete" }))

  fireEvent.click(root.getByRole("button", { name: "Acme (1)" }))
  fireEvent.click(root.getAllByRole("button", { name: "New" })[1] as HTMLButtonElement)
  fireEvent.input(root.getByLabelText("Name"), { target: { value: "Engineering" } })
  fireEvent.submit(root.getByRole("form", { name: "Manage collection" }))
  fireEvent.click(root.getByRole("button", { name: "Shared (1)" }))
  fireEvent.click(root.getByRole("button", { name: "Edit collection" }))
  fireEvent.input(root.getByLabelText("Name"), { target: { value: "Shared renamed" } })
  fireEvent.submit(root.getByRole("form", { name: "Manage collection" }))
  fireEvent.click(root.getByRole("button", { name: "Delete collection" }))
  fireEvent.click(root.getByRole("button", { name: "Delete" }))

  expect(calls).toEqual([
    "folder-create:Personal",
    "folder-update:Work renamed",
    "folder-delete:folder-work",
    "collection-create:org-1:Engineering",
    "collection-update:Shared renamed",
    "collection-delete:collection-shared",
  ])
  root.unmount()
})

test("full-window assignment controls move personal ciphers and identify hidden organization passwords", () => {
  window.history.replaceState(null, "", "/")
  const moves: { cipherId: string; folderId: string | null }[] = []
  const model = resourceModelCreate()
  const commands: Partial<ExtensionFullWindowCommands> = {
    cipherMove: (cipherId, folderId) => moves.push({ cipherId, folderId }),
  }
  const root = render(() => (
    <ExtensionFullWindowView model={() => model} commands={extensionFullWindowCommandsCreate(commands)} />
  ))

  fireEvent.click(root.getByRole("button", { name: "Personal login" }))
  fireEvent.change(root.getByLabelText("Folder"), { target: { value: "" } })
  fireEvent.click(root.getByRole("button", { name: "Save assignment" }))
  expect(moves).toEqual([{ cipherId: "personal-login", folderId: null }])

  fireEvent.click(root.getByRole("button", { name: "Organization login" }))
  expect(root.getByLabelText("Vault assignment").textContent).toContain("Acme")
  expect(root.getByLabelText("Vault assignment").textContent).toContain("Passwords hidden")
  root.unmount()
})

test("full-window resource commands use task-3 runtime messages", async () => {
  const messages: ExtensionRuntimeMessage[] = []
  let model = resourceModelCreate()
  const commands = extensionFullWindowCommandsCreate(
    {},
    {
      messageSend: async (message) => {
        messages.push(message)
        return resultCreate([])
      },
      onModelUpdate: (updater) => {
        model = updater(model)
      },
    },
  )

  commands.resourcesLoad()
  commands.cipherMove("personal-login", "folder-work")
  commands.cipherCollectionsUpdate("organization-login", ["collection-shared"])
  await new Promise((resolve) => setTimeout(resolve, 10))

  expect(messages).toContainEqual({ type: "folderList", request: {} })
  expect(messages).toContainEqual({ type: "collectionList", request: { organizationId: "org-1" } })
  expect(messages).toContainEqual({ type: "cipherMove", request: { ids: ["personal-login"], folderId: "folder-work" } })
  expect(messages).toContainEqual({
    type: "cipherCollectionsUpdate",
    request: { cipherId: "organization-login", collectionIds: ["collection-shared"] },
  })
})
