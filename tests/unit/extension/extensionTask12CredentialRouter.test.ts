import { expect, test } from "bun:test"
import { extensionAutofillBackgroundPortsCreate } from "../../../src/extension/autofill/extensionAutofillBackgroundPortsCreate.js"
import { extensionAutofillPortName } from "../../../src/extension/autofill/extensionAutofillPortName.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"

function eventCreate<T extends (...args: never[]) => void>() {
  const listeners: T[] = []
  return {
    addListener: (listener: T) => listeners.push(listener),
    emit: (...args: Parameters<T>) => {
      for (const listener of listeners) listener(...args)
    },
  }
}

test("capture router validates frame state, keeps prompts secret-free and commits only an accepted proposal", async () => {
  const onConnect = eventCreate<(port: ReturnType<typeof portCreate>) => void>()
  const assessed: unknown[] = []
  const committed: string[] = []
  const discarded: string[] = []
  extensionAutofillBackgroundPortsCreate(
    { onConnect },
    {
      service: {
        start: async () => resultCreate(undefined),
        syncSnapshotLoad: async () => resultCreate(null),
        cipherDetailRead: async () => resultCreate({} as never),
        credentialCaptureAssess: async (capture) => {
          assessed.push(capture)
          return resultCreate({ id: "prompt-1", kind: "change", site: "example.test", risk: null })
        },
        credentialCaptureCommit: async (id) => {
          committed.push(id)
          return resultCreate("updated" as const)
        },
        credentialCaptureDiscard: (id) => {
          discarded.push(id)
          return resultCreate(undefined)
        },
      },
      storage: {
        autofillPolicyLoad: async () => resultCreate({ pageLoadEnabled: false, disabledSites: [] }),
        autofillPolicySave: async () => resultCreate(undefined),
      },
    },
  )
  const port = portCreate()
  onConnect.emit(port)
  port.onMessage.emit({ type: "autofill.ready", documentId: "doc", revision: 0 })
  port.onMessage.emit({
    type: "autofill.fieldsChanged",
    documentId: "doc",
    revision: 1,
    url: "https://example.test/login",
    fields: [
      { id: "user", formId: "form", kind: "username", control: "input" },
      { id: "password", formId: "form", kind: "currentPassword", control: "input" },
    ],
  })
  port.onMessage.emit({
    type: "autofill.credentialCapture",
    documentId: "doc",
    revision: 1,
    formId: "form",
    requestId: "request-1",
    url: "https://example.test/login",
    actionUrl: "https://example.test/session",
    method: "PATCH",
    cause: "network",
    username: "person@example.test",
    password: "raw-secret",
  })
  await Promise.resolve()
  await Promise.resolve()
  const prompt = port.messages.find((message) => (message as { type?: string }).type === "autofill.credentialPrompt")
  expect(assessed).toHaveLength(1)
  expect(JSON.stringify(prompt)).not.toContain("raw-secret")
  expect(prompt).toMatchObject({ prompt: { kind: "change", site: "example.test" } })
  port.onMessage.emit({
    type: "autofill.credentialPromptDecision",
    documentId: "doc",
    revision: 1,
    requestId: "request-1",
    promptId: "prompt-1",
    decision: "accept",
  })
  await Promise.resolve()
  await Promise.resolve()
  expect(committed).toEqual(["prompt-1"])
  expect(discarded).toEqual([])
  expect(port.messages.at(-1)).toMatchObject({ type: "autofill.credentialOutcome", status: "updated" })
})

function portCreate() {
  const messages: unknown[] = []
  const onMessage = eventCreate<(message: unknown) => void>()
  const onDisconnect = eventCreate<() => void>()
  return {
    name: extensionAutofillPortName,
    sender: { tab: { id: 1 }, frameId: 0, url: "https://example.test/login" },
    postMessage: (message: unknown) => messages.push(message),
    disconnect: () => onDisconnect.emit(),
    onMessage,
    onDisconnect,
    messages,
  }
}
