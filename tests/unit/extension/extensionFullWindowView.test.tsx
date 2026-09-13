import { expect, test } from "bun:test"
import { mdiAccountPlus } from "@adaptive-ds/mdi/mdiAccountPlus.js"
import { mdiLock } from "@adaptive-ds/mdi/mdiLock.js"
import { mdiLogout } from "@adaptive-ds/mdi/mdiLogout.js"
import { mdiSync } from "@adaptive-ds/mdi/mdiSync.js"
import { fireEvent, render, within } from "@solidjs/testing-library"
import type { ExtensionLogin } from "../../../src/extension/ExtensionLogin.js"
import type { ExtensionFullWindowCommands } from "../../../src/extension/fullwindow/ExtensionFullWindowCommands.js"
import {
  ExtensionFullWindowView,
  type ExtensionFullWindowViewProps,
} from "../../../src/extension/fullwindow/ExtensionFullWindowView.jsx"
import type { ExtensionFullWindowViewModel } from "../../../src/extension/fullwindow/ExtensionFullWindowViewModel.js"
import { extensionFullWindowCommandsCreate } from "../../../src/extension/fullwindow/extensionFullWindowCommandsCreate.js"
import { extensionFullWindowEnvironmentSettingsCreate } from "../../../src/extension/fullwindow/extensionFullWindowEnvironmentSettingsCreate.js"
import { extensionFullWindowViewModelCreate } from "../../../src/extension/fullwindow/extensionFullWindowViewModelCreate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { cipherItemFromDemo } from "../../../src/web/ciphers/model/cipherItemFromDemo.js"
import { cipherItemFromWire } from "../../../src/web/ciphers/model/cipherItemFromWire.js"
import type { CipherFormData } from "../../../src/web/ciphers/schemas/cipherFormDataSchema.js"
import type { CipherItem } from "../../../src/web/ciphers/schemas/cipherItemSchema.js"
import type { CipherPresentationAdapter } from "../../../src/web/ciphers/ui/cipherPresentationAdapter.js"
import type { VaultItem } from "../../../src/web/demo/vaultItemSchema.js"
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

type FullWindowRenderOptions = Pick<
  ExtensionFullWindowViewProps,
  | "initialState"
  | "generatorOptions"
  | "generatorPreferences"
  | "generatorPreferencesLoaded"
  | "onGeneratorPreferencesChange"
  | "vaultSort"
  | "vaultSortLoaded"
  | "onVaultSortChange"
  | "theme"
  | "onThemeChange"
  | "cipherAdapter"
>

function demoItem(login: ExtensionLogin): VaultItem {
  return {
    id: login.id,
    title: login.name,
    category: "login",
    vault: "My Vault",
    ownership: "personal",
    organizationId: null,
    folderId: null,
    collectionIds: [],
    username: login.username,
    password: login.copyableFields.find((field) => field.key === "password")?.value,
    url: login.uri,
    totp: login.totpAvailable ? "123456" : undefined,
    notes: login.copyableFields.find((field) => field.key === "notes")?.value,
    customFields: login.copyableFields
      .filter((field) => field.key.startsWith("custom:"))
      .map((field) => ({ label: field.label, value: field.value, concealed: field.sensitive === true })),
    favorite: false,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-02",
  }
}

function cipherAdapterCreate(ciphers: readonly CipherItem[], copied: string[] = []): CipherPresentationAdapter {
  const first = ciphers[0] ?? cipherItemFromDemo(demoItem(exampleLogin))
  const existing = (id: string) => ciphers.find((cipher) => cipher.id === id) ?? first
  return {
    list: async () => resultCreate([...ciphers]),
    get: async (id) => resultCreate(existing(id)),
    create: async (data: CipherFormData | CipherItem) => resultCreate(data as CipherItem),
    update: async (_id, data: CipherFormData | CipherItem) => resultCreate(data as CipherItem),
    favorite: async () => resultCreate(undefined),
    softDelete: async () => resultCreate(undefined),
    hardDelete: async () => resultCreate(undefined),
    restore: async (id) => resultCreate(existing(id)),
    archive: async (id) => resultCreate(existing(id)),
    share: async (id) => resultCreate(existing(id)),
    updateCollections: async (id) => resultCreate(existing(id)),
    uploadAttachment: async (id) => resultCreate(existing(id)),
    deleteAttachment: async () => resultCreate(undefined),
    clone: async (id) => resultCreate(existing(id)),
    copyToClipboard: (value) => copied.push(value),
  }
}

