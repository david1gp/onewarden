import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import type { ExtensionPopupCommands } from "../../../src/extension/popup/ExtensionPopupCommands.js"
import type { ExtensionPopupLogin } from "../../../src/extension/popup/ExtensionPopupLogin.js"
import { ExtensionPopupView } from "../../../src/extension/popup/ExtensionPopupView.jsx"
import type { ExtensionPopupViewModel } from "../../../src/extension/popup/ExtensionPopupViewModel.js"
import { extensionPopupCommandsCreate } from "../../../src/extension/popup/extensionPopupCommandsCreate.js"
import { extensionPopupViewModelCreate } from "../../../src/extension/popup/extensionPopupViewModelCreate.js"

const exampleLogin: ExtensionPopupLogin = {
  id: "login-1",
  name: "Example Mail",
  username: "ada@example.com",
  uri: "https://example.com/login",
  totpAvailable: true,
  copyableFields: [
    { key: "username", label: "Username", value: "ada@example.com" },
    { key: "password", label: "Password", value: "s3cret", sensitive: true },
    { key: "uri", label: "URI", value: "https://example.com/login" },
    { key: "notes", label: "Notes", value: "recovery codes in safe" },
    { key: "custom:API key", label: "API key", value: "abc123" },
  ],
}

const otherLogin: ExtensionPopupLogin = {
  id: "login-2",
  name: "Example Admin",
  username: "root@example.com",
  uri: "https://example.com/admin",
  copyableFields: [{ key: "username", label: "Username", value: "root@example.com" }],
}

function popupRender(model: Partial<ExtensionPopupViewModel>, commands: Partial<ExtensionPopupCommands> = {}) {
  return render(() => (
    <ExtensionPopupView
      model={extensionPopupViewModelCreate(model)}
      commands={extensionPopupCommandsCreate(commands)}
    />
  ))
}

test("extensionPopupView shows a loading indicator while the vault state is unknown", () => {
  const root = popupRender({ status: "loading" })

  expect(root.getByRole("status", { name: "Loading vault" })).toBeDefined()
  expect(root.queryByLabelText("Search logins")).toBeNull()

  root.unmount()
})

test("extensionPopupView offers login when logged out and hides lock control", () => {
  let loginCalls = 0
  const root = popupRender({ status: "loggedOut" }, { accountLogin: () => (loginCalls += 1) })

  fireEvent.click(root.getByRole("button", { name: "Log in" }))

  expect(loginCalls).toBe(1)
  expect(root.queryByRole("button", { name: "Lock" })).toBeNull()
  expect(root.queryByRole("button", { name: "Log out" })).toBeNull()

  root.unmount()
})

test("extensionPopupView unlocks with the typed master password and clears the field", () => {
  const passwords: string[] = []
  const root = popupRender({ status: "locked" }, { vaultUnlock: (value) => passwords.push(value) })

  const input = root.getByLabelText("Master password") as HTMLInputElement
  fireEvent.input(input, { target: { value: "correct horse" } })
  fireEvent.click(root.getByRole("button", { name: "Unlock" }))

  expect(passwords).toEqual(["correct horse"])
  expect(input.value).toBe("")

  root.unmount()
})

test("extensionPopupView ignores an unlock attempt without a master password", () => {
  const passwords: string[] = []
  const root = popupRender({ status: "locked" }, { vaultUnlock: (value) => passwords.push(value) })

  fireEvent.click(root.getByRole("button", { name: "Unlock" }))

  expect(passwords).toEqual([])

  root.unmount()
})

test("extensionPopupView renders the error state with a retry that syncs", () => {
  let syncCalls = 0
  const root = popupRender(
    { status: "error", errorMessage: "Server unreachable" },
    { vaultSync: () => (syncCalls += 1) },
  )

  expect(root.getByRole("alert").textContent).toContain("Server unreachable")
  fireEvent.click(root.getByRole("button", { name: "Retry" }))

  expect(syncCalls).toBe(1)

  root.unmount()
})

test("extensionPopupView shows the active hostname and matched logins", () => {
  const root = popupRender({
    status: "ready",
    hostname: "example.com",
    logins: [exampleLogin, otherLogin],
    fillAvailable: true,
  })

  expect(root.getByLabelText("Active site").textContent).toBe("example.com")
  expect(root.getByLabelText("Example Mail")).toBeDefined()
  expect(root.getByLabelText("Example Admin")).toBeDefined()

  root.unmount()
})

