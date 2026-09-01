import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import type { ExtensionFullWindowCommands } from "../../../src/extension/fullwindow/ExtensionFullWindowCommands.js"
import type { ExtensionLogin } from "../../../src/extension/ExtensionLogin.js"
import { ExtensionFullWindowView } from "../../../src/extension/fullwindow/ExtensionFullWindowView.jsx"
import type { ExtensionFullWindowViewModel } from "../../../src/extension/fullwindow/ExtensionFullWindowViewModel.js"
import { extensionFullWindowCommandsCreate } from "../../../src/extension/fullwindow/extensionFullWindowCommandsCreate.js"
import { extensionFullWindowEnvironmentSettingsCreate } from "../../../src/extension/fullwindow/extensionFullWindowEnvironmentSettingsCreate.js"
import { extensionFullWindowViewModelCreate } from "../../../src/extension/fullwindow/extensionFullWindowViewModelCreate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"
import { createSignalObject } from "../../../ui/utils/createSignalObject.js"

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

test("extensionFullWindowView delegates editing to OneWarden and does not render a local form", () => {
  const edited: string[] = []
  const root = fullWindowRender(
    { status: "ready", logins: [exampleLogin] },
    { loginEdit: (login) => edited.push(login.id) },
  )

  fireEvent.click(root.getByRole("button", { name: "Example Mail" }))
  fireEvent.click(root.getByRole("button", { name: "Edit Example Mail in OneWarden" }))

  expect(edited).toEqual(["login-1"])
  expect(root.queryByRole("form")).toBeNull()
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

test("extensionFullWindowView loads the persisted vault timeout policy", () => {
  const root = fullWindowRender({
    status: "ready",
    lockPolicy: { timeoutMinutes: 60, action: "logout" },
  })

  fireEvent.click(root.getByRole("button", { name: "Settings" }))

  expect((root.getByLabelText("Vault timeout") as HTMLSelectElement).value).toBe("60")
  expect(root.getByRole("radio", { name: "Log out" }).getAttribute("aria-checked")).toBe("true")
  expect(root.queryByText(/With Never selected/)).toBeNull()

  root.unmount()
})

test("extensionFullWindowView saves minute and logout timeout choices", () => {
  const saved: unknown[] = []
  const root = fullWindowRender(
    { status: "ready", lockPolicy: { timeoutMinutes: 15, action: "lock" } },
    { lockPolicySave: (policy) => saved.push(policy) },
  )

  fireEvent.click(root.getByRole("button", { name: "Settings" }))
  fireEvent.change(root.getByLabelText("Vault timeout"), { target: { value: "240" } })
  fireEvent.click(root.getByRole("radio", { name: "Log out" }))
  fireEvent.click(root.getByRole("button", { name: "Save security settings" }))

  expect(saved).toEqual([{ timeoutMinutes: 240, action: "logout" }])

  root.unmount()
})

test("extensionFullWindowView represents Never as a null timeout and explains its risk", () => {
  const saved: unknown[] = []
  const root = fullWindowRender(
    { status: "ready", lockPolicy: { timeoutMinutes: 5, action: "lock" } },
    { lockPolicySave: (policy) => saved.push(policy) },
  )

  fireEvent.click(root.getByRole("button", { name: "Settings" }))
  fireEvent.change(root.getByLabelText("Vault timeout"), { target: { value: "never" } })

  expect(root.getByText(/With Never selected/)).toBeDefined()
  fireEvent.click(root.getByRole("button", { name: "Save security settings" }))
  expect(saved).toEqual([{ timeoutMinutes: null, action: "lock" }])

  root.unmount()
})

test("extensionFullWindowView shows security loading and save result states", async () => {
  const loading = fullWindowRender({ status: "loading" })
  fireEvent.click(loading.getByRole("button", { name: "Settings" }))
  expect(loading.getByRole("status").textContent).toContain("Loading security settings")
  expect(loading.queryByLabelText("Vault timeout")).toBeNull()
  loading.unmount()

  const modelSignal = createSignalObject(
    extensionFullWindowViewModelCreate({
      status: "ready",
      lockPolicy: { timeoutMinutes: 30, action: "lock" },
    }),
  )
  const sent: unknown[] = []
  const commands = extensionFullWindowCommandsCreate(
    {},
    {
      messageSend: async (message) => {
        sent.push(message)
        return resultCreate(undefined)
      },
      onModelUpdate: (updater) => modelSignal.set(updater(modelSignal.get())),
    },
  )
  const root = render(() => <ExtensionFullWindowView model={modelSignal.get} commands={commands} />)

  fireEvent.click(root.getByRole("button", { name: "Settings" }))
  fireEvent.click(root.getByRole("button", { name: "Save security settings" }))
  expect((root.getByRole("button", { name: "Saving security settings…" }) as HTMLButtonElement).disabled).toBe(true)
  await new Promise((resolve) => setTimeout(resolve, 0))

  expect(sent).toEqual([{ type: "lockPolicySave", request: { timeoutMinutes: 30, action: "lock" } }])
  expect(root.getByRole("status").textContent).toContain("Security settings saved")

  root.unmount()
})

test("extensionFullWindowView surfaces security save errors", async () => {
  const modelSignal = createSignalObject(
    extensionFullWindowViewModelCreate({
      status: "ready",
      lockPolicy: { timeoutMinutes: null, action: "lock" },
    }),
  )
  const commands = extensionFullWindowCommandsCreate(
    {},
    {
      messageSend: async () => resultErrorCreate("extensionBackgroundRouter.lockPolicySave", "Policy storage failed."),
      onModelUpdate: (updater) => modelSignal.set(updater(modelSignal.get())),
    },
  )
  const root = render(() => <ExtensionFullWindowView model={modelSignal.get} commands={commands} />)

  fireEvent.click(root.getByRole("button", { name: "Settings" }))
  fireEvent.click(root.getByRole("button", { name: "Save security settings" }))
  await new Promise((resolve) => setTimeout(resolve, 0))

  expect(root.getByRole("alert").textContent).toContain("Policy storage failed.")
  expect((root.getByRole("button", { name: "Save security settings" }) as HTMLButtonElement).disabled).toBe(false)

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

test("extensionFullWindowView navigates among URL-backed vault, generator and settings panes", async () => {
  const root = fullWindowRender({ status: "ready", logins: [exampleLogin] })

  fireEvent.click(root.getByRole("button", { name: "Generator" }))
  expect(root.getByRole("heading", { name: "Generator" })).toBeDefined()
  expect(root.queryByLabelText("Search logins")).toBeNull()
  expect(root.getByRole("button", { name: "Generator" }).getAttribute("aria-current")).toBe("page")
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(new URLSearchParams(window.location.search).get("pane")).toBe("generator")

  fireEvent.click(root.getByRole("button", { name: "Settings" }))
  expect(root.getByLabelText("Server settings")).toBeDefined()
  fireEvent.click(root.getByRole("button", { name: "Vault" }))
  expect(root.getByLabelText("Search logins")).toBeDefined()

  root.unmount()
})

test("extensionFullWindowGeneratorPane updates useful generation controls", () => {
  const root = fullWindowRender({ status: "loggedOut" })
  fireEvent.click(root.getByRole("button", { name: "Generator" }))
  fireEvent.click(root.getByRole("radio", { name: "Password" }))
  const password = root.getByLabelText("Generated password") as HTMLInputElement

  expect(password.value).toHaveLength(20)
  fireEvent.input(root.getByLabelText("Password length slider"), { target: { value: "32" } })
  expect(password.value).toHaveLength(32)

  fireEvent.click(root.container.querySelector("#generator-uppercase") as HTMLInputElement)
  fireEvent.click(root.container.querySelector("#generator-numbers") as HTMLInputElement)
  fireEvent.click(root.container.querySelector("#generator-symbols") as HTMLInputElement)
  fireEvent.click(root.getByRole("button", { name: "Regenerate password" }))
  expect(password.value).toMatch(/^[a-z]{32}$/)
  expect((root.container.querySelector("#generator-lowercase") as HTMLInputElement).disabled).toBe(true)

  fireEvent.click(root.getByRole("button", { name: "Show" }))
  expect(password.type).toBe("text")
  expect(root.getByRole("button", { name: "Hide" }).getAttribute("aria-pressed")).toBe("true")

  root.unmount()
})

test("extensionFullWindowGeneratorPane copies the generated password", async () => {
  const copied: string[] = []
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: async (value: string) => copied.push(value) },
  })
  const root = fullWindowRender({ status: "loggedOut" })
  fireEvent.click(root.getByRole("button", { name: "Generator" }))
  fireEvent.click(root.getByRole("radio", { name: "Password" }))
  const password = root.getByLabelText("Generated password") as HTMLInputElement

  fireEvent.click(root.getByRole("button", { name: "Copy" }))
  await new Promise((resolve) => setTimeout(resolve, 0))

  expect(copied).toEqual([password.value])
  expect(root.getByRole("button", { name: "Copied" })).toBeDefined()

  root.unmount()
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined })
})

