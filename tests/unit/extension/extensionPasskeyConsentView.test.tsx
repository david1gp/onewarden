import { expect, test } from "bun:test"
import { fireEvent, render, waitFor } from "@solidjs/testing-library"
import { ExtensionPasskeyConsentApp } from "../../../src/extension/passkey-consent/ExtensionPasskeyConsentApp.jsx"
import type { ExtensionRuntimeMessage } from "../../../src/extension/messaging/extensionRuntimeMessageSchema.js"
import type { Result } from "#result"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"

test("passkey consent view requests fresh verification before confirmation", async () => {
  const messages: ExtensionRuntimeMessage[] = []
  const messageSend = async <T = unknown>(message: ExtensionRuntimeMessage): Promise<Result<T>> => {
    messages.push(message)
    if (message.type === "passkeyConsentUiLoad") {
      return resultCreate({
        requestId: "request-1",
        operation: "create" as const,
        rpId: "example.test",
        rpName: "Example",
        userName: "user@example.test",
        verificationRequired: true,
        verified: false,
        locked: false,
        expiresAt: 70_000,
        candidates: [],
      }) as Result<T>
    }
    return resultCreate({
      requestId: "request-1",
      operation: "create" as const,
      rpId: "example.test",
      rpName: "Example",
      userName: "user@example.test",
      verificationRequired: true,
      verified: true,
      locked: false,
      expiresAt: 70_000,
      candidates: [
        {
          cipherId: "login-1",
          credentialId: null,
          revisionDate: "2026-08-31T00:00:00.000Z",
          name: "Example login",
          userName: "user@example.test",
          organization: false,
          readOnly: false,
        },
      ],
    }) as Result<T>
  }
  const root = render(() => (
    <ExtensionPasskeyConsentApp options={{ requestId: "request-1", messageSend, close: () => {} }} />
  ))

  const password = await root.findByLabelText("Master password")
  const confirm = root.getByRole("button", { name: "Confirm" })
  expect(confirm.hasAttribute("disabled")).toBe(true)
  expect(confirm.classList.contains("extension-primary-control")).toBe(true)
  expect(root.getByRole("button", { name: "Verify" }).classList.contains("extension-primary-control")).toBe(true)
  fireEvent.input(password, { target: { value: "correct" } })
  fireEvent.click(root.getByRole("button", { name: "Verify" }))
  await waitFor(() => expect(root.getByText("Example login")).toBeDefined())
  const credentialList = root.getByRole("listbox", { name: "Passkey credentials" })
  const selectedCredential = root.getByRole("option", { name: /Example login/ })
  expect(credentialList.contains(selectedCredential)).toBe(true)
  expect(selectedCredential.getAttribute("aria-selected")).toBe("true")
  expect(selectedCredential.classList.contains("extension-selected-control")).toBe(true)
  expect(selectedCredential.classList.contains("extension-credential-option")).toBe(true)
  const selectedEmail = root.getByText("user@example.test")
  expect(selectedCredential.contains(selectedEmail)).toBe(true)
  expect(selectedEmail.classList.contains("extension-muted-text")).toBe(true)
  expect(messages).toContainEqual({
    type: "passkeyConsentUiVerify",
    request: { requestId: "request-1", password: "correct" },
  })

  root.unmount()
})
