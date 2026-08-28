import { expect, test } from "bun:test"
import { fireEvent, render, within } from "@solidjs/testing-library"
import type { ExtensionCreateLoginRequest } from "../../../src/extension/create/extensionCreateLoginRequestSchema.js"
import type { ExtensionFullWindowCommands } from "../../../src/extension/fullwindow/ExtensionFullWindowCommands.js"
import { extensionFullWindowCommandsCreate } from "../../../src/extension/fullwindow/extensionFullWindowCommandsCreate.js"
import { ExtensionFullWindowView } from "../../../src/extension/fullwindow/ExtensionFullWindowView.jsx"
import type { ExtensionFullWindowViewModel } from "../../../src/extension/fullwindow/ExtensionFullWindowViewModel.js"
import { extensionFullWindowViewModelCreate } from "../../../src/extension/fullwindow/extensionFullWindowViewModelCreate.js"

/** happy-dom starts on about:blank, where history.replaceState cannot introduce search params. */
function createPaneUrlSet(): void {
  const happyDom = (window as unknown as { happyDOM?: { setURL: (url: string) => void } }).happyDOM
  if (happyDom === undefined) throw new Error("happy-dom is required to route the create pane by URL")
  happyDom.setURL("http://localhost/?pane=create")
}

function createRender(
  model: Partial<ExtensionFullWindowViewModel> = {},
  commands: Partial<ExtensionFullWindowCommands> = {},
) {
  createPaneUrlSet()
  return render(() => (
    <ExtensionFullWindowView
      model={() => extensionFullWindowViewModelCreate({ status: "ready", ...model })}
      commands={extensionFullWindowCommandsCreate(commands)}
    />
  ))
}

test("extensionFullWindowCreatePane opens from the URL and prefills name and URI from the active site", () => {
  const root = createRender({ hostname: "example.com" })

  expect(root.getByLabelText("Add login")).toBeDefined()
  expect((root.getByLabelText("Name") as HTMLInputElement).value).toBe("example.com")
  expect((root.getByLabelText("Website URI 1") as HTMLInputElement).value).toBe("https://example.com")

  root.unmount()
})

test("extensionFullWindowCreatePane prefers an explicit popup prefill over the active site", () => {
  const root = createRender({
    hostname: "example.com",
    createPrefill: { name: "Example Mail", uri: "https://mail.example.com/login" },
  })

  expect((root.getByLabelText("Name") as HTMLInputElement).value).toBe("Example Mail")
  expect((root.getByLabelText("Website URI 1") as HTMLInputElement).value).toBe("https://mail.example.com/login")

  root.unmount()
})

test("extensionFullWindowCreatePane submits the full domain create request", () => {
  const requests: ExtensionCreateLoginRequest[] = []
  const root = createRender({}, { loginCreate: (request) => requests.push(request) })

  fireEvent.input(root.getByLabelText("Name"), { target: { value: " Example Mail " } })
  fireEvent.input(root.getByLabelText("Website URI 1"), { target: { value: "https://example.com/login" } })
  fireEvent.click(root.getByRole("button", { name: "Add URI" }))
  fireEvent.input(root.getByLabelText("Website URI 2"), { target: { value: "https://example.com/account" } })
  fireEvent.input(root.getByLabelText("Username"), { target: { value: "ada@example.com" } })
  fireEvent.input(root.getByLabelText("Password"), { target: { value: "s3cret" } })
  fireEvent.input(root.getByLabelText("Notes"), { target: { value: "recovery codes in safe" } })
  fireEvent.input(root.getByLabelText("Folder ID"), { target: { value: "folder-id" } })
  fireEvent.click(root.getByRole("button", { name: "Save login" }))

  expect(requests).toHaveLength(1)
  expect(requests[0]).toMatchObject({
    name: "Example Mail",
    uris: ["https://example.com/login", "https://example.com/account"],
    username: "ada@example.com",
    password: "s3cret",
    notes: "recovery codes in safe",
    folderId: "folder-id",
    favorite: false,
    fields: [],
  })

  root.unmount()
})

test("extensionFullWindowCreatePane adds and removes text, hidden and boolean custom fields", () => {
  const requests: ExtensionCreateLoginRequest[] = []
  const root = createRender({}, { loginCreate: (request) => requests.push(request) })

  fireEvent.input(root.getByLabelText("Name"), { target: { value: "Example" } })
  fireEvent.input(root.getByLabelText("Website URI 1"), { target: { value: "https://example.com" } })

  fireEvent.click(root.getByRole("button", { name: "Add text field" }))
  fireEvent.click(root.getByRole("button", { name: "Add hidden field" }))
  fireEvent.click(root.getByRole("button", { name: "Add boolean field" }))
  fireEvent.click(root.getByRole("button", { name: "Add text field" }))
  fireEvent.click(root.getByRole("button", { name: "Remove custom field 4" }))

  fireEvent.input(root.getByLabelText("Custom field 1 name"), { target: { value: "API key" } })
  fireEvent.input(root.getByLabelText("Custom field 1 value"), { target: { value: "abc123" } })
  fireEvent.input(root.getByLabelText("Custom field 2 name"), { target: { value: "Recovery" } })
  fireEvent.input(root.getByLabelText("Custom field 2 value"), { target: { value: "hidden-secret" } })
  fireEvent.input(root.getByLabelText("Custom field 3 name"), { target: { value: "Verified" } })
  const booleanField = root.getByRole("group", { name: "Custom field 3 value" })
  fireEvent.click(within(booleanField).getByRole("radio", { name: "Yes" }))

  fireEvent.click(root.getByRole("button", { name: "Save login" }))

  expect(requests[0]?.fields).toEqual([
    { name: "API key", type: "text", value: "abc123" },
    { name: "Recovery", type: "hidden", value: "hidden-secret" },
    { name: "Verified", type: "boolean", value: true },
  ])

  root.unmount()
})

