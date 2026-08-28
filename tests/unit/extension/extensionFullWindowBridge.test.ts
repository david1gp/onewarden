import { expect, test } from "bun:test"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"
import { extensionClipboardAdapterCreate } from "../../../src/extension/clipboard/extensionClipboardAdapterCreate.js"
import type { ExtensionRuntimeMessage } from "../../../src/extension/messaging/extensionRuntimeMessageSchema.js"
import type { ExtensionCreateLoginRequest } from "../../../src/extension/create/extensionCreateLoginRequestSchema.js"
import { extensionFullWindowCommandsCreate } from "../../../src/extension/fullwindow/extensionFullWindowCommandsCreate.js"
import type { ExtensionFullWindowEnvironmentSettings } from "../../../src/extension/fullwindow/ExtensionFullWindowEnvironmentSettings.js"
import type { ExtensionFullWindowLogin } from "../../../src/extension/fullwindow/ExtensionFullWindowLogin.js"
import type { ExtensionFullWindowViewModel } from "../../../src/extension/fullwindow/ExtensionFullWindowViewModel.js"
import { extensionFullWindowViewModelCreate } from "../../../src/extension/fullwindow/extensionFullWindowViewModelCreate.js"
import { extensionFullWindowCreateStatus } from "../../../src/extension/fullwindow/ExtensionFullWindowCreateStatus.js"

const testLogin: ExtensionFullWindowLogin = {
  id: "cipher-2",
  name: "Bank Login",
  username: "bankuser",
  uri: "https://bank.example.com",
  copyableFields: [
    { key: "username", label: "Username", value: "bankuser" },
    { key: "password", label: "Password", value: "bank-pass", sensitive: true },
    { key: "custom:PIN", label: "PIN", value: "1234", sensitive: true },
  ],
}

const testCreateRequest: ExtensionCreateLoginRequest = {
  name: "New Entry",
  username: "user@test.org",
  password: "secure-pass-123",
  uris: [{ uri: "https://test.org", match: null }],
  notes: "sample note",
  favorite: false,
  folderId: null,
  fields: [{ name: "Security Question", value: "Answer", type: 0 }],
}

const testEnvSettings: ExtensionFullWindowEnvironmentSettings = {
  region: "selfHosted",
  base: "https://vaultwarden.local",
  webVault: "https://vaultwarden.local",
  api: "https://vaultwarden.local/api",
  identity: "https://vaultwarden.local/identity",
  icons: "https://vaultwarden.local/icons",
  notifications: "https://vaultwarden.local/notifications",
  events: "https://vaultwarden.local/events",
}

test("full-window commands send typed runtime messages for login creation and draft handling", async () => {
  const sentMessages: ExtensionRuntimeMessage[] = []
  let currentModel: ExtensionFullWindowViewModel = extensionFullWindowViewModelCreate()
  let refreshCalls = 0

  const commands = extensionFullWindowCommandsCreate(
    {},
    {
      messageSend: async (msg) => {
        sentMessages.push(msg)
        if (msg.type === "createLogin") {
          return resultCreate({ id: "created-cipher-id" })
        }
        return resultCreate(undefined)
      },
      onModelUpdate: (updater) => {
        currentModel = updater(currentModel)
      },
      onRefresh: async () => {
        refreshCalls += 1
      },
    },
  )

  commands.loginCreate(testCreateRequest)
  await new Promise((r) => setTimeout(r, 10))

  expect(sentMessages[0]).toEqual({ type: "createLogin", request: testCreateRequest })
  expect(currentModel.createStatus).toBe(extensionFullWindowCreateStatus.saved)
  expect(currentModel.createdLoginId).toBe("created-cipher-id")
  expect(refreshCalls).toBe(1)

  commands.loginDraftSave(testCreateRequest)
  expect(sentMessages[1]).toEqual({ type: "draftSave", request: testCreateRequest })

  commands.loginDraftDiscard("draft-123")
  expect(sentMessages[2]).toEqual({ type: "draftDiscard", request: "draft-123" })
})

test("full-window commands send typed runtime messages for environment save and credentials login", async () => {
  const sentMessages: ExtensionRuntimeMessage[] = []
  let currentModel: ExtensionFullWindowViewModel = extensionFullWindowViewModelCreate()
  let refreshCalls = 0

  const commands = extensionFullWindowCommandsCreate(
    {},
    {
      messageSend: async (msg) => {
        sentMessages.push(msg)
        return resultCreate(undefined)
      },
      onModelUpdate: (updater) => {
        currentModel = updater(currentModel)
      },
      onRefresh: async () => {
        refreshCalls += 1
      },
    },
  )

  commands.environmentSave(testEnvSettings)
  await new Promise((r) => setTimeout(r, 10))

  expect(sentMessages[0]).toEqual({ type: "environmentSave", request: testEnvSettings })
  expect(refreshCalls).toBe(1)
  expect(currentModel.busy).toBe(false)
  expect(currentModel.environmentSaveStatus).toBe("saved")

  commands.accountLogin({ email: "user@example.com", password: "mypassword" })
  await new Promise((r) => setTimeout(r, 10))

  expect(sentMessages[1]).toEqual({
    type: "login",
    request: { email: "user@example.com", password: "mypassword" },
  })
  expect(refreshCalls).toBe(2)
})

test("full-window commands copy fields using clipboard adapter and manage timeout feedback", async () => {
  let copiedText = ""
  let currentModel: ExtensionFullWindowViewModel = extensionFullWindowViewModelCreate()

  const clipboard = extensionClipboardAdapterCreate({
    writeText: async (text) => {
      copiedText = text
    },
  })

  const commands = extensionFullWindowCommandsCreate(
    {},
    {
      clipboard,
      onModelUpdate: (updater) => {
        currentModel = updater(currentModel)
      },
    },
  )

  const pinField = testLogin.copyableFields[2]!
  commands.fieldCopy(testLogin, pinField)
  await new Promise((r) => setTimeout(r, 10))

  expect(copiedText).toBe("1234")
  expect(currentModel.copiedFieldKey).toBe("custom:PIN")
})

test("full-window commands handle create failure gracefully", async () => {
  let currentModel: ExtensionFullWindowViewModel = extensionFullWindowViewModelCreate()

  const commands = extensionFullWindowCommandsCreate(
    {},
    {
      messageSend: async () => resultErrorCreate("extensionBackgroundRouter.createLogin", "Network timeout."),
      onModelUpdate: (updater) => {
        currentModel = updater(currentModel)
      },
    },
  )

  commands.loginCreate(testCreateRequest)
  await new Promise((r) => setTimeout(r, 10))

  expect(currentModel.createStatus).toBe(extensionFullWindowCreateStatus.error)
  expect(currentModel.errorMessage).toBe("Network timeout.")
})
