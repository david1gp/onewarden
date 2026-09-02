import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import type { ExtensionCipher } from "../../../src/extension/crypto/extensionCipherSchema.js"
import { ExtensionFullWindowView } from "../../../src/extension/fullwindow/ExtensionFullWindowView.jsx"
import { extensionFullWindowCommandsCreate } from "../../../src/extension/fullwindow/extensionFullWindowCommandsCreate.js"
import { extensionFullWindowViewModelCreate } from "../../../src/extension/fullwindow/extensionFullWindowViewModelCreate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { createSignalObject } from "../../../ui/utils/createSignalObject.js"

const openSshPrivateKeyBegin = "-----BEGIN " + "OPENSSH PRIVATE KEY-----"
const openSshPrivateKeyEnd = "-----END " + "OPENSSH PRIVATE KEY-----"

const sshKey: Extract<ExtensionCipher, { type: 5 }> = {
  object: "cipherDetails",
  id: "ssh-1",
  type: 5,
  creationDate: "2026-09-01T00:00:00.000Z",
  revisionDate: "2026-09-01T00:00:00.000Z",
  deletedDate: null,
  organizationId: null,
  folderId: null,
  name: "Production deploy key",
  notes: "Restricted",
  favorite: false,
  fields: [],
  sshKey: {
    privateKey: `${openSshPrivateKeyBegin}\nsecret\n${openSshPrivateKeyEnd}`,
    publicKey: "ssh-ed25519 AAAATEST deploy",
    keyFingerprint: "SHA256:abc123",
  },
}
const summary = {
  object: "cipherMini" as const,
  id: sshKey.id,
  type: 5 as const,
  revisionDate: sshKey.revisionDate,
  deletedDate: null,
  name: sshKey.name,
}

test("full-window SSH key detail masks, reveals, copies, and enforces permissions", () => {
  window.history.replaceState(null, "", "/?category=ssh-keys")
  const copied: Array<[string, string]> = []
  const root = render(() => (
    <ExtensionFullWindowView
      model={() =>
        extensionFullWindowViewModelCreate({
          status: "ready",
          sshKeys: [{ ...summary, edit: false, permissions: { delete: false } }],
          selectedSshKey: sshKey,
        })
      }
      commands={extensionFullWindowCommandsCreate({
        sshKeyRead: () => {},
        cipherFieldCopy: (key, value) => copied.push([key, value]),
      })}
    />
  ))
  fireEvent.click(root.getByRole("button", { name: "SSH keys" }))
  fireEvent.click(root.getByRole("button", { name: "Production deploy key" }))
  expect(root.container.textContent).not.toContain("BEGIN OPENSSH PRIVATE KEY")
  expect(root.getByText("SHA256:abc123")).toBeDefined()
  expect(root.getByText("ssh-ed25519 AAAATEST deploy")).toBeDefined()
  fireEvent.click(root.getByRole("button", { name: "Reveal private key" }))
  expect(root.container.textContent).toContain("BEGIN OPENSSH PRIVATE KEY")
  fireEvent.click(root.getByRole("button", { name: "Copy private key" }))
  expect(copied[0]).toEqual(["sshKey:ssh-1:privateKey", sshKey.sshKey.privateKey])
  expect((root.getByRole("button", { name: "Edit" }) as HTMLButtonElement).disabled).toBe(true)
  expect(root.getByText("You have view-only access to this item.")).toBeDefined()
  root.unmount()
})

