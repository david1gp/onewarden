import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import type { ExtensionCipher } from "../../../src/extension/crypto/extensionCipherSchema.js"
import { ExtensionFullWindowCipherExtras } from "../../../src/extension/fullwindow/ExtensionFullWindowCipherExtras.jsx"
import { extensionFullWindowCommandsCreate } from "../../../src/extension/fullwindow/extensionFullWindowCommandsCreate.js"
import { extensionFullWindowViewModelCreate } from "../../../src/extension/fullwindow/extensionFullWindowViewModelCreate.js"
import type { ExtensionRuntimeMessage } from "../../../src/extension/messaging/extensionRuntimeMessageSchema.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { createSignalObject } from "../../../ui/utils/createSignalObject.js"

const login: Extract<ExtensionCipher, { type: 1 }> = {
  object: "cipherDetails",
  id: "login-1",
  type: 1,
  creationDate: "2026-09-01T00:00:00.000Z",
  revisionDate: "2026-09-01T00:00:00.000Z",
  deletedDate: null,
  organizationId: null,
  folderId: null,
  name: "Example",
  notes: null,
  fields: [],
  login: { username: "user", password: "current-password", uris: [], totp: null },
  attachments: [{ id: "attachment-1", fileName: "receipt.pdf", key: "attachment-key", size: "2048" }],
  passwordHistory: [{ password: "past-password", lastUsedDate: "2026-08-01T00:00:00.000Z" }],
}

test("ExtensionFullWindowCipherExtras exposes accessible attachment and password-history actions", async () => {
  const actions: string[] = []
  const model = createSignalObject(extensionFullWindowViewModelCreate({ status: "ready" }))
  const commands = extensionFullWindowCommandsCreate({
    attachmentDownload: () => {
      actions.push("download")
    },
    attachmentDelete: () => {
      actions.push("delete")
    },
    passwordHistoryRestore: () => {
      actions.push("restore")
    },
    cipherFieldCopy: () => {
      actions.push("copy")
    },
  })
  const view = render(() => (
    <ExtensionFullWindowCipherExtras cipher={() => login} model={model.get} commands={commands} />
  ))

  expect(view.getByText("Attachments (1)")).toBeTruthy()
  expect(view.getByText("Password history (1)")).toBeTruthy()
  expect(view.getByText("••••••••••••")).toBeTruthy()
  await fireEvent.click(view.getByRole("button", { name: "Reveal past password" }))
  expect(view.getByText("past-password")).toBeTruthy()
  await fireEvent.click(view.getByRole("button", { name: "Copy past password" }))
  await fireEvent.click(view.getByRole("button", { name: "Download attachment receipt.pdf" }))
  await fireEvent.click(view.getByRole("button", { name: "Delete attachment receipt.pdf" }))
  expect(view.getByRole("alertdialog", { name: "Delete attachment?" })).toBeTruthy()
  await fireEvent.click(view.getByRole("button", { name: "Delete", hidden: false }))
  await fireEvent.click(view.getByRole("button", { name: "Restore" }))
  expect(view.getByRole("alertdialog", { name: "Restore this password?" })).toBeTruthy()
  await fireEvent.click(view.getByRole("button", { name: "Restore password" }))
  expect(actions).toEqual(["copy", "download", "delete", "restore"])
})

test("passwordHistoryRestore preserves history semantics and sends an atomic cipher update", async () => {
  const messages: ExtensionRuntimeMessage[] = []
  const model = createSignalObject(extensionFullWindowViewModelCreate({ status: "ready", selectedLoginCipher: login }))
  const commands = extensionFullWindowCommandsCreate(
    {},
    {
      messageSend: async (message) => {
        messages.push(message)
        if (message.type === "cipherUpdate") return resultCreate(message.request.cipher)
        return resultCreate(login)
      },
      onModelUpdate: (update) => model.set(update(model.get())),
      onRefresh: async () => {},
    },
  )

  const historicalPassword = login.passwordHistory?.[0]
  if (historicalPassword === undefined) throw new Error("Password history fixture is missing.")
  commands.passwordHistoryRestore(login, historicalPassword)
  await new Promise((resolve) => setTimeout(resolve, 0))
  const update = messages.find((message) => message.type === "cipherUpdate")
  expect(update?.type).toBe("cipherUpdate")
  if (update?.type !== "cipherUpdate" || update.request.cipher.type !== 1) return
  expect(update.request.cipher.login.password).toBe("past-password")
  expect(update.request.cipher.passwordHistory?.map((entry) => entry.password)).toEqual(["current-password"])
  expect(messages.some((message) => message.type === "cipherDetailRead")).toBe(true)
})
