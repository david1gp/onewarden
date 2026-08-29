import { fireEvent, render } from "@solidjs/testing-library"
import { expect, test } from "bun:test"
import { webAuthApiClientCreate } from "../../../src/web/auth/model/webAuthApiClientCreate.js"
import { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import { webAuthStorageCreate } from "../../../src/web/auth/model/webAuthStorageCreate.js"
import { AuthTwoFactorChallengeCard } from "../../../src/web/auth/ui/AuthTwoFactorChallengeCard.jsx"

test("AuthTwoFactorChallengeCard renders accessible challenge form, method selector, and allows input", async () => {
  let cancelCalled = 0
  let successCalled = 0

  const memoryStore = new Map<string, string>()
  const storage = webAuthStorageCreate({
    getItem: (key) => memoryStore.get(key) ?? null,
    setItem: (key, val) => memoryStore.set(key, val),
    removeItem: (key) => memoryStore.delete(key),
  })
  const apiClient = webAuthApiClientCreate({
    fetch: async () => new Response("Not found", { status: 404 }),
  })
  const session = webAuthSessionCreate({ storage, apiClient })
  session.pendingTwoFactorSet({
    email: "user@example.com",
    masterPassword: "password",
    passwordHashB64: "hash",
    kdfMetadata: { kdfType: 0, iterations: 600_000, memory: null, parallelism: null },
    challenge: {
      error: "invalid_grant",
      TwoFactorProviders: ["0", "1", "3", "8"],
      TwoFactorProviders2: {
        "0": null,
        "1": { Email: "us***@example.com" },
      },
    },
  })

  const screen = render(() => (
    <AuthTwoFactorChallengeCard
      session={session}
      onSuccess={() => {
        successCalled += 1
      }}
      onCancel={() => {
        cancelCalled += 1
      }}
    />
  ))

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Two-Step Verification")

  const select = screen.getByLabelText("Verification Method") as HTMLSelectElement
  expect(select).toBeDefined()

  const tokenInput = screen.getByLabelText("6-Digit Security Code") as HTMLInputElement
  expect(tokenInput).toBeDefined()
  fireEvent.input(tokenInput, { target: { value: "654321" } })
  expect(tokenInput.value).toBe("654321")

  const rememberCheckbox = screen.getByLabelText("Remember this device for 30 days")
  expect(rememberCheckbox).toBeDefined()

  const cancelButton = screen.getByRole("button", { name: "Back to Login" })
  fireEvent.click(cancelButton)
  expect(cancelCalled).toBe(1)
  expect(successCalled).toBe(0)

  screen.unmount()
})
