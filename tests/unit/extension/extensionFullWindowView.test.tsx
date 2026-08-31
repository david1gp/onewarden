import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import type { ExtensionFullWindowCommands } from "../../../src/extension/fullwindow/ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowLogin } from "../../../src/extension/fullwindow/ExtensionFullWindowLogin.js"
import { ExtensionFullWindowView } from "../../../src/extension/fullwindow/ExtensionFullWindowView.jsx"
import type { ExtensionFullWindowViewModel } from "../../../src/extension/fullwindow/ExtensionFullWindowViewModel.js"
import { extensionFullWindowCommandsCreate } from "../../../src/extension/fullwindow/extensionFullWindowCommandsCreate.js"
import { extensionFullWindowEnvironmentSettingsCreate } from "../../../src/extension/fullwindow/extensionFullWindowEnvironmentSettingsCreate.js"
import { extensionFullWindowViewModelCreate } from "../../../src/extension/fullwindow/extensionFullWindowViewModelCreate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"
import { createSignalObject } from "../../../ui/utils/createSignalObject.js"

const exampleLogin: ExtensionFullWindowLogin = {
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

const otherLogin: ExtensionFullWindowLogin = {
  id: "login-2",
  name: "Other Admin",
  username: "root@other.test",
  uri: "https://other.test/admin",
  copyableFields: [{ key: "username", label: "Username", value: "root@other.test" }],
}

function fullWindowRender(
  model: Partial<ExtensionFullWindowViewModel>,
  commands: Partial<ExtensionFullWindowCommands> = {},
) {
  window.history.replaceState(null, "", "/")
  return render(() => (
    <ExtensionFullWindowView
      model={() => extensionFullWindowViewModelCreate(model)}
      commands={extensionFullWindowCommandsCreate(commands)}
    />
  ))
}

test("extensionFullWindowView shows a loading indicator while the vault state is unknown", () => {
  const root = fullWindowRender({ status: "loading" })

  expect(root.getByRole("status", { name: "Loading vault" })).toBeDefined()
  expect(root.queryByLabelText("Search logins")).toBeNull()

  root.unmount()
})

test("extensionFullWindowView offers login when logged out and hides lock and logout", () => {
  let loginCalls = 0
  const root = fullWindowRender({ status: "loggedOut" }, { accountLogin: () => (loginCalls += 1) })

  fireEvent.click(root.getByRole("button", { name: "Log in" }))

  expect(loginCalls).toBe(1)
  expect(root.queryByRole("button", { name: "Lock" })).toBeNull()
  expect(root.queryByRole("button", { name: "Log out" })).toBeNull()

  root.unmount()
})

test("extensionFullWindowView unlocks with the typed master password and clears the field", () => {
  const passwords: string[] = []
  const root = fullWindowRender({ status: "locked" }, { vaultUnlock: (value) => passwords.push(value) })

  const input = root.getByLabelText("Master password") as HTMLInputElement
  fireEvent.input(input, { target: { value: "correct horse" } })
  fireEvent.click(root.getByRole("button", { name: "Unlock" }))

  expect(passwords).toEqual(["correct horse"])
  expect(input.value).toBe("")

  root.unmount()
})

test("extensionFullWindowView ignores an unlock attempt without a master password", () => {
  const passwords: string[] = []
  const root = fullWindowRender({ status: "locked" }, { vaultUnlock: (value) => passwords.push(value) })

  fireEvent.click(root.getByRole("button", { name: "Unlock" }))

  expect(passwords).toEqual([])

  root.unmount()
})

test("extensionFullWindowView renders the error state with a retry that syncs", () => {
  let syncCalls = 0
  const root = fullWindowRender(
    { status: "error", errorMessage: "Server unreachable" },
    { vaultSync: () => (syncCalls += 1) },
  )

  expect(root.getByRole("alert").textContent).toContain("Server unreachable")
  fireEvent.click(root.getByRole("button", { name: "Retry" }))

  expect(syncCalls).toBe(1)

  root.unmount()
})

test("extensionFullWindowView explains an empty vault separately from empty filter results", () => {
  const empty = fullWindowRender({ status: "ready", logins: [] })
  expect(empty.getByText("Your vault is empty.")).toBeDefined()
  empty.unmount()

  const filtered = fullWindowRender({ status: "ready", logins: [exampleLogin] })
  fireEvent.input(filtered.getByLabelText("Search logins"), { target: { value: "nothing matches" } })
  expect(filtered.getByText("No logins match your filters.")).toBeDefined()
  filtered.unmount()
})

test("extensionFullWindowView filters logins by the search query", () => {
  const root = fullWindowRender({ status: "ready", logins: [exampleLogin, otherLogin] })

  fireEvent.input(root.getByLabelText("Search logins"), { target: { value: "admin" } })

  expect(root.queryByRole("button", { name: "Example Mail" })).toBeNull()
  expect(root.getByRole("button", { name: "Other Admin" })).toBeDefined()

  root.unmount()
})

test("extensionFullWindowView filters logins to the active site on demand", () => {
  const root = fullWindowRender({
    status: "ready",
    hostname: "example.com",
    logins: [exampleLogin, otherLogin],
  })

  expect(root.getByRole("button", { name: "Other Admin" })).toBeDefined()
  fireEvent.click(root.getByRole("button", { name: "Only this site" }))

  expect(root.queryByRole("button", { name: "Other Admin" })).toBeNull()
  expect(root.getByRole("button", { name: "Example Mail" })).toBeDefined()

  root.unmount()
})

test("extensionFullWindowView hides the site filter without an active site", () => {
  const root = fullWindowRender({ status: "ready", hostname: null, logins: [exampleLogin] })

  expect(root.queryByRole("button", { name: "Only this site" })).toBeNull()
  expect(root.getByLabelText("Active site").textContent).toBe("No active site")

  root.unmount()
})

test("extensionFullWindowView shows details only for the selected login", () => {
  const root = fullWindowRender({ status: "ready", logins: [exampleLogin, otherLogin] })

  expect(root.getByText("Select a login to see its details.")).toBeDefined()
  fireEvent.click(root.getByRole("button", { name: "Example Mail" }))

  expect(root.getByLabelText("Details of Example Mail")).toBeDefined()
  expect(root.queryByLabelText("Details of Other Admin")).toBeNull()

  fireEvent.click(root.getByRole("button", { name: "Close details" }))
  expect(root.queryByLabelText("Details of Example Mail")).toBeNull()

  root.unmount()
})

test("extensionFullWindowView copies standard and custom fields without rendering secrets", () => {
  const copied: string[] = []
  const root = fullWindowRender(
    { status: "ready", logins: [exampleLogin] },
    { fieldCopy: (_login, field) => copied.push(field.key) },
  )

  fireEvent.click(root.getByRole("button", { name: "Example Mail" }))
  for (const label of ["Username", "Password", "URI", "Notes", "API key"]) {
    fireEvent.click(root.getByRole("button", { name: `Copy ${label} of Example Mail` }))
  }

  expect(copied).toEqual(["username", "password", "uri", "notes", "custom:API key"])
  expect(root.container.textContent).not.toContain("s3cret")

  root.unmount()
})

test("extensionFullWindowView exposes only a generated TOTP-code copy action", () => {
  const copied: string[] = []
  const root = fullWindowRender(
    { status: "ready", logins: [exampleLogin] },
    { totpCopy: (login) => copied.push(login.id) },
  )

  fireEvent.click(root.getByRole("button", { name: "Example Mail" }))
  fireEvent.click(root.getByRole("button", { name: "Copy TOTP code of Example Mail" }))

  expect(copied).toEqual(["login-1"])
  expect(root.container.textContent).not.toContain("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ")

  root.unmount()
})

test("extensionFullWindowView marks the most recently copied field", () => {
  const root = fullWindowRender({ status: "ready", logins: [exampleLogin], copiedFieldKey: "password" })

  fireEvent.click(root.getByRole("button", { name: "Example Mail" }))

  expect(root.getByRole("button", { name: "Copy Password of Example Mail" }).textContent).toBe("Copied")
  expect(root.getByRole("button", { name: "Copy Username of Example Mail" }).textContent).toBe("Copy")

  root.unmount()
})

test("extensionFullWindowView fills only the explicitly selected login when a tab is available", () => {
  const filled: string[] = []
  const root = fullWindowRender(
    { status: "ready", hostname: "example.com", logins: [exampleLogin], fillAvailable: true },
    { loginFill: (login) => filled.push(login.id) },
  )

  fireEvent.click(root.getByRole("button", { name: "Example Mail" }))
  fireEvent.click(root.getByRole("button", { name: "Fill Example Mail" }))

  expect(filled).toEqual(["login-1"])

  root.unmount()
})

test("extensionFullWindowView hides fill controls when filling is unavailable", () => {
  const root = fullWindowRender({ status: "ready", logins: [exampleLogin], fillAvailable: false })

  fireEvent.click(root.getByRole("button", { name: "Example Mail" }))

  expect(root.queryByRole("button", { name: "Fill Example Mail" })).toBeNull()

  root.unmount()
})

test("extensionFullWindowView exposes add, sync, lock and logout commands", () => {
  const calls: string[] = []
  const root = fullWindowRender(
    { status: "ready", logins: [exampleLogin] },
    {
      loginAdd: () => calls.push("add"),
      vaultSync: () => calls.push("sync"),
      vaultLock: () => calls.push("lock"),
      vaultLogout: () => calls.push("logout"),
    },
  )

  for (const name of ["Add login", "Sync", "Lock", "Log out"]) {
    fireEvent.click(root.getByRole("button", { name }))
  }

  expect(calls).toEqual(["add", "sync", "lock", "logout"])

  root.unmount()
})

test("extensionFullWindowView disables commands while a command is in flight", () => {
  let syncCalls = 0
  const root = fullWindowRender(
    { status: "ready", logins: [exampleLogin], busy: true },
    { vaultSync: () => (syncCalls += 1) },
  )

  const sync = root.getByRole("button", { name: "Sync" }) as HTMLButtonElement
  expect(sync.disabled).toBe(true)
  fireEvent.click(sync)
  expect(syncCalls).toBe(0)

  root.unmount()
})

test("extensionFullWindowView shows the base URL field only for self-hosted servers", () => {
  const root = fullWindowRender({ status: "ready", logins: [] })

  fireEvent.click(root.getByRole("button", { name: "Settings" }))
  expect(root.queryByLabelText("Server base URL")).toBeNull()

  fireEvent.change(root.getByLabelText("Region"), { target: { value: "selfHosted" } })
  expect(root.getByLabelText("Server base URL")).toBeDefined()

  root.unmount()
})

test("extensionFullWindowView saves region, base and independent service overrides", () => {
  const saved: unknown[] = []
  const root = fullWindowRender(
    {
      status: "ready",
      logins: [],
      environment: extensionFullWindowEnvironmentSettingsCreate({ region: "eu" }),
    },
    { environmentSave: (environment) => saved.push(environment) },
  )

  fireEvent.click(root.getByRole("button", { name: "Settings" }))
  expect((root.getByLabelText("Region") as HTMLSelectElement).value).toBe("eu")

  fireEvent.change(root.getByLabelText("Region"), { target: { value: "selfHosted" } })
  fireEvent.input(root.getByLabelText("Server base URL"), { target: { value: "https://vault.example.com" } })
  fireEvent.input(root.getByLabelText("Identity URL"), { target: { value: "https://sso.example.com" } })
  fireEvent.input(root.getByLabelText("Icons URL"), { target: { value: "https://icons.example.com" } })
  fireEvent.click(root.getByRole("button", { name: "Save settings" }))

  expect(saved).toEqual([
    extensionFullWindowEnvironmentSettingsCreate({
      region: "selfHosted",
      base: "https://vault.example.com",
      identity: "https://sso.example.com",
      icons: "https://icons.example.com",
    }),
  ])

  root.unmount()
})

test("extensionFullWindowView re-enables settings and surfaces a save error after the bridge responds", async () => {
  const modelSignal = createSignalObject(extensionFullWindowViewModelCreate({ status: "ready" }))
  const commands = extensionFullWindowCommandsCreate(
    {},
    {
      hostPermissionRequest: async () => resultCreate(undefined),
      messageSend: async () =>
        resultErrorCreate("extensionBackgroundRouter.environmentSave", "Storage is unavailable."),
      onModelUpdate: (updater) => modelSignal.set(updater(modelSignal.get())),
    },
  )
  const root = render(() => <ExtensionFullWindowView model={modelSignal.get} commands={commands} />)

  fireEvent.click(root.getByRole("button", { name: "Settings" }))
  fireEvent.change(root.getByLabelText("Region"), { target: { value: "selfHosted" } })
  fireEvent.input(root.getByLabelText("Server base URL"), { target: { value: "https://vault.example.com" } })
  fireEvent.click(root.getByRole("button", { name: "Save settings" }))

  expect((root.getByRole("button", { name: "Saving settings…" }) as HTMLButtonElement).disabled).toBe(true)
  await new Promise((resolve) => setTimeout(resolve, 0))

  expect((root.getByRole("button", { name: "Save settings" }) as HTMLButtonElement).disabled).toBe(false)
  expect(root.getByRole("alert").textContent).toContain("Storage is unavailable.")

  root.unmount()
})

test("extensionFullWindowView switches between the vault and settings panes", () => {
  const root = fullWindowRender({ status: "ready", logins: [exampleLogin] })

  fireEvent.click(root.getByRole("button", { name: "Settings" }))
  expect(root.getByLabelText("Server settings")).toBeDefined()
  expect(root.queryByLabelText("Search logins")).toBeNull()

  fireEvent.click(root.getByRole("button", { name: "Vault" }))
  expect(root.getByLabelText("Search logins")).toBeDefined()
  expect(root.queryByLabelText("Server settings")).toBeNull()

  root.unmount()
})
