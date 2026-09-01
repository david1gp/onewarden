import { expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import type { ExtensionCipher } from "../../../src/extension/crypto/extensionCipherSchema.js"
import { ExtensionFullWindowView } from "../../../src/extension/fullwindow/ExtensionFullWindowView.jsx"
import { extensionFullWindowCommandsCreate } from "../../../src/extension/fullwindow/extensionFullWindowCommandsCreate.js"
import { extensionFullWindowViewModelCreate } from "../../../src/extension/fullwindow/extensionFullWindowViewModelCreate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { createSignalObject } from "../../../ui/utils/createSignalObject.js"

const card: Extract<ExtensionCipher, { type: 3 }> = {
  object: "cipherDetails",
  id: "card-1",
  type: 3,
  creationDate: "2026-09-01T00:00:00.000Z",
  revisionDate: "2026-09-01T00:00:00.000Z",
  deletedDate: null,
  organizationId: null,
  folderId: null,
  name: "Travel card",
  notes: "Use abroad",
  favorite: false,
  fields: [],
  card: {
    cardholderName: "Ada Lovelace",
    brand: "Visa",
    number: "4111111111111111",
    expMonth: "3",
    expYear: "2030",
    code: "123",
  },
}

const identity: Extract<ExtensionCipher, { type: 4 }> = {
  object: "cipherDetails",
  id: "identity-1",
  type: 4,
  creationDate: "2026-09-01T00:00:00.000Z",
  revisionDate: "2026-09-01T00:00:00.000Z",
  deletedDate: null,
  organizationId: null,
  folderId: null,
  name: "Ada personal",
  notes: null,
  favorite: false,
  fields: [],
  identity: {
    title: "Dr",
    firstName: "Ada",
    middleName: null,
    lastName: "Lovelace",
    company: "Analytical Engines",
    email: "ada@example.test",
    phone: "+44 20 0000 0000",
    address1: "1 Engine Way",
    city: "London",
    postalCode: "N1 1AA",
    country: "United Kingdom",
    ssn: "123-45-6789",
    passportNumber: "P1234567",
    licenseNumber: "DL-42",
  },
}

const summary = (cipher: ExtensionCipher) => ({
  object: "cipherMini" as const,
  id: cipher.id,
  type: cipher.type,
  revisionDate: cipher.revisionDate,
  deletedDate: null,
  name: cipher.name,
})

test("full-window cards mask, reveal and copy sensitive details and support edit validation", () => {
  window.history.replaceState(null, "", "/?category=cards")
  const copied: Array<[string, string]> = []
  const updated: ExtensionCipher[] = []
  const filled: Array<[string, 3 | 4]> = []
  const root = render(() => (
    <ExtensionFullWindowView
      model={() =>
        extensionFullWindowViewModelCreate({
          status: "ready",
          cards: [summary(card)],
          selectedCard: card,
          fillAvailable: true,
        })
      }
      commands={extensionFullWindowCommandsCreate({
        cardRead: () => {},
        cardUpdate: (_id, cipher) => updated.push(cipher),
        cipherFieldCopy: (key, value) => copied.push([key, value]),
        cipherFill: (id, type) => filled.push([id, type]),
      })}
    />
  ))

  fireEvent.click(root.getByRole("button", { name: "Cards" }))
  fireEvent.click(root.getByRole("button", { name: "Travel card" }))
  expect(root.container.textContent).not.toContain("4111111111111111")
  expect(root.container.textContent).not.toContain("123-45-6789")
  expect(root.getByText("••••••••••••••••")).toBeDefined()
  fireEvent.click(root.getByRole("button", { name: "Reveal number" }))
  expect(root.getByText("4111111111111111")).toBeDefined()
  expect(root.getByText("03 / 2030")).toBeDefined()
  fireEvent.click(root.getByRole("button", { name: "Fill" }))
  expect(filled).toEqual([["card-1", 3]])
  fireEvent.click(root.getByRole("button", { name: "Copy number" }))
  expect(copied).toEqual([["card:card-1:number", "4111111111111111"]])

  fireEvent.click(root.getByRole("button", { name: "Edit" }))
  fireEvent.input(root.getByLabelText("Expiration month"), { target: { value: "13" } })
  fireEvent.click(root.getByRole("button", { name: "Save changes" }))
  expect(root.getByRole("alert").textContent).toContain("between 1 and 12")
  fireEvent.input(root.getByLabelText("Expiration month"), { target: { value: "12" } })
  fireEvent.click(root.getByRole("button", { name: "Save changes" }))
  expect(updated[0]).toMatchObject({ type: 3, name: "Travel card", card: { expMonth: "12" } })
  root.unmount()
})

test("full-window card create requires a name and creates a type-specific cipher", () => {
  window.history.replaceState(null, "", "/?category=cards")
  const created: ExtensionCipher[] = []
  const root = render(() => (
    <ExtensionFullWindowView
      model={() => extensionFullWindowViewModelCreate({ status: "ready" })}
      commands={extensionFullWindowCommandsCreate({ cardCreate: (cipher) => created.push(cipher) })}
    />
  ))

  fireEvent.click(root.getByRole("button", { name: "Cards" }))
  fireEvent.click(root.getByRole("button", { name: "New card" }))
  fireEvent.click(root.getByRole("button", { name: "Save card" }))
  expect(root.getByRole("alert").textContent).toContain("Name is required")
  fireEvent.input(root.getByLabelText("Name"), { target: { value: "Business card" } })
  fireEvent.input(root.getByLabelText("Card number"), { target: { value: "5555555555554444" } })
  fireEvent.click(root.getByRole("button", { name: "Save card" }))
  expect(created[0]).toMatchObject({ type: 3, name: "Business card", card: { number: "5555555555554444" } })
  root.unmount()
})

test("full-window identities use useful sections, mask identification, enforce read-only access and keyboard close", () => {
  window.history.replaceState(null, "", "/?category=identities")
  const copied: Array<[string, string]> = []
  const filled: Array<[string, 3 | 4]> = []
  const root = render(() => (
    <ExtensionFullWindowView
      model={() =>
        extensionFullWindowViewModelCreate({
          status: "ready",
          identities: [{ ...summary(identity), edit: false, permissions: { delete: false } }],
          selectedIdentity: identity,
          fillAvailable: true,
        })
      }
      commands={extensionFullWindowCommandsCreate({
        identityRead: () => {},
        cipherFieldCopy: (key, value) => copied.push([key, value]),
        cipherFill: (id, type) => filled.push([id, type]),
      })}
    />
  ))

  fireEvent.click(root.getByRole("button", { name: "Identities" }))
  fireEvent.click(root.getByRole("button", { name: "Ada personal" }))
  expect(root.getByRole("region", { name: "Personal information" }).textContent).toContain("Dr Ada Lovelace")
  expect(root.getByRole("region", { name: "Address" }).textContent).toContain("1 Engine Way")
  expect(root.container.textContent).not.toContain("123-45-6789")
  fireEvent.click(root.getByRole("button", { name: "Reveal Social security number" }))
  expect(root.getByText("123-45-6789")).toBeDefined()
  fireEvent.click(root.getByRole("button", { name: "Copy Social security number" }))
  expect(copied).toEqual([["identity:identity-1:ssn", "123-45-6789"]])
  expect(root.getByText("You have view-only access to this item.")).toBeDefined()
  fireEvent.click(root.getByRole("button", { name: "Fill" }))
  expect(filled).toEqual([["identity-1", 4]])
  expect((root.getByRole("button", { name: "Edit" }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.keyDown(window, { key: "Escape" })
  expect(root.getByText("Select an identity to see its details.")).toBeDefined()
  root.unmount()
})

test("full-window identity create validates email and delete uses soft-delete command", () => {
  window.history.replaceState(null, "", "/?category=identities")
  const created: ExtensionCipher[] = []
  const deleted: string[] = []
  const model = createSignalObject(
    extensionFullWindowViewModelCreate({
      status: "ready",
      identities: [summary(identity)],
      selectedIdentity: identity,
    }),
  )
  const root = render(() => (
    <ExtensionFullWindowView
      model={model.get}
      commands={extensionFullWindowCommandsCreate({
        identityRead: () => {},
        identityCreate: (cipher) => created.push(cipher),
        identityDelete: (id) => deleted.push(id),
      })}
    />
  ))

  fireEvent.click(root.getByRole("button", { name: "Identities" }))
  fireEvent.click(root.getByRole("button", { name: "New identity" }))
  fireEvent.input(root.getByLabelText("Name"), { target: { value: "Work identity" } })
  fireEvent.input(root.getByLabelText("Email"), { target: { value: "invalid" } })
  fireEvent.click(root.getByRole("button", { name: "Save identity" }))
  expect(root.getByRole("alert").textContent).toContain("valid email")
  fireEvent.input(root.getByLabelText("Email"), { target: { value: "work@example.test" } })
  fireEvent.click(root.getByRole("button", { name: "Save identity" }))
  expect(created[0]).toMatchObject({ type: 4, name: "Work identity", identity: { email: "work@example.test" } })

  fireEvent.click(root.getByRole("button", { name: "Ada personal" }))
  fireEvent.click(root.getByRole("button", { name: "Delete" }))
  fireEvent.click(root.getByRole("button", { name: "Move to trash" }))
  expect(deleted).toEqual(["identity-1"])
  root.unmount()
})

test("full-window cards and identities expose loading, empty and error states", () => {
  window.history.replaceState(null, "", "/")
  const loading = render(() => (
    <ExtensionFullWindowView
      model={() => extensionFullWindowViewModelCreate({ status: "ready", cardsLoading: true })}
      commands={extensionFullWindowCommandsCreate()}
    />
  ))
  fireEvent.click(loading.getByRole("button", { name: "Cards" }))
  expect(loading.getByRole("status", { name: "Loading cards" })).toBeDefined()
  loading.unmount()

  const failed = render(() => (
    <ExtensionFullWindowView
      model={() => extensionFullWindowViewModelCreate({ status: "ready", errorMessage: "Identity search failed." })}
      commands={extensionFullWindowCommandsCreate()}
    />
  ))
  fireEvent.click(failed.getByRole("button", { name: "Identities" }))
  expect(failed.getByRole("alert").textContent).toContain("Identity search failed")
  expect(failed.getByText("No identities yet.")).toBeDefined()
  failed.unmount()
})

test("full-window card and identity commands consume background search, detail and CRUD messages", async () => {
  const sent: unknown[] = []
  const model = createSignalObject(extensionFullWindowViewModelCreate({ status: "ready" }))
  const commands = extensionFullWindowCommandsCreate(
    {},
    {
      messageSend: async (message) => {
        sent.push(message)
        if (message.type === "vaultSearch") return resultCreate({ ciphers: [], folders: [], collections: [] })
        if (message.type === "cipherDetailRead")
          return resultCreate(message.request.cipherId === card.id ? card : identity)
        return resultCreate(undefined)
      },
      onModelUpdate: (update) => model.set(update(model.get())),
    },
  )
  commands.cardsLoad()
  commands.identitiesLoad()
  commands.cardRead(card.id)
  commands.identityRead(identity.id)
  commands.cardCreate(card)
  commands.cardUpdate(card.id, card)
  commands.cardDelete(card.id)
  commands.identityCreate(identity)
  commands.identityUpdate(identity.id, identity)
  commands.identityDelete(identity.id)
  await new Promise((resolve) => setTimeout(resolve, 0))

  expect(sent).toContainEqual({
    type: "vaultSearch",
    request: { query: "", type: 3, includeDeleted: false, includeArchived: false },
  })
  expect(sent).toContainEqual({
    type: "vaultSearch",
    request: { query: "", type: 4, includeDeleted: false, includeArchived: false },
  })
  expect(sent).toContainEqual({ type: "cipherDetailRead", request: { cipherId: "card-1" } })
  expect(sent).toContainEqual({ type: "cipherUpdate", request: { cipherId: "identity-1", cipher: identity } })
  expect(sent).toContainEqual({ type: "cipherDelete", request: { cipherId: "card-1", hard: false } })
})
