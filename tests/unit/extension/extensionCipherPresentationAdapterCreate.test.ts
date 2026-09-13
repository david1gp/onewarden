import { expect, test } from "bun:test"
import type { Result } from "#result"
import type { ExtensionCipher } from "../../../src/extension/crypto/extensionCipherSchema.js"
import type { ExtensionRuntimeMessage } from "../../../src/extension/messaging/extensionRuntimeMessageSchema.js"
import { extensionCipherPresentationAdapterCreate } from "../../../src/extension/fullwindow/extensionCipherPresentationAdapterCreate.js"
import { cipherItemFromDemo } from "../../../src/web/ciphers/model/cipherItemFromDemo.js"
import { cipherItemFromWire } from "../../../src/web/ciphers/model/cipherItemFromWire.js"
import type { CipherItem } from "../../../src/web/ciphers/schemas/cipherItemSchema.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"

const fullCipher: ExtensionCipher = {
  object: "cipherDetails",
  id: "login-1",
  type: 1,
  creationDate: "2026-01-01T00:00:00.000Z",
  revisionDate: "2026-01-02T00:00:00.000Z",
  deletedDate: null,
  archivedDate: null,
  organizationId: null,
  folderId: null,
  name: "Example Mail",
  notes: "Recovery note",
  favorite: false,
  collectionIds: [],
  edit: true,
  viewPassword: true,
  permissions: { read: true, delete: true, restore: true },
  reprompt: 0,
  fields: [{ name: "Username", value: "ada@example.com", type: 0, linkedId: null }],
  attachments: null,
  passwordHistory: null,
  login: {
    username: "ada@example.com",
    password: "s3cret",
    uri: "https://example.com/login",
    uris: [{ uri: "https://example.com/login", match: null }],
    totp: null,
    fido2Credentials: null,
  },
}

const typeSpecificCiphers: ExtensionCipher[] = [
  {
    ...fullCipher,
    id: "note-1",
    type: 2,
    name: "Recovery note",
    notes: "Backup codes",
    login: undefined,
    secureNote: { type: 0 },
  },
  {
    ...fullCipher,
    id: "card-1",
    type: 3,
    name: "Travel card",
    notes: "Use abroad",
    login: undefined,
    card: {
      cardholderName: "Ada Lovelace",
      brand: "Visa",
      number: "4111111111111111",
      expMonth: "03",
      expYear: "2030",
      code: "123",
    },
  },
  {
    ...fullCipher,
    id: "identity-1",
    type: 4,
    name: "Ada personal",
    login: undefined,
    identity: {
      title: "Dr",
      firstName: "Ada",
      middleName: null,
      lastName: "Lovelace",
      company: "Analytical Engines",
      email: "ada@example.test",
      phone: "+44 20 0000 0000",
      address1: "1 Engine Way",
      address2: null,
      address3: null,
      city: "London",
      state: null,
      postalCode: "N1 1AA",
      country: "United Kingdom",
      ssn: "123-45-6789",
      username: null,
      passportNumber: "P1234567",
      licenseNumber: "DL-42",
    },
  },
  {
    ...fullCipher,
    id: "ssh-1",
    type: 5,
    name: "Deploy key",
    login: undefined,
    sshKey: {
      privateKey: "private-key",
      publicKey: "ssh-ed25519 AAAA",
      keyFingerprint: "SHA256:abc",
    },
  },
]

const summary = {
  object: "cipherMini" as const,
  id: fullCipher.id,
  type: 1 as const,
  creationDate: fullCipher.creationDate,
  revisionDate: fullCipher.revisionDate,
  deletedDate: null,
  archivedDate: null,
  organizationId: null,
  folderId: null,
  name: fullCipher.name,
  favorite: false,
  collectionIds: [],
  edit: true,
  viewPassword: true,
  permissions: { delete: true, restore: true },
}

function adapterFixture() {
  const messages: ExtensionRuntimeMessage[] = []
  const copied: string[] = []
  const messageSend = async <T = unknown>(message: ExtensionRuntimeMessage): Promise<Result<T>> => {
    messages.push(message)
    const data = (() => {
      if (message.type === "vaultSearch") return { ciphers: [summary], folders: [], collections: [] }
      if (message.type === "cipherDetailRead") {
        return typeSpecificCiphers.find((cipher) => cipher.id === message.request.cipherId) ?? fullCipher
      }
      if (message.type === "cipherCreate" || message.type === "cipherUpdate") return message.request.cipher
      return fullCipher
    })()
    return resultCreate(data) as Result<T>
  }
  return {
    adapter: extensionCipherPresentationAdapterCreate({
      messageSend,
      clipboard: {
        copyText: async (value) => {
          copied.push(value)
          return resultCreate(undefined)
        },
      },
    }),
    messages,
    copied,
  }
}