function fullWindowRender(
  model: Partial<ExtensionFullWindowViewModel>,
  commands: Partial<ExtensionFullWindowCommands> = {},
  options: FullWindowRenderOptions = {},
) {
  window.history.replaceState(null, "", "/")
  const viewModel = extensionFullWindowViewModelCreate(model)
  const ciphers = viewModel.logins.map((login) => cipherItemFromDemo(demoItem(login)))
  return render(() => (
    <ExtensionFullWindowView
      model={() => viewModel}
      commands={extensionFullWindowCommandsCreate(commands)}
      {...options}
      cipherAdapter={options.cipherAdapter ?? cipherAdapterCreate(ciphers)}
    />
  ))
}

function extensionNavigation(root: ReturnType<typeof fullWindowRender>) {
  return within(root.getByRole("navigation", { name: "Extension navigation" }))
}

const sharedTypeCiphers = [
  cipherItemFromWire({
    id: "note-1",
    type: 2,
    name: "Recovery note",
    notes: "Backup codes",
    fields: [],
    secureNote: { type: 0 },
    favorite: false,
  }),
  cipherItemFromWire({
    id: "card-1",
    type: 3,
    name: "Travel card",
    fields: [],
    card: { cardholderName: "Ada Lovelace", brand: "Visa", number: "4111111111111111", code: "123" },
    favorite: false,
  }),
  cipherItemFromWire({
    id: "identity-1",
    type: 4,
    name: "Ada identity",
    fields: [],
    identity: { firstName: "Ada", lastName: "Lovelace", email: "ada@example.test" },
    favorite: false,
  }),
  cipherItemFromWire({
    id: "ssh-1",
    type: 5,
    name: "Deploy key",
    fields: [],
    sshKey: { privateKey: "private-key", publicKey: "ssh-ed25519 AAAA", keyFingerprint: "SHA256:abc" },
    favorite: false,
  }),
]

const sharedTypeSummary = (cipher: CipherItem) => ({
  object: "cipherMini" as const,
  id: cipher.id,
  type: cipher.type,
  revisionDate: cipher.revisionDate ?? "2026-01-01T00:00:00.000Z",
  deletedDate: null,
  name: cipher.name,
  edit: true,
  permissions: { delete: true, restore: true },
})

test.serial("extensionFullWindowView keeps the loading state outside the shared vault shell", () => {
  const root = fullWindowRender({ status: "loading" })

  expect(root.getByRole("status", { name: "Loading vault" })).toBeDefined()
  expect(root.queryByRole("region", { name: "Vault Items" })).toBeNull()
  root.unmount()
})

test.serial("extensionFullWindowView offers login when logged out and hides lock and logout", () => {
  let loginCalls = 0
  const root = fullWindowRender({ status: "loggedOut" }, { accountLogin: () => (loginCalls += 1) })

  fireEvent.click(root.getByRole("button", { name: "Log in" }))

  expect(loginCalls).toBe(1)
  expect(root.queryByRole("button", { name: "Lock" })).toBeNull()
  expect(root.queryByRole("button", { name: "Log out" })).toBeNull()
  root.unmount()
})

test.serial("extensionFullWindowView unlocks with the typed master password and clears the field", () => {
  const passwords: string[] = []
  const root = fullWindowRender({ status: "locked" }, { vaultUnlock: (value) => passwords.push(value) })

  const input = root.getByLabelText("Master password") as HTMLInputElement
  fireEvent.input(input, { target: { value: "correct horse" } })
  fireEvent.click(root.getByRole("button", { name: "Unlock" }))

  expect(passwords).toEqual(["correct horse"])
  expect(input.value).toBe("")
  root.unmount()
})