test("extensionFullWindowCreatePane masks the password until visibility is toggled", () => {
  const root = createRender()

  const password = root.getByLabelText("Password") as HTMLInputElement
  expect(password.type).toBe("password")

  fireEvent.click(root.getByRole("button", { name: "Show password" }))
  expect((root.getByLabelText("Password") as HTMLInputElement).type).toBe("text")

  fireEvent.click(root.getByRole("button", { name: "Hide password" }))
  expect((root.getByLabelText("Password") as HTMLInputElement).type).toBe("password")

  root.unmount()
})

test("extensionFullWindowCreatePane blocks saving without a name or a URI", () => {
  const requests: ExtensionCreateLoginRequest[] = []
  const root = createRender({}, { loginCreate: (request) => requests.push(request) })

  fireEvent.click(root.getByRole("button", { name: "Save login" }))
  expect(root.getByRole("alert").textContent).toContain("Enter a name")

  fireEvent.input(root.getByLabelText("Name"), { target: { value: "Example" } })
  fireEvent.click(root.getByRole("button", { name: "Save login" }))
  expect(root.getByRole("alert").textContent).toContain("at least one website URI")

  expect(requests).toEqual([])

  root.unmount()
})

test("extensionFullWindowCreatePane requires a name for every custom field", () => {
  const requests: ExtensionCreateLoginRequest[] = []
  const root = createRender({}, { loginCreate: (request) => requests.push(request) })

  fireEvent.input(root.getByLabelText("Name"), { target: { value: "Example" } })
  fireEvent.input(root.getByLabelText("Website URI 1"), { target: { value: "https://example.com" } })
  fireEvent.click(root.getByRole("button", { name: "Add text field" }))
  fireEvent.click(root.getByRole("button", { name: "Save login" }))

  expect(root.getByRole("alert").textContent).toContain("custom field a name")
  expect(requests).toEqual([])

  root.unmount()
})

test("extensionFullWindowCreatePane shows loading, error and success feedback from the model", () => {
  const saving = createRender({ createStatus: "saving" })
  expect(saving.getByRole("status", { name: "Saving login" })).toBeDefined()
  expect((saving.getByRole("button", { name: "Save login" }) as HTMLButtonElement).disabled).toBe(true)
  saving.unmount()

  const failed = createRender({ createStatus: "error", errorMessage: "The server is unavailable." })
  expect(failed.getByRole("alert").textContent).toContain("The server is unavailable.")
  failed.unmount()
})

test("extensionFullWindowCreatePane schedules an encrypted draft save without rendering secrets", async () => {
  const drafts: ExtensionCreateLoginRequest[] = []
  const root = createRender({}, { loginDraftSave: (request) => drafts.push(request) })

  fireEvent.input(root.getByLabelText("Name"), { target: { value: "Example" } })
  fireEvent.input(root.getByLabelText("Password"), { target: { value: "s3cret" } })
  await new Promise((resolve) => setTimeout(resolve, 700))

  expect(drafts.length).toBeGreaterThan(0)
  expect(drafts.at(-1)?.password).toBe("s3cret")
  expect(root.container.textContent).not.toContain("s3cret")

  root.unmount()
})

test("extensionFullWindowCreatePane confirms discarding a dirty form and drops its draft", () => {
  const discarded: string[] = []
  const root = createRender({}, { loginDraftDiscard: (draftId) => discarded.push(draftId) })

  fireEvent.input(root.getByLabelText("Name"), { target: { value: "Example" } })
  fireEvent.click(root.getByRole("button", { name: "Cancel" }))

  expect(root.getByRole("alertdialog", { name: "Discard this login" })).toBeDefined()
  expect(discarded).toEqual([])
  expect(root.getByLabelText("Add login")).toBeDefined()

  fireEvent.click(root.getByRole("button", { name: "Keep editing" }))
  expect(root.queryByRole("alertdialog", { name: "Discard this login" })).toBeNull()

  fireEvent.click(root.getByRole("button", { name: "Cancel" }))
  fireEvent.click(root.getByRole("button", { name: "Discard" }))

  expect(discarded).toHaveLength(1)
  expect(root.queryByLabelText("Add login")).toBeNull()

  root.unmount()
})

test("extensionFullWindowCreatePane cancels a pristine form without confirmation", () => {
  const root = createRender()

  fireEvent.click(root.getByRole("button", { name: "Cancel" }))

  expect(root.queryByLabelText("Add login")).toBeNull()
  expect(root.getByLabelText("Search logins")).toBeDefined()

  root.unmount()
})

test("extensionFullWindowCreatePane returns to the vault and selects the newly created login", () => {
  const root = createRender({
    createStatus: "saved",
    createdLoginId: "login-1",
    logins: [
      {
        id: "login-1",
        name: "Example Mail",
        username: "ada@example.com",
        uri: "https://example.com/login",
        copyableFields: [],
      },
    ],
  })

  expect(root.queryByLabelText("Add login")).toBeNull()
  expect(root.getByLabelText("Details of Example Mail")).toBeDefined()

  root.unmount()
})
