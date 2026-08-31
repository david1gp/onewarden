import { fireEvent, render } from "@solidjs/testing-library"
import { expect, test } from "bun:test"
import { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import { webAuthStorageCreate } from "../../../src/web/auth/model/webAuthStorageCreate.js"
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

test("export tab offers three formats with confirmation and loss warnings", () => {
  const { container, unmount } = render(() => <VaultImportExportCard session={sessionCreate()} />)

  fireEvent.click(buttonFind(container, "Export Vault"))

  expect(container.textContent).toContain("Unencrypted JSON (.json)")
  expect(container.textContent).toContain("Unencrypted CSV (.csv)")
  expect(container.textContent).toContain("Password-protected JSON (.json)")
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