test("extensionCipherPresentationAdapterCreate translates extension runtime operations", async () => {
  const fixture = adapterFixture()
  const list = await fixture.adapter.list()
  expect(list.success).toBe(true)
  if (list.success) expect(list.data[0]?.login?.username).toBeUndefined()

  const detail = await fixture.adapter.get(fullCipher.id)
  expect(detail.success).toBe(true)
  if (detail.success) expect(detail.data.login?.username).toBe("ada@example.com")

  const item = cipherItemFromDemo({
    id: fullCipher.id,
    title: fullCipher.name,
    category: "login",
    vault: "My Vault",
    ownership: "personal",
    organizationId: null,
    folderId: null,
    collectionIds: [],
    username: "ada@example.com",
    password: "s3cret",
    url: "https://example.com/login",
    favorite: false,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-02",
  })
  await fixture.adapter.create(item)
  await fixture.adapter.update(item.id, item)
  await fixture.adapter.favorite(item.id, true)
  await fixture.adapter.softDelete(item.id)
  await fixture.adapter.restore(item.id)
  await fixture.adapter.archive(item.id, true)
  await fixture.adapter.updateCollections(item.id, ["collection-1"])
  await fixture.adapter.uploadAttachment(item.id, new Blob(["hello"]), "hello.txt")
  await fixture.adapter.deleteAttachment(item.id, "attachment-1")
  await fixture.adapter.clone(item.id)
  await fixture.adapter.copyToClipboard("copied value")

  expect(fixture.copied).toEqual(["copied value"])
  expect(fixture.messages.map((message) => message.type)).toEqual([
    "vaultSearch",
    "cipherDetailRead",
    "cipherCreate",
    "cipherUpdate",
    "cipherPartial",
    "cipherDelete",
    "cipherRestore",
    "cipherArchive",
    "cipherCollectionsUpdate",
    "attachmentUpload",
    "attachmentDelete",
    "cipherCreate",
  ])
  expect(fixture.messages.find((message) => message.type === "attachmentUpload")).toEqual({
    type: "attachmentUpload",
    request: { cipherId: item.id, fileName: "hello.txt", dataBase64: "aGVsbG8=" },
  })
})

test("extensionCipherPresentationAdapterCreate reports unsupported personal-cipher sharing", async () => {
  const fixture = adapterFixture()
  const result = await fixture.adapter.share(fullCipher.id, "organization-1", [], fullCipher as unknown as CipherItem)

  expect(result.success).toBe(false)
  if (!result.success) expect(result.errorMessage).toContain("not available")
  expect(fixture.messages).toHaveLength(0)
})

test("extensionCipherPresentationAdapterCreate preserves every type-specific payload on create and update", async () => {
  const fixture = adapterFixture()

  for (const cipher of typeSpecificCiphers) {
    const item = cipherItemFromWire(cipher as unknown as Record<string, unknown>)
    await fixture.adapter.create(item)
    await fixture.adapter.update(item.id, item)
  }

  const mutations = fixture.messages.filter(
    (message): message is Extract<ExtensionRuntimeMessage, { type: "cipherCreate" | "cipherUpdate" }> =>
      message.type === "cipherCreate" || message.type === "cipherUpdate",
  )
  expect(mutations).toHaveLength(typeSpecificCiphers.length * 2)

  for (const cipher of typeSpecificCiphers) {
    const item = cipherItemFromWire(cipher as unknown as Record<string, unknown>)
    const requests = mutations.filter((message) => message.request.cipher.id === cipher.id)
    expect(requests).toHaveLength(2)
    expect(requests[0]?.request.cipher).toMatchObject({
      id: cipher.id,
      type: cipher.type,
      name: cipher.name,
      notes: cipher.notes,
      fields: cipher.fields,
    })
    if (cipher.type === 2) expect(requests[0]?.request.cipher.secureNote).toEqual(cipher.secureNote)
    if (cipher.type === 3) expect(requests[0]?.request.cipher.card).toEqual(cipher.card)
    if (cipher.type === 4) expect(requests[0]?.request.cipher.identity).toEqual(cipher.identity)
    if (cipher.type === 5) expect(requests[0]?.request.cipher.sshKey).toEqual(cipher.sshKey)
    expect(item.type).toBe(cipher.type)
  }
})
