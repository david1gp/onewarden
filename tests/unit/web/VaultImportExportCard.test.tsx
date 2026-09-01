import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import { bitwardenCipherStringEncrypt } from "../../../src/shared/crypto/bitwardenCipherStringEncrypt.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"
import { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import { webAuthStorageCreate } from "../../../src/web/auth/model/webAuthStorageCreate.js"
import type { organizationApiClientCreate } from "../../../src/web/organizations/api/organizationApiClientCreate.js"
import { VaultImportExportCard } from "../../../src/web/settings/ui/VaultImportExportCard.jsx"
import { vaultImportExportCardStateCreate } from "../../../src/web/settings/ui/vaultImportExportCardStateCreate.js"

function sessionCreate() {
  const memoryStore = new Map<string, string>()
  const storage = webAuthStorageCreate({
    getItem: (key) => memoryStore.get(key) ?? null,
    setItem: (key, val) => memoryStore.set(key, val),
    removeItem: (key) => memoryStore.delete(key),
  })
  storage.sessionSave({
    email: "user@example.com",
    accessToken: "access-token-xyz",
    refreshToken: "refresh-token-xyz",
    tokenType: "Bearer",
    expiresAt: Date.now() + 3600_000,
    userId: "user-uuid-123",
    kdf: 0,
    kdfIterations: 600_000,
    kdfMemory: null,
    kdfParallelism: null,
    encryptedUserKey: "2.iv|key|mac",
  })
  return webAuthSessionCreate({ storage })
}

function buttonFind(container: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button")).find((b) => b.textContent?.includes(text))
  if (!button) throw new Error(`button '${text}' not found`)
  return button
}

test("import tab explains additive import and distinct file password", () => {
  const { container, unmount } = render(() => <VaultImportExportCard session={sessionCreate()} />)

  expect(container.textContent).toContain("Importing is additive")
  expect(container.textContent).toContain("Bitwarden JSON (.json)")
  expect(container.textContent).toContain("Bitwarden CSV (.csv)")
  expect(container.textContent).toContain("File Password (password-protected JSON only)")
  expect(container.textContent).toContain("not your account master password")
  expect(container.textContent).toContain("Master Password (only needed while the vault is locked)")

  fireEvent.click(buttonFind(container, "Bitwarden CSV (.csv)"))
  expect(container.textContent).toContain("only carries logins and secure notes")
  expect(container.querySelector("#import-file-password")).toBeNull()

  unmount()
})

test("export tab offers every personal format with confirmation and loss warnings", () => {
  const { container, unmount } = render(() => <VaultImportExportCard session={sessionCreate()} />)

  fireEvent.click(buttonFind(container, "Export Vault"))

  expect(container.textContent).toContain("Unencrypted JSON (.json)")
  expect(container.textContent).toContain("Unencrypted CSV (.csv)")
  expect(container.textContent).toContain("Password-protected JSON (.json)")
  expect(container.textContent).toContain("Account-restricted JSON (.json)")
  expect(container.textContent).toContain("JSON with attachments (.zip)")
  expect(container.textContent).toContain("not encrypted and contains your passwords")

  fireEvent.click(buttonFind(container, "Unencrypted CSV (.csv)"))
  expect(container.textContent).toContain("CSV is also lossy")

  fireEvent.click(buttonFind(container, "Password-protected JSON (.json)"))
  expect(container.textContent).toContain("Confirm File Password")
  expect(container.textContent).not.toContain("not encrypted and contains your passwords")

  const password = container.querySelector("#export-file-password") as HTMLInputElement
  const confirm = container.querySelector("#export-file-password-confirm") as HTMLInputElement
  fireEvent.input(password, { target: { value: "file-secret" } })
  fireEvent.input(confirm, { target: { value: "mismatch" } })
  expect(container.textContent).toContain("do not match")

  const submitFind = () => container.querySelector("form button[type=submit]") as HTMLButtonElement
  expect(submitFind().disabled).toBe(true)

  fireEvent.input(confirm, { target: { value: "file-secret" } })
  expect(submitFind().disabled).toBe(false)

  unmount()
})

test("account-restricted export explains account binding without a plaintext warning", () => {
  const { container, unmount } = render(() => <VaultImportExportCard session={sessionCreate()} />)

  fireEvent.click(buttonFind(container, "Export Vault"))
  fireEvent.click(buttonFind(container, "Account-restricted JSON (.json)"))

  expect(container.textContent).toContain("bound to this account")
  expect(container.textContent).toContain("not portable")
  expect(container.textContent).not.toContain("not encrypted and contains your passwords")
  expect(container.querySelector("#export-file-password")).toBeNull()
  expect(container.querySelector("#export-master-password")).not.toBeNull()

  unmount()
})

test("zip export warns about plaintext attachments and hides the clipboard action", () => {
  const { container, unmount } = render(() => <VaultImportExportCard session={sessionCreate()} />)

  fireEvent.click(buttonFind(container, "Export Vault"))
  fireEvent.click(buttonFind(container, "JSON with attachments (.zip)"))

  expect(container.textContent).toContain("decrypted file next to the JSON export")
  expect(container.textContent).toContain("skipped")
  expect(container.textContent).toContain("binary and can only be downloaded")
  expect(
    Array.from(container.querySelectorAll("button")).some((b) => b.textContent?.includes("Copy to Clipboard")),
  ).toBe(false)

  unmount()
})

test("import scope switching exposes organization selection and hides personal password fields", async () => {
  const organizationApiClient = await organizationApiClientStubCreate()
  const { container, unmount } = render(() => (
    <VaultImportExportCard session={sessionWithKeyCreate()} organizationApiClient={organizationApiClient} />
  ))

  expect(container.querySelector("#import-organization")).toBeNull()
  expect(container.querySelector("#import-master-password")).not.toBeNull()

  fireEvent.click(buttonFind(container, "An Organization"))
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()

  expect(container.textContent).toContain("write to the target collections")
  expect(container.querySelector("#import-file-password")).toBeNull()
  expect(container.querySelector("#import-master-password")).toBeNull()
  const select = container.querySelector("#import-organization") as HTMLSelectElement
  expect(select).not.toBeNull()
  expect(select.textContent).toContain("Engineering")
  expect(container.querySelector('label[for="import-organization"]')).not.toBeNull()

  unmount()
})

test("export scope switching restricts organization formats and labels the selector", async () => {
  const organizationApiClient = await organizationApiClientStubCreate()
  const { container, unmount } = render(() => (
    <VaultImportExportCard session={sessionWithKeyCreate()} organizationApiClient={organizationApiClient} />
  ))

  fireEvent.click(buttonFind(container, "Export Vault"))
  fireEvent.click(buttonFind(container, "An Organization"))
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()

  expect(container.textContent).toContain("Organization administration rights are required")
  expect(container.textContent).toContain("collection assignments")
  expect(container.textContent).not.toContain("JSON with attachments (.zip)")
  expect(container.textContent).not.toContain("Account-restricted JSON (.json)")
  expect(container.textContent).not.toContain("Password-protected JSON (.json)")
  expect(container.querySelector("#export-master-password")).toBeNull()
  expect(container.querySelector('label[for="export-organization"]')).not.toBeNull()

  unmount()
})

test("import state reports validation errors and structured counts", async () => {
  const errors: string[] = []
  const successes: string[] = []
  const state = vaultImportExportCardStateCreate({
    session: sessionCreate(),
    onNotifyError: (m) => errors.push(m),
    onNotifySuccess: (m) => successes.push(m),
  })

  await state.handleImport(new Event("submit"))
  expect(errors[0]).toContain("Select a Bitwarden export file")
  expect(state.importValidationMessage()).toContain("Select a Bitwarden export file")
  expect(state.canSubmitImport()).toBe(false)

  state.setImportContent("{}")
  expect(state.importValidationMessage()).toBeNull()
  expect(state.canSubmitImport()).toBe(true)

  await state.handleImport(new Event("submit"))
  expect(state.importSummary()).toBeNull()
  expect(state.importValidationMessage()).not.toBeNull()
})

test("export state rejects missing and mismatched file passwords", async () => {
  const errors: string[] = []
  const state = vaultImportExportCardStateCreate({
    session: sessionCreate(),
    onNotifyError: (m) => errors.push(m),
  })

  state.setExportFormat("json-encrypted")
  expect(state.canSubmitExport()).toBe(false)

  await state.handleExport(new Event("submit"))
  expect(errors.at(-1)).toContain("Enter a file password")

  state.setExportFilePassword("abc")
  state.setExportFilePasswordConfirm("abd")
  expect(state.exportPasswordMismatch()).toBe(true)
  await state.handleExport(new Event("submit"))
  expect(errors.at(-1)).toContain("do not match")

  state.setExportFilePasswordConfirm("abc")
  expect(state.exportPasswordMismatch()).toBe(false)
  expect(state.canSubmitExport()).toBe(true)
})

const accountKey = new Uint8Array(64).fill(7)
const orgKeyPlain = new Uint8Array(64).fill(9)

function sessionWithKeyCreate(userKey: Uint8Array | null = accountKey): ReturnType<typeof webAuthSessionCreate> {
  return {
    getUserKey: () => userKey,
    session: () => ({
      accessToken: "access-token",
      email: "user@example.com",
      encryptedUserKey: "wrapped",
      expiresAt: Date.now() + 60_000,
      kdf: 0,
      kdfIterations: 600_000,
      kdfMemory: null,
      kdfParallelism: null,
      refreshToken: "refresh-token",
      tokenType: "Bearer",
      userId: "user-id",
    }),
  } as ReturnType<typeof webAuthSessionCreate>
}

async function organizationApiClientStubCreate(overrides: Record<string, unknown> = {}) {
  const wrapped = await bitwardenCipherStringEncrypt(orgKeyPlain, accountKey)
  if (!wrapped.success) throw new Error("failed to wrap organization key")
  return {
    organizationList: async () => resultCreate([{ id: "org-1", key: wrapped.data, name: "Engineering" }]),
    organizationExport: async () => resultCreate({ ciphers: [], collections: [] }),
    organizationImport: async () => resultCreate({}),
    ...overrides,
  } as unknown as ReturnType<typeof organizationApiClientCreate>
}

test("switching to organization scope loads organizations and resets incompatible fields", async () => {
  const state = vaultImportExportCardStateCreate({
    session: sessionWithKeyCreate(),
    organizationApiClient: await organizationApiClientStubCreate(),
  })

  state.setExportFormat("json-encrypted")
  state.setExportFilePassword("file-secret")
  state.setExportFilePasswordConfirm("file-secret")

  state.setExportScope("organization")
  await Promise.resolve()
  await Promise.resolve()

  expect(state.exportScope()).toBe("organization")
  expect(state.exportFormat()).toBe("json-decrypted")
  expect(state.exportFilePassword()).toBe("")
  expect(state.exportFormatOptions()).toEqual(["json-decrypted", "csv-decrypted"])
  expect(state.organizations()).toEqual([{ id: "org-1", name: "Engineering" }])
  expect(state.organizationId()).toBe("org-1")
  expect(state.isLoadingOrganizations()).toBe(false)
})

test("organization JSON export runs through the organization API and reports a summary", async () => {
  const successes: string[] = []
  const state = vaultImportExportCardStateCreate({
    session: sessionWithKeyCreate(),
    organizationApiClient: await organizationApiClientStubCreate(),
    onNotifySuccess: (m) => successes.push(m),
  })

  state.setExportScope("organization")
  await state.organizationsLoad()
  expect(state.canSubmitExport()).toBe(true)

  await state.handleExport(new Event("submit"))

  expect(state.exportValidationMessage()).toBeNull()
  expect(state.exportSummary()?.filename).toContain("organization_export")
  expect(successes.at(-1)).toContain("exported successfully")
  expect(state.canCopyExport()).toBe(true)
})

test("organization CSV import requires a selected organization and reports collection counts", async () => {
  const errors: string[] = []
  const state = vaultImportExportCardStateCreate({
    session: sessionWithKeyCreate(),
    organizationApiClient: await organizationApiClientStubCreate({
      organizationList: async () => resultCreate([]),
    }),
    onNotifyError: (m) => errors.push(m),
  })

  state.setImportScope("organization")
  await state.organizationsLoad()
  state.setImportFormat("csv")
  state.setImportContent(
    "collections,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\n",
  )
  expect(state.canSubmitImport()).toBe(false)

  await state.handleImport(new Event("submit"))
  expect(errors.at(-1)).toContain("Select an organization")

  const ready = vaultImportExportCardStateCreate({
    session: sessionWithKeyCreate(),
    organizationApiClient: await organizationApiClientStubCreate(),
  })
  ready.setImportScope("organization")
  await ready.organizationsLoad()
  ready.setImportFormat("csv")
  ready.setImportContent(
    "collections,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp\n" +
      "Shared,0,login,Example,,,0,https://example.com,user,pass,\n",
  )
  await ready.handleImport(new Event("submit"))
  expect(ready.importValidationMessage()).toBeNull()
  expect(ready.importSummary()?.cipherCount).toBe(1)
  expect(ready.importSummary()?.collectionCount).toBe(1)
  expect(ready.importSummary()?.warnings.length).toBeGreaterThan(0)
})

test("organization loading failures surface as busy-safe validation errors", async () => {
  const errors: string[] = []
  const state = vaultImportExportCardStateCreate({
    session: sessionWithKeyCreate(),
    organizationApiClient: await organizationApiClientStubCreate({
      organizationList: async () => resultErrorCreate("organizationList", "Organizations are unavailable."),
    }),
    onNotifyError: (m) => errors.push(m),
  })

  await state.organizationsLoad()

  expect(state.isLoadingOrganizations()).toBe(false)
  expect(state.organizations()).toEqual([])
  expect(state.organizationId()).toBeNull()
  expect(errors.at(-1)).toBe("Organizations are unavailable.")
})

test("zip export offers no clipboard action and personal formats stay available", () => {
  const state = vaultImportExportCardStateCreate({ session: sessionWithKeyCreate() })

  expect(state.exportFormatOptions()).toContain("zip")
  expect(state.exportFormatOptions()).toContain("json-account-encrypted")

  state.setExportFormat("zip")
  expect(state.canCopyExport()).toBe(false)
  expect(state.lastExportData()).toBeNull()
})
