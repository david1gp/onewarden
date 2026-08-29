import { fireEvent, render } from "@solidjs/testing-library"
import { expect, test } from "bun:test"
import { webAuthApiClientCreate } from "../../../src/web/auth/model/webAuthApiClientCreate.js"
import { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import { webAuthStorageCreate } from "../../../src/web/auth/model/webAuthStorageCreate.js"
import { AuthTwoFactorSetupView } from "../../../src/web/auth/ui/AuthTwoFactorSetupView.jsx"

test("AuthTwoFactorSetupView renders provider list, status badges, and opens configuration sections", async () => {
  let backCalled = 0

  const memoryStore = new Map<string, string>()
  const storage = webAuthStorageCreate({
    getItem: (key) => memoryStore.get(key) ?? null,
    setItem: (key, val) => memoryStore.set(key, val),
    removeItem: (key) => memoryStore.delete(key),
  })

  storage.sessionSave({
    email: "user@example.com",
    accessToken: "access-token-xyz",
    refreshToken: "refresh-token-xyz",
    tokenType: "Bearer",
    expiresAt: Date.now() + 3600_000,
    userId: "user-uuid",
    kdf: 0,
    kdfIterations: 600_000,
    kdfMemory: null,
    kdfParallelism: null,
    encryptedUserKey: "2.iv|ciphertext|mac",
  })

  const fakeFetch = async (input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    const url = String(input)
    if (url.endsWith("/api/two-factor")) {
      return new Response(
        JSON.stringify({
          data: [{ enabled: true, type: 0, object: "twoFactorProvider" }],
          object: "list",
          continuationToken: null,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/two-factor/get-authenticator")) {
      return new Response(
        JSON.stringify({
          enabled: true,
          key: "JBSWY3DPEHPK3PXP",
          object: "twoFactorAuthenticator",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    return new Response("Not found", { status: 404 })
  }

  const apiClient = webAuthApiClientCreate({ fetch: fakeFetch })
  const session = webAuthSessionCreate({ storage, apiClient })

  const screen = render(() => (
    <AuthTwoFactorSetupView
      session={session}
      onBack={() => {
        backCalled += 1
      }}
    />
  ))

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Two-Step Login")

  expect(screen.getByText("Authenticator App")).toBeDefined()
  expect(screen.getByText("Email")).toBeDefined()
  expect(screen.getByText("FIDO2 / WebAuthn Security Key")).toBeDefined()
  expect(screen.getByText("Duo Security")).toBeDefined()
  expect(screen.getByText("YubiKey OTP")).toBeDefined()
  expect(screen.getByText("Recovery Code")).toBeDefined()
  expect(screen.getByText("Remembered Devices")).toBeDefined()

  const backButton = screen.getByLabelText("Back to Vault")
  fireEvent.click(backButton)
  expect(backCalled).toBe(1)

  screen.unmount()
})
