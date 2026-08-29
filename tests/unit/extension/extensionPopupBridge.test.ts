import { expect, test } from "bun:test"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"
import { extensionClipboardAdapterCreate } from "../../../src/extension/clipboard/extensionClipboardAdapterCreate.js"
import type { ExtensionRuntimeMessage } from "../../../src/extension/messaging/extensionRuntimeMessageSchema.js"
import { extensionPopupCommandsCreate } from "../../../src/extension/popup/extensionPopupCommandsCreate.js"
import type { ExtensionPopupLogin } from "../../../src/extension/popup/ExtensionPopupLogin.js"
import type { ExtensionPopupViewModel } from "../../../src/extension/popup/ExtensionPopupViewModel.js"
import { extensionPopupViewModelCreate } from "../../../src/extension/popup/extensionPopupViewModelCreate.js"

const testLogin: ExtensionPopupLogin = {
  id: "cipher-1",
  name: "Example Service",
  username: "user@example.com",
  uri: "https://example.com",
  copyableFields: [
    { key: "username", label: "Username", value: "user@example.com" },
    { key: "password", label: "Password", value: "super-secret", sensitive: true },
  ],
}

test("popup commands send typed runtime messages for fill, sync, lock, logout, and open", async () => {
  const sentMessages: ExtensionRuntimeMessage[] = []
  let refreshCalls = 0

  const commands = extensionPopupCommandsCreate(
    {},
    {
      messageSend: async (msg) => {
        sentMessages.push(msg)
        return resultCreate(undefined)
      },
      onRefresh: async () => {
        refreshCalls += 1
      },
    },
  )

  commands.loginFill(testLogin)
  expect(sentMessages[0]).toEqual({ type: "loginFill", request: { loginId: "cipher-1" } })

  commands.vaultSync()
  expect(sentMessages[1]).toEqual({ type: "manualSync" })

  commands.vaultLock()
  expect(sentMessages[2]).toEqual({ type: "lock" })

  commands.vaultLogout()
  expect(sentMessages[3]).toEqual({ type: "logout" })

  commands.fullVaultOpen()
  expect(sentMessages[4]).toEqual({ type: "fullWindowOpen" })

  commands.loginAdd()
  expect(sentMessages[5]).toEqual({ type: "fullWindowOpen" })

  commands.accountLogin()
  expect(sentMessages[6]).toEqual({ type: "fullWindowOpen" })

  commands.vaultUnlock("secret123")
  expect(sentMessages[7]).toEqual({ type: "unlock", request: { password: "secret123" } })

  // Allow promises to resolve
  await new Promise((r) => setTimeout(r, 10))
  expect(refreshCalls).toBeGreaterThanOrEqual(4)
})

test("popup commands copy standard/custom fields to clipboard without exposing secret in model", async () => {
  let copiedText = ""
  let currentModel: ExtensionPopupViewModel = extensionPopupViewModelCreate()

  const clipboard = extensionClipboardAdapterCreate({
    writeText: async (text) => {
      copiedText = text
    },
  })

  const commands = extensionPopupCommandsCreate(
    {},
    {
      clipboard,
      onModelUpdate: (updater) => {
        currentModel = updater(currentModel)
      },
    },
  )

  const passwordField = testLogin.copyableFields[1]!
  commands.fieldCopy(testLogin, passwordField)

  await new Promise((r) => setTimeout(r, 10))

  expect(copiedText).toBe("super-secret")
  expect(currentModel.copiedFieldKey).toBe("password")
  // Verify sensitive value is not stored in error or popup model
  expect(currentModel.errorMessage).toBeNull()
})

test("popup commands handle unlock failure by updating model error and clearing busy", async () => {
  let currentModel: ExtensionPopupViewModel = extensionPopupViewModelCreate()

  const commands = extensionPopupCommandsCreate(
    {},
    {
      messageSend: async () => resultErrorCreate("extensionBackgroundRouter.unlock", "Invalid master password."),
      onModelUpdate: (updater) => {
        currentModel = updater(currentModel)
      },
    },
  )

  commands.vaultUnlock("wrong-password")
  await new Promise((r) => setTimeout(r, 10))

  expect(currentModel.busy).toBe(false)
  expect(currentModel.errorMessage).toBe("Invalid master password.")
})

test("popup command overrides take precedence over shared commands", () => {
  let overrideCalls = 0
  const commands = extensionPopupCommandsCreate({
    vaultSync: () => {
      overrideCalls += 1
    },
  })

  commands.vaultSync()

  expect(overrideCalls).toBe(1)
})
