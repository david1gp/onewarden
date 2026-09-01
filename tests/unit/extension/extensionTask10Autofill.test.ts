import { expect, test } from "bun:test"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { extensionAutofillBackgroundPortsCreate } from "../../../src/extension/autofill/extensionAutofillBackgroundPortsCreate.js"
import { extensionAutofillControlsFill } from "../../../src/extension/autofill/extensionAutofillControlsFill.js"
import { extensionAutofillFillValuesCreate } from "../../../src/extension/autofill/extensionAutofillFillValuesCreate.js"
import { extensionAutofillPortName } from "../../../src/extension/autofill/extensionAutofillPortName.js"
import type { ExtensionCipher } from "../../../src/extension/crypto/extensionCipherSchema.js"
import { extensionCipherFillInjected } from "../../../src/extension/fill/extensionCipherFillInjected.js"

function eventCreate<T extends (...args: never[]) => void>() {
  const listeners: T[] = []
  return {
    addListener: (listener: T) => listeners.push(listener),
    emit: (...args: Parameters<T>) => {
      for (const listener of listeners) listener(...args)
    },
  }
}

function cipherCreate(type: 1 | 3 | 4, id: string): ExtensionCipher {
  const common = {
    object: "cipher" as const,
    id,
    type,
    revisionDate: "2026-09-01T00:00:00.000Z",
    deletedDate: null,
    name: `${type}-${id}`,
    notes: null,
    fields: [],
  }
  if (type === 1) {
    return {
      ...common,
      type,
      login: {
        username: "person@example.test",
        password: "login-secret",
        uri: "https://shop.example.test/login",
        uris: [{ uri: "https://shop.example.test", match: 1 }],
        totp: null,
      },
    }
  }
  if (type === 3) {
    return {
      ...common,
      type,
      edit: false,
      card: { brand: "Visa", number: "4111111111111111", expMonth: "09", expYear: "2030", code: "123" },
    }
  }
  return {
    ...common,
    type,
    identity: { firstName: "Ada", lastName: "Lovelace", email: "ada@example.test", ssn: "111-22-3333" },
  }
}

test("type-specific DOM fill stays in the focused dynamic form and emits input/change", () => {
  document.body.innerHTML = `<form id="first"><input autocomplete="cc-number"><input autocomplete="cc-csc"></form><form id="other"><input autocomplete="cc-number"></form>`
  const first = document.querySelector("#first") as HTMLFormElement
  const number = first.querySelector("[autocomplete='cc-number']") as HTMLInputElement
  const code = first.querySelector("[autocomplete='cc-csc']") as HTMLInputElement
  const other = document.querySelector("#other input") as HTMLInputElement
  const dynamic = document.createElement("input")
  dynamic.autocomplete = "cc-exp-month"
  first.append(dynamic)
  const events: string[] = []
  number.addEventListener("input", () => events.push("input"))
  number.addEventListener("change", () => events.push("change"))
  const fields = new Map([
    ["number", number],
    ["code", code],
    ["other", other],
    ["dynamic", dynamic],
  ])
  const kinds = new Map([
    ["number", "cardNumber" as const],
    ["code", "cardSecurityCode" as const],
    ["other", "cardNumber" as const],
    ["dynamic", "cardExpirationMonth" as const],
  ])

  const count = extensionAutofillControlsFill(
    fields,
    kinds,
    "number",
    extensionAutofillFillValuesCreate(cipherCreate(3, "card")),
  )

  expect(count).toBe(3)
  expect(number.value).toBe("4111111111111111")
  expect(code.value).toBe("123")
  expect(dynamic.value).toBe("09")
  expect(other.value).toBe("")
  expect(events).toEqual(["input", "change"])
})

test("manual identity fill classifies page controls and dispatches native-like events", () => {
  document.body.innerHTML = `<form><input autocomplete="given-name"><input autocomplete="family-name"><input autocomplete="email"></form>`
  const email = document.querySelector("[autocomplete='email']") as HTMLInputElement
  const events: string[] = []
  email.addEventListener("input", () => events.push("input"))
  email.addEventListener("change", () => events.push("change"))

  const result = extensionCipherFillInjected(extensionAutofillFillValuesCreate(cipherCreate(4, "identity")))

  expect(result.success).toBe(true)
  expect((document.querySelector("[autocomplete='given-name']") as HTMLInputElement).value).toBe("Ada")
  expect((document.querySelector("[autocomplete='family-name']") as HTMLInputElement).value).toBe("Lovelace")
  expect(email.value).toBe("ada@example.test")
  expect(events).toEqual(["input", "change"])
})