test("extensionFullWindowGeneratorPane defaults to and controls passphrases", () => {
  const root = fullWindowRender({ status: "loggedOut" })
  fireEvent.click(root.getByRole("button", { name: "Generator" }))

  const passphrase = root.getByLabelText("Generated passphrase") as HTMLInputElement
  const wordCount = root.getByLabelText("Number of words") as HTMLInputElement
  const separator = root.getByLabelText("Word separator") as HTMLInputElement
  const includeNumber = root.container.querySelector("#passphrase-include-number") as HTMLInputElement

  expect(root.getByRole("group", { name: "Type" })).toBeDefined()
  expect(root.getByRole("radio", { name: "Passphrase" }).getAttribute("aria-checked")).toBe("true")
  expect(wordCount.value).toBe("3")
  expect(separator.value).toBe("-")
  expect(includeNumber.checked).toBe(true)
  expect(passphrase.value.split("-").length).toBeGreaterThanOrEqual(3)
  expect(passphrase.value.match(/\d/g)).toHaveLength(1)

  fireEvent.input(wordCount, { target: { value: "2" } })
  expect(passphrase.value.split("-").length).toBeGreaterThanOrEqual(3)
  fireEvent.input(wordCount, { target: { value: "21" } })
  expect(passphrase.value.split("-").length).toBeGreaterThanOrEqual(20)
  fireEvent.input(separator, { target: { value: "|" } })
  fireEvent.click(includeNumber)

  expect(separator.value).toBe("|")
  expect(includeNumber.checked).toBe(false)
  expect(passphrase.value.split("|")).toHaveLength(20)
  expect(passphrase.value).not.toMatch(/\d/)

  fireEvent.click(root.getByRole("radio", { name: "Password" }))
  expect(root.getByLabelText("Password length")).toBeDefined()
  expect(root.queryByLabelText("Number of words")).toBeNull()
  fireEvent.click(root.getByRole("radio", { name: "Passphrase" }))
  expect((root.getByLabelText("Number of words") as HTMLInputElement).value).toBe("20")
  expect((root.getByLabelText("Word separator") as HTMLInputElement).value).toBe("|")
  expect((root.container.querySelector("#passphrase-include-number") as HTMLInputElement).checked).toBe(false)
  expect((root.getByRole("button", { name: "Regenerate passphrase" }) as HTMLButtonElement).disabled).toBe(false)

  root.unmount()
})