test.serial("extensionFullWindowView renders the error state with a retry that syncs", () => {
  let syncCalls = 0
  const root = fullWindowRender(
    { status: "error", errorMessage: "Server unreachable" },
    { vaultSync: () => syncCalls++ },
  )

  expect(root.getByRole("alert").textContent).toContain("Server unreachable")
  fireEvent.click(root.getByRole("button", { name: "Retry" }))
  expect(syncCalls).toBe(1)
  root.unmount()
})

test.serial("extensionFullWindowView renders the shared vault shell with extension-owned items", () => {
  const root = fullWindowRender({ status: "ready", logins: [exampleLogin] })

  expect(root.getByRole("region", { name: "Vault Items" })).toBeDefined()
  expect(root.getByPlaceholderText(/Search items/)).toBeDefined()
  expect(root.getByRole("button", { name: /Example Mail/ })).toBeDefined()
  expect(root.getByRole("heading", { name: "Example Mail" })).toBeDefined()
  root.unmount()
})

test.serial("extensionFullWindowView does not replace injected items with a second vault list", async () => {
  const baseAdapter = cipherAdapterCreate([cipherItemFromDemo(demoItem(exampleLogin))])
  let listCalls = 0
  let getCalls = 0
  const adapter: CipherPresentationAdapter = {
    ...baseAdapter,
    list: async () => {
      listCalls += 1
      return baseAdapter.list()
    },
    get: async (id) => {
      getCalls += 1
      return baseAdapter.get(id)
    },
  }
  const root = fullWindowRender({ status: "ready", logins: [exampleLogin] }, {}, { cipherAdapter: adapter })

  await new Promise((resolve) => setTimeout(resolve, 0))

  expect(listCalls).toBe(0)
  expect(getCalls).toBe(1)
  root.unmount()
})

test.serial("extensionFullWindowView renders all injected cipher types through the shared detail view", async () => {
  const baseAdapter = cipherAdapterCreate(sharedTypeCiphers)
  const adapter: CipherPresentationAdapter = {
    ...baseAdapter,
    get: async (id) => resultCreate(sharedTypeCiphers.find((cipher) => cipher.id === id) ?? sharedTypeCiphers[0]),
  }
  const root = fullWindowRender(
    {
      status: "ready",
      secureNotes: [sharedTypeSummary(sharedTypeCiphers[0] as CipherItem)],
      cards: [sharedTypeSummary(sharedTypeCiphers[1] as CipherItem)],
      identities: [sharedTypeSummary(sharedTypeCiphers[2] as CipherItem)],
      sshKeys: [sharedTypeSummary(sharedTypeCiphers[3] as CipherItem)],
    },
    {},
    { cipherAdapter: adapter },
  )

  fireEvent.click(root.getByRole("button", { name: /Secure Notes/ }))
  fireEvent.click(root.getByRole("button", { name: /Recovery note/ }))
  await Promise.resolve()
  expect(root.getAllByText("Backup codes").length).toBeGreaterThan(0)

  fireEvent.click(root.getByRole("button", { name: /Credit Cards/ }))
  fireEvent.click(root.getByRole("button", { name: /Travel card/ }))
  await Promise.resolve()
  expect(root.getByText("Card Credentials")).toBeDefined()

  fireEvent.click(root.getByRole("button", { name: /Identities/ }))
  fireEvent.click(root.getByRole("button", { name: /Ada identity/ }))
  await Promise.resolve()
  expect(root.getByText("Personal & Identity Profile")).toBeDefined()

  fireEvent.click(root.getByRole("button", { name: /SSH Keys/ }))
  fireEvent.click(root.getByRole("button", { name: /Deploy key/ }))
  await Promise.resolve()
  expect(root.getByText("SHA256:abc")).toBeDefined()
  expect(root.container.textContent).not.toContain("private-key")
  fireEvent.click(root.getByRole("button", { name: "Reveal private key" }))
  expect(root.getByText("private-key")).toBeDefined()
  root.unmount()
})