test("explicit iframe selection receives summaries first and guarded secrets only after selection", async () => {
  type TestPort = {
    name: string
    sender: { tab: { id: number }; frameId: number; url: string }
    postMessage: (message: unknown) => void
    disconnect: () => void
    onMessage: ReturnType<typeof eventCreate<(message: unknown) => void>>
    onDisconnect: ReturnType<typeof eventCreate<() => void>>
  }
  type CandidateMessage = { type: string; candidates: unknown[] }
  type FillMessage = { type: string; values: Array<{ kind: string; value: string }> }
  const onConnect = eventCreate<(port: TestPort) => void>()
  const messages: unknown[] = []
  const onMessage = eventCreate<(message: unknown) => void>()
  const onDisconnect = eventCreate<() => void>()
  const card = cipherCreate(3, "card-1")
  let detailReads = 0
  extensionAutofillBackgroundPortsCreate(
    { onConnect },
    {
      service: {
        start: async () => resultCreate(undefined),
        syncSnapshotLoad: async () => resultCreate({ ciphers: [cipherCreate(1, "login-1"), card] }),
        cipherDetailRead: async () => {
          detailReads += 1
          return resultCreate(card)
        },
      },
    },
  )
  const port = {
    name: extensionAutofillPortName,
    sender: { tab: { id: 7 }, frameId: 4, url: "https://shop.example.test/checkout" },
    postMessage: (message: unknown) => messages.push(message),
    disconnect: () => onDisconnect.emit(),
    onMessage,
    onDisconnect,
  }
  onConnect.emit(port)
  onMessage.emit({ type: "autofill.ready", documentId: "iframe-document", revision: 0 })
  onMessage.emit({
    type: "autofill.fieldsChanged",
    documentId: "iframe-document",
    revision: 1,
    url: "https://shop.example.test/checkout",
    fields: [{ id: "card-field", formId: "checkout-form", kind: "cardNumber", control: "input" }],
  })
  onMessage.emit({
    type: "autofill.candidatesRequest",
    documentId: "iframe-document",
    revision: 1,
    fieldId: "card-field",
    requestId: "request-1",
    url: "https://shop.example.test/checkout",
  })
  await Bun.sleep(0)
  await Bun.sleep(0)
  const candidateMessage = messages.at(-1) as CandidateMessage
  expect(candidateMessage.candidates).toEqual([
    { id: "card-1", type: 3, name: "3-card-1", subtitle: "Visa · •••• 1111", permission: "readOnly" },
  ])
  expect(JSON.stringify(candidateMessage)).not.toContain("4111111111111111")
  expect(JSON.stringify(candidateMessage)).not.toContain("login-secret")
  expect(detailReads).toBe(0)

  onMessage.emit({
    type: "autofill.candidateSelected",
    documentId: "iframe-document",
    revision: 1,
    fieldId: "card-field",
    requestId: "request-1",
    candidateId: "card-1",
    candidateType: 3,
  })
  await Bun.sleep(0)
  await Bun.sleep(0)
  expect(detailReads).toBe(1)
  const fillMessage = messages.at(-1) as FillMessage
  expect(fillMessage.type).toBe("autofill.fill")
  expect(fillMessage.values).toContainEqual({ kind: "cardNumber", value: "4111111111111111" })
})

test("sensitive values respect view-password permission", () => {
  const card = { ...cipherCreate(3, "restricted-card"), viewPassword: false } as ExtensionCipher
  const identity = { ...cipherCreate(4, "restricted-identity"), viewPassword: false } as ExtensionCipher
  expect(extensionAutofillFillValuesCreate(card).map((entry) => entry.kind)).not.toContain("cardNumber")
  expect(extensionAutofillFillValuesCreate(card).map((entry) => entry.kind)).not.toContain("cardSecurityCode")
  expect(extensionAutofillFillValuesCreate(identity).map((entry) => entry.kind)).not.toContain(
    "identitySocialSecurityNumber",
  )
  expect(extensionAutofillFillValuesCreate(identity)).toContainEqual({
    kind: "identityEmail",
    value: "ada@example.test",
  })
})
