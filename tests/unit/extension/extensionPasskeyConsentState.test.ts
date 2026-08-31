import { expect, afterEach, test } from "bun:test"
import { createRoot } from "solid-js"
import type { Result } from "#result"
import type { ExtensionRuntimeMessage } from "../../../src/extension/messaging/extensionRuntimeMessageSchema.js"
import { extensionPasskeyConsentStateCreate } from "../../../src/extension/passkey-consent/extensionPasskeyConsentStateCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"

window.location.href = "http://localhost/"
const initialUrl = window.location.href

function messageRequestIdRead(message: ExtensionRuntimeMessage): string | null {
  if (!("request" in message) || typeof message.request !== "object" || message.request === null) return null
  if (!("requestId" in message.request) || typeof message.request.requestId !== "string") return null
  return message.request.requestId
}

afterEach(() => {
  window.history.replaceState(null, "", initialUrl)
})

test("extensionPasskeyConsentStateCreate accepts a valid request id from the URL", async () => {
  window.history.replaceState(null, "", "http://localhost/?request=request-from-url")
  const messages: ExtensionRuntimeMessage[] = []

  const root = createRoot((dispose) => ({
    dispose,
    state: extensionPasskeyConsentStateCreate({
      close: () => {},
      messageSend: async <T = unknown>(message: ExtensionRuntimeMessage): Promise<Result<T>> => {
        messages.push(message)
        return resultErrorCreate("test", "Ignored in test.") as Result<T>
      },
    }),
  }))

  await root.state.cancel()

  expect(messages.length).toBeGreaterThan(0)
  expect(messages.every((message) => messageRequestIdRead(message) === "request-from-url")).toBe(true)
  root.dispose()
})

test("extensionPasskeyConsentStateCreate ignores malformed URL request ids", async () => {
  window.history.replaceState(null, "", `http://localhost/?request=${"x".repeat(129)}`)
  const messages: ExtensionRuntimeMessage[] = []

  const root = createRoot((dispose) => ({
    dispose,
    state: extensionPasskeyConsentStateCreate({
      close: () => {},
      messageSend: async <T = unknown>(message: ExtensionRuntimeMessage): Promise<Result<T>> => {
        messages.push(message)
        return resultErrorCreate("test", "Ignored in test.") as Result<T>
      },
    }),
  }))

  await root.state.cancel()

  expect(messages.length).toBeGreaterThan(0)
  expect(messages.every((message) => messageRequestIdRead(message) === "")).toBe(true)
  root.dispose()
})