test("extensionPopupView filters logins by the search query", () => {
  const root = popupRender({
    status: "ready",
    hostname: "example.com",
    logins: [exampleLogin, otherLogin],
  })

  fireEvent.input(root.getByLabelText("Search logins"), { target: { value: "admin" } })

  expect(root.queryByLabelText("Example Mail")).toBeNull()
  expect(root.getByLabelText("Example Admin")).toBeDefined()

  root.unmount()
})

test("extensionPopupView explains an empty search result separately from an empty site vault", () => {
  const empty = popupRender({ status: "ready", hostname: "example.com", logins: [] })
  expect(empty.getByText("No logins saved for this site.")).toBeDefined()
  empty.unmount()

  const filtered = popupRender({ status: "ready", hostname: "example.com", logins: [exampleLogin] })
  fireEvent.input(filtered.getByLabelText("Search logins"), { target: { value: "nothing matches" } })
  expect(filtered.getByText("No logins match your search.")).toBeDefined()
  filtered.unmount()
})

test("extensionPopupView fills only the explicitly selected login", () => {
  const filled: string[] = []
  const root = popupRender(
    { status: "ready", hostname: "example.com", logins: [exampleLogin, otherLogin], fillAvailable: true },
    { loginFill: (login) => filled.push(login.id) },
  )

  fireEvent.click(root.getByRole("button", { name: "Fill Example Admin" }))

  expect(filled).toEqual(["login-2"])

  root.unmount()
})

test("extensionPopupView hides fill controls when filling is unavailable", () => {
  const root = popupRender({
    status: "ready",
    hostname: "example.com",
    logins: [exampleLogin],
    fillAvailable: false,
  })

  expect(root.queryByRole("button", { name: "Fill Example Mail" })).toBeNull()

  root.unmount()
})

test("extensionPopupView copies standard and custom fields without rendering secrets", () => {
  const copied: string[] = []
  const root = popupRender(
    { status: "ready", hostname: "example.com", logins: [exampleLogin] },
    { fieldCopy: (_login, field) => copied.push(field.key) },
  )

  for (const label of ["Username", "Password", "URI", "Notes", "API key"]) {
    fireEvent.click(root.getByRole("button", { name: `Copy ${label} of Example Mail` }))
  }

  expect(copied).toEqual(["username", "password", "uri", "notes", "custom:API key"])
  expect(root.container.textContent).not.toContain("s3cret")

  root.unmount()
})

test("extensionPopupView exposes only a generated TOTP-code copy action", () => {
  const copied: string[] = []
  const root = popupRender(
    { status: "ready", hostname: "example.com", logins: [exampleLogin] },
    { totpCopy: (login) => copied.push(login.id) },
  )

  fireEvent.click(root.getByRole("button", { name: "Copy TOTP code of Example Mail" }))

  expect(copied).toEqual(["login-1"])
  expect(root.container.textContent).not.toContain("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ")

  root.unmount()
})

test("extensionPopupView marks the most recently copied field", () => {
  const root = popupRender({
    status: "ready",
    hostname: "example.com",
    logins: [exampleLogin],
    copiedFieldKey: "password",
  })

  expect(root.getByRole("button", { name: "Copy Password of Example Mail" }).textContent).toBe("Password copied")
  expect(root.getByRole("button", { name: "Copy Username of Example Mail" }).textContent).toBe("Username")

  root.unmount()
})

test("extensionPopupView exposes add, sync, lock, logout and full vault commands", () => {
  const calls: string[] = []
  const root = popupRender(
    { status: "ready", hostname: "example.com", logins: [exampleLogin] },
    {
      loginAdd: () => calls.push("add"),
      vaultSync: () => calls.push("sync"),
      vaultLock: () => calls.push("lock"),
      vaultLogout: () => calls.push("logout"),
      fullVaultOpen: () => calls.push("full"),
    },
  )

  for (const name of ["Add login", "Sync", "Lock", "Log out", "Open full vault"]) {
    fireEvent.click(root.getByRole("button", { name }))
  }

  expect(calls).toEqual(["add", "sync", "lock", "logout", "full"])

  root.unmount()
})

test("extensionPopupView disables commands while a command is in flight", () => {
  let syncCalls = 0
  const root = popupRender(
    { status: "ready", hostname: "example.com", logins: [exampleLogin], busy: true },
    { vaultSync: () => (syncCalls += 1) },
  )

  const sync = root.getByRole("button", { name: "Sync" }) as HTMLButtonElement
  expect(sync.disabled).toBe(true)
  fireEvent.click(sync)
  expect(syncCalls).toBe(0)

  root.unmount()
})

test("extensionPopupView falls back to a placeholder when no site is active", () => {
  const root = popupRender({ status: "ready", hostname: null, logins: [] })

  expect(root.getByLabelText("Active site").textContent).toBe("No active site")

  root.unmount()
})
