import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import type { ExtensionLogin } from "../../../src/extension/ExtensionLogin.js"
import type { ExtensionPopupCommands } from "../../../src/extension/popup/ExtensionPopupCommands.js"
import { ExtensionPopupView, type ExtensionPopupViewProps } from "../../../src/extension/popup/ExtensionPopupView.jsx"
import type { ExtensionPopupViewModel } from "../../../src/extension/popup/ExtensionPopupViewModel.js"
import { extensionPopupCommandsCreate } from "../../../src/extension/popup/extensionPopupCommandsCreate.js"
import { extensionPopupViewModelCreate } from "../../../src/extension/popup/extensionPopupViewModelCreate.js"
import { extensionGeneratorPreferencesDefault } from "../../../src/extension/storage/extensionGeneratorPreferencesDefault.js"

const exampleLogin: ExtensionLogin = {
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

const otherLogin: ExtensionLogin = {
  id: "login-2",
  name: "Example Admin",
  username: "root@example.com",
  uri: "https://example.com/admin",
  copyableFields: [{ key: "username", label: "Username", value: "root@example.com" }],
}

type PopupRenderOptions = Pick<
  ExtensionPopupViewProps,
  | "generatorOptions"
  | "generatorPreferences"
  | "generatorPreferencesLoaded"
  | "onGeneratorPreferencesChange"
  | "initialPane"
  | "initialPaneLoaded"
  | "onPaneChange"
>

function popupRender(
  model: Partial<ExtensionPopupViewModel>,
  commands: Partial<ExtensionPopupCommands> = {},
  options: PopupRenderOptions = {},
) {
  return render(() => (
    <ExtensionPopupView
      model={extensionPopupViewModelCreate(model)}
      commands={extensionPopupCommandsCreate(commands)}
      {...options}
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

  const login = root.getByRole("button", { name: "Log in" })
  expect(login.classList.contains("extension-primary-control")).toBe(true)
  fireEvent.click(login)

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

test("extensionPopupView omits popup identity text and shows matched logins", () => {
  const root = popupRender({
    status: "ready",
    hostname: "example.com",
    logins: [
      { ...exampleLogin, creationDate: "2026-09-01T00:00:00.000Z", revisionDate: "2026-09-01T00:00:00.000Z" },
      { ...otherLogin, creationDate: "2026-08-01T00:00:00.000Z", revisionDate: "2026-08-01T00:00:00.000Z" },
    ],
    fillAvailable: true,
  })

  expect(root.queryByText("OneWarden", { exact: true })).toBeNull()
  expect(root.queryByText("example.com", { exact: true })).toBeNull()
  expect(root.queryByLabelText("Active site")).toBeNull()
  expect(root.getByLabelText("Example Mail")).toBeDefined()
  expect(root.getByLabelText("Example Admin")).toBeDefined()
  expect([...root.container.querySelectorAll("article")].map((card) => card.getAttribute("aria-label"))).toEqual([
    "Example Mail",
    "Example Admin",
  ])
  expect(root.queryByLabelText("Sort logins")).toBeNull()

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

test("extensionPopupView renders compact text tabs and labeled icon-only actions", () => {
  const calls: string[] = []
  const root = popupRender(
    { status: "ready", hostname: "example.com", logins: [exampleLogin] },
    {
      loginAdd: () => calls.push("add"),
      vaultSync: () => calls.push("sync"),
      vaultLock: () => calls.push("lock"),
      vaultLogout: () => calls.push("logout"),
      fullVaultOpen: () => calls.push("full"),
      generatorOpen: () => calls.push("generator"),
      settingsOpen: () => calls.push("settings"),
    },
  )

  expect(root.getByRole("button", { name: "Vault" }).getAttribute("aria-current")).toBe("page")
  const navigation = root.getByRole("navigation", { name: "Extension navigation" })
  const contentNavigation = root.getByRole("group", { name: "Vault and generator" })
  expect(contentNavigation.querySelectorAll("button")).toHaveLength(2)
  expect(contentNavigation.querySelectorAll("svg")).toHaveLength(0)
  expect(root.getByRole("button", { name: "Generator" }).hasAttribute("aria-current")).toBe(false)
  expect(contentNavigation.contains(root.getByRole("button", { name: "Settings" }))).toBe(false)
  expect(root.getByRole("button", { name: "Settings" }).hasAttribute("aria-current")).toBe(false)
  expect(root.getByRole("button", { name: "Settings" }).getAttribute("title")).toBe("Open Settings in a full window")
  expect(root.getByRole("button", { name: "Settings" }).textContent).toBe("")
  const theme = root.getByRole("button", { name: "Switch to dark theme" })
  expect(theme.getAttribute("title")).toBe("Switch to dark theme")
  expect(theme.textContent).toBe("")
  expect(navigation.querySelectorAll("button")).toHaveLength(4)
  expect(root.container.textContent).not.toContain("Popup content")
  expect(root.queryByRole("heading", { name: "Generator" })).toBeNull()

  fireEvent.click(root.getByRole("button", { name: "Generator" }))
  expect(root.getByRole("button", { name: "Generator" }).getAttribute("aria-current")).toBe("page")
  expect(root.getByRole("button", { name: "Vault" }).hasAttribute("aria-current")).toBe(false)
  expect(root.queryByRole("heading", { name: "Generator" })).toBeNull()
  expect(root.container.textContent).not.toContain("Generated securely on this device.")
  fireEvent.click(root.getByRole("button", { name: "Open full generator" }))
  fireEvent.click(root.getByRole("button", { name: "Settings" }))
  expect(root.getByRole("button", { name: "Settings" }).hasAttribute("aria-current")).toBe(false)
  expect(root.getByRole("button", { name: "Generator" }).getAttribute("aria-current")).toBe("page")
  fireEvent.click(root.getByRole("button", { name: "Vault" }))
  fireEvent.click(root.getByRole("button", { name: "Open full vault" }))
  for (const name of ["Add login", "Sync", "Lock", "Log out"]) fireEvent.click(root.getByRole("button", { name }))

  expect(calls).toEqual(["generator", "settings", "full", "add", "sync", "lock", "logout"])

  root.unmount()
})

test("extensionPopupView restores the content pane and does not persist Settings", () => {
  const panes: Array<"vault" | "generator"> = []
  const root = popupRender(
    { status: "ready", hostname: "example.com", logins: [exampleLogin] },
    {},
    {
      initialPane: () => "generator",
      initialPaneLoaded: () => true,
      onPaneChange: (pane) => panes.push(pane),
    },
  )

  expect(root.getByRole("button", { name: "Generator" }).getAttribute("aria-current")).toBe("page")
  fireEvent.click(root.getByRole("button", { name: "Settings" }))
  expect(root.getByRole("button", { name: "Settings" }).hasAttribute("aria-current")).toBe(false)
  expect(root.getByRole("button", { name: "Generator" }).getAttribute("aria-current")).toBe("page")
  expect(panes).toEqual([])
  fireEvent.click(root.getByRole("button", { name: "Vault" }))
  expect(panes).toEqual(["vault"])

  root.unmount()
})

test("extensionPopupView renders the inline generator and keeps its controls compact", async () => {
  const copied: string[] = []
  const preferenceChanges: boolean[] = []
  const root = popupRender(
    { status: "loading" },
    {},
    {
      generatorOptions: { clipboardWrite: async (value) => copied.push(value) },
      generatorPreferences: () => extensionGeneratorPreferencesDefault,
      generatorPreferencesLoaded: () => true,
      onGeneratorPreferencesChange: (preferences) => preferenceChanges.push(preferences.passwordVisible),
    },
  )

  fireEvent.click(root.getByRole("button", { name: "Generator" }))

  expect(root.queryByRole("heading", { name: "Generator" })).toBeNull()
  expect(root.getByLabelText("Generated passphrase")).toBeDefined()
  expect(root.queryByLabelText("Search logins")).toBeNull()

  fireEvent.click(root.getByRole("radio", { name: "Password" }))
  const password = root.getByLabelText("Generated password") as HTMLInputElement
  expect(password.type).toBe("text")
  expect(root.getByRole("button", { name: "Hide generated secret" })).toBeDefined()
  fireEvent.input(root.getByLabelText("Password length"), { target: { value: "32" } })
  expect(password.value).toHaveLength(32)

  fireEvent.click(root.getByRole("button", { name: "Hide generated secret" }))
  expect(password.type).toBe("password")
  expect(preferenceChanges).toEqual([true, true, false])
  fireEvent.click(root.getByRole("button", { name: "Copy generated password" }))
  await new Promise((resolve) => setTimeout(resolve, 0))

  expect(copied).toEqual([password.value])
  expect(root.getByRole("status").textContent).toContain("Copied to clipboard")

  root.unmount()
})

test("extensionPopupView hydrates popup generator preferences before rendering controls", () => {
  const root = popupRender(
    { status: "loading" },
    {},
    {
      generatorPreferences: () => ({
        passwordVisible: false,
        mode: "password",
        password: {
          length: 47,
          characterPolicy: { lowercase: false, uppercase: true, numbers: false, symbols: true },
        },
        passphrase: { numWords: 11, wordSeparator: "·", includeNumber: false },
      }),
      generatorPreferencesLoaded: () => true,
    },
  )

  fireEvent.click(root.getByRole("button", { name: "Generator" }))

  expect(root.getByRole("radio", { name: "Password" }).getAttribute("aria-checked")).toBe("true")
  expect((root.getByLabelText("Password length") as HTMLInputElement).value).toBe("47")
  expect((root.container.querySelector("#popup-generator-uppercase") as HTMLInputElement).checked).toBe(true)
  expect((root.container.querySelector("#popup-generator-lowercase") as HTMLInputElement).checked).toBe(false)
  expect((root.getByLabelText("Generated password") as HTMLInputElement).type).toBe("password")

  root.unmount()
})

test("extensionPopupView provides form autocomplete metadata and bounded results", () => {
  const root = popupRender({ status: "ready", hostname: "example.com", logins: [exampleLogin] })

  expect(root.getByLabelText("Search logins").getAttribute("autocomplete")).toBe("off")
  root.unmount()

  const locked = popupRender({ status: "locked" })
  expect(locked.getByLabelText("Master password").getAttribute("autocomplete")).toBe("current-password")
  expect(locked.container.querySelector("ul")).toBeNull()
  locked.unmount()
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

test("extensionPopupView does not replace the removed hostname when no site is active", () => {
  const root = popupRender({ status: "ready", hostname: null, logins: [] })

  expect(root.queryByText("OneWarden", { exact: true })).toBeNull()
  expect(root.queryByText("No active site", { exact: true })).toBeNull()
  expect(root.queryByLabelText("Active site")).toBeNull()

  root.unmount()
})