test.serial("extensionFullWindowView filters shared vault items", () => {
  const root = fullWindowRender({ status: "ready", logins: [exampleLogin, otherLogin] })
  const search = root.getByPlaceholderText(/Search items/) as HTMLInputElement

  fireEvent.input(search, { target: { value: "admin" } })

  expect(root.queryByRole("button", { name: /Example Mail/ })).toBeNull()
  expect(root.getByRole("button", { name: /Other Admin/ })).toBeDefined()
  root.unmount()
})

test.serial("extensionFullWindowView delegates shared detail copying to the injected adapter", () => {
  const copied: string[] = []
  const root = fullWindowRender(
    { status: "ready", logins: [exampleLogin] },
    {},
    { cipherAdapter: cipherAdapterCreate([cipherItemFromDemo(demoItem(exampleLogin))], copied) },
  )

  fireEvent.click(root.getByRole("button", { name: "Copy username" }))

  expect(copied).toEqual(["ada@example.com"])
  root.unmount()
})

test.serial("extensionFullWindowView preserves extension fill through the shared detail view", () => {
  const filled: string[] = []
  const root = fullWindowRender(
    { status: "ready", logins: [exampleLogin], fillAvailable: true },
    { loginFill: (login) => filled.push(login.id) },
  )

  fireEvent.click(root.getByRole("button", { name: "Fill Example Mail" }))

  expect(filled).toEqual(["login-1"])
  root.unmount()
})

test.serial("extensionFullWindowView preserves extension vault commands alongside the shared shell", () => {
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

  const addLogin = root.getByRole("button", { name: "Add login" })
  const sync = root.getAllByRole("button", { name: "Sync" })[0]
  const lock = root.getAllByRole("button", { name: "Lock" })[0]
  const logout = root.getByRole("button", { name: "Log out" })
  expect(addLogin.querySelector("path")?.getAttribute("d")).toBe(mdiAccountPlus)
  expect(sync.querySelector("path")?.getAttribute("d")).toBe(mdiSync)
  expect(lock.querySelector("path")?.getAttribute("d")).toBe(mdiLock)
  expect(logout.querySelector("path")?.getAttribute("d")).toBe(mdiLogout)
  fireEvent.click(addLogin)
  fireEvent.click(sync)
  fireEvent.click(lock)
  fireEvent.click(logout)

  expect(calls).toEqual(["add", "sync", "lock", "logout"])
  root.unmount()
})

test.serial("extensionFullWindowView keeps settings separate from the shared vault shell", () => {
  const root = fullWindowRender({ status: "ready", logins: [exampleLogin] }, {}, { initialState: { pane: "settings" } })

  expect(root.getByLabelText("Server settings")).toBeDefined()
  expect(root.queryByRole("region", { name: "Vault Items" })).toBeNull()

  fireEvent.click(extensionNavigation(root).getByRole("button", { name: "Vault" }))
  expect(root.getByRole("region", { name: "Vault Items" })).toBeDefined()
  root.unmount()
})

test.serial("extensionFullWindowView saves the extension server settings", () => {
  const saved: unknown[] = []
  const root = fullWindowRender(
    { status: "ready", environment: extensionFullWindowEnvironmentSettingsCreate() },
    { environmentSave: (environment) => saved.push(environment) },
  )

  fireEvent.click(extensionNavigation(root).getByRole("button", { name: "Settings" }))
  fireEvent.input(root.getByLabelText("Server URL"), { target: { value: "https://vault.example.com" } })
  fireEvent.click(root.getByRole("button", { name: "Save settings" }))

  expect(saved).toEqual([{ ...extensionFullWindowEnvironmentSettingsCreate(), base: "https://vault.example.com" }])
  root.unmount()
})