test("full-window SSH key create validates fields and delete uses existing commands", () => {
  window.history.replaceState(null, "", "/?category=ssh-keys")
  const created: ExtensionCipher[] = []
  const deleted: string[] = []
  const root = render(() => (
    <ExtensionFullWindowView
      model={() => extensionFullWindowViewModelCreate({ status: "ready", sshKeys: [summary], selectedSshKey: sshKey })}
      commands={extensionFullWindowCommandsCreate({
        sshKeyRead: () => {},
        sshKeyCreate: (cipher) => created.push(cipher),
        sshKeyDelete: (id) => deleted.push(id),
      })}
    />
  ))
  fireEvent.click(root.getByRole("button", { name: "SSH keys" }))
  fireEvent.click(root.getByRole("button", { name: "New SSH key" }))
  fireEvent.click(root.getByRole("button", { name: "Save SSH key" }))
  expect(root.getByRole("alert").textContent).toContain("Name is required")
  fireEvent.input(root.getByLabelText("Name"), { target: { value: "Build key" } })
  fireEvent.input(root.getByLabelText("Private key"), { target: { value: "private" } })
  fireEvent.input(root.getByLabelText("Public key"), { target: { value: "invalid" } })
  fireEvent.input(root.getByLabelText("Fingerprint"), { target: { value: "SHA256:def" } })
  fireEvent.click(root.getByRole("button", { name: "Save SSH key" }))
  expect(root.getByRole("alert").textContent).toContain("key type")
  fireEvent.input(root.getByLabelText("Public key"), { target: { value: "ssh-ed25519 AAAA" } })
  fireEvent.click(root.getByRole("button", { name: "Save SSH key" }))
  expect(created[0]).toMatchObject({ type: 5, name: "Build key", sshKey: { keyFingerprint: "SHA256:def" } })
  fireEvent.click(root.getByRole("button", { name: "Production deploy key" }))
  fireEvent.click(root.getByRole("button", { name: "Delete" }))
  fireEvent.click(root.getByRole("button", { name: "Move to trash" }))
  expect(deleted).toEqual(["ssh-1"])
  root.unmount()
})

test("full-window SSH commands use type-5 search, detail, CRUD and state", async () => {
  const sent: unknown[] = []
  const model = createSignalObject(extensionFullWindowViewModelCreate({ status: "ready" }))
  const commands = extensionFullWindowCommandsCreate(
    {},
    {
      messageSend: async (message) => {
        sent.push(message)
        if (message.type === "vaultSearch") return resultCreate({ ciphers: [summary], folders: [], collections: [] })
        if (message.type === "cipherDetailRead") return resultCreate(sshKey)
        return resultCreate(undefined)
      },
      onModelUpdate: (update) => model.set(update(model.get())),
    },
  )
  commands.sshKeysLoad()
  commands.sshKeyRead("ssh-1")
  commands.sshKeyCreate(sshKey)
  commands.sshKeyUpdate("ssh-1", sshKey)
  commands.sshKeyDelete("ssh-1")
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(sent).toContainEqual({
    type: "vaultSearch",
    request: { query: "", type: 5, includeDeleted: false, includeArchived: false },
  })
  expect(sent).toContainEqual({ type: "cipherDetailRead", request: { cipherId: "ssh-1" } })
  expect(sent).toContainEqual({ type: "cipherUpdate", request: { cipherId: "ssh-1", cipher: sshKey } })
  expect(sent).toContainEqual({ type: "cipherDelete", request: { cipherId: "ssh-1", hard: false } })
})

test("full-window SSH keys expose loading, error, and empty states", () => {
  window.history.replaceState(null, "", "/?category=ssh-keys")
  const root = render(() => (
    <ExtensionFullWindowView
      model={() =>
        extensionFullWindowViewModelCreate({
          status: "ready",
          sshKeysLoading: true,
          errorMessage: "SSH search failed.",
        })
      }
      commands={extensionFullWindowCommandsCreate()}
    />
  ))
  fireEvent.click(root.getByRole("button", { name: "SSH keys" }))
  expect(root.getByRole("status", { name: "Loading SSH keys" })).toBeDefined()
  expect(root.getByRole("alert").textContent).toContain("SSH search failed")
  root.unmount()
  const empty = render(() => (
    <ExtensionFullWindowView
      model={() => extensionFullWindowViewModelCreate({ status: "ready" })}
      commands={extensionFullWindowCommandsCreate()}
    />
  ))
  fireEvent.click(empty.getByRole("button", { name: "SSH keys" }))
  expect(empty.getByText("No SSH keys yet.")).toBeDefined()
  empty.unmount()
})