test.serial("extensionFullWindowView lays settings out in responsive cards with usable security fields", () => {
  const root = fullWindowRender(
    { status: "ready", lockPolicy: { timeoutMinutes: null, action: "lock" } },
    {},
    { initialState: { pane: "settings" } },
  )

  const serverCard = root.getByLabelText("Server settings")
  const settingsGrid = serverCard.parentElement
  const timeoutField = root.getByLabelText("Vault timeout")
  const securityFields = timeoutField.parentElement?.parentElement

  expect(settingsGrid?.className).toContain("grid-cols-1")
  expect(settingsGrid?.className).toContain("lg:grid-cols-2")
  expect(settingsGrid?.className).toContain("2xl:grid-cols-3")
  expect(securityFields?.className).toContain("grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))]")
  expect(root.getByText(/With Never selected/)).toBeDefined()
  root.unmount()
})

test.serial("extensionFullWindowView retains the generator pane", () => {
  const root = fullWindowRender({ status: "loggedOut" })

  fireEvent.click(extensionNavigation(root).getByRole("button", { name: "Generator" }))
  expect(root.getByRole("region", { name: "Generator configuration" })).toBeDefined()
  const passphrase = root.getByLabelText("Generated passphrase") as HTMLInputElement
  expect(passphrase.type).toBe("text")
  fireEvent.click(root.getByRole("button", { name: "Hide generated secret" }))
  expect(passphrase.type).toBe("password")
  root.unmount()
})

test.serial("extensionFullWindowView restores the persisted generator visibility preference", () => {
  const root = fullWindowRender(
    { status: "loggedOut" },
    {},
    {
      initialState: { pane: "generator" },
      generatorPreferences: () => ({
        passwordVisible: false,
        mode: "passphrase",
        password: {
          length: 20,
          characterPolicy: { lowercase: true, uppercase: true, numbers: true, symbols: true },
        },
        passphrase: { numWords: 3, wordSeparator: "-", includeNumber: true },
      }),
      generatorPreferencesLoaded: () => true,
    },
  )

  expect((root.getByLabelText("Generated passphrase") as HTMLInputElement).type).toBe("password")
  root.unmount()
})

test.serial("extensionFullWindowView uses the shared theme state", () => {
  const theme = createSignalObject<"light" | "dark">("light")
  const changed: string[] = []
  const root = fullWindowRender(
    { status: "ready" },
    {},
    {
      theme: theme.get,
      onThemeChange: (next) => {
        changed.push(next)
        theme.set(next)
      },
    },
  )

  fireEvent.click(root.getByRole("button", { name: "Switch to dark theme" }))

  expect(changed).toEqual(["dark"])
  root.unmount()
})

test.serial("extensionFullWindowEnvironmentSettingsCreate defaults to the self-hosted server", () => {
  expect(extensionFullWindowEnvironmentSettingsCreate()).toEqual({
    region: "selfHosted",
    base: "https://onewarden.contentoren.de",
    webVault: "",
    api: "",
    identity: "",
    icons: "",
    notifications: "",
    events: "",
  })
})

test.serial("extensionFullWindowView keeps persisted vault timeout policy controls", () => {
  const root = fullWindowRender({ status: "ready", lockPolicy: { timeoutMinutes: 60, action: "logout" } })

  fireEvent.click(extensionNavigation(root).getByRole("button", { name: "Settings" }))

  expect((root.getByLabelText("Vault timeout") as HTMLSelectElement).value).toBe("60")
  expect(root.getByRole("radio", { name: "Log out" }).getAttribute("aria-checked")).toBe("true")
  root.unmount()
})

test.serial("extensionFullWindowView waits for generator preferences before creating the generator", () => {
  const root = fullWindowRender(
    { status: "loggedOut" },
    {},
    { initialState: { pane: "generator" }, generatorPreferencesLoaded: () => false },
  )

  expect(root.getByRole("status", { name: "Loading generator preferences" })).toBeDefined()
  expect(root.queryByLabelText("Generated passphrase")).toBeNull()
  root.unmount()
})
