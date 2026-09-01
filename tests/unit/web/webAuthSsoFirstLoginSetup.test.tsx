import { describe, expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import type { BitwardenPasswordTokenResponse } from "../../../src/shared/api/bitwardenPasswordTokenResponseSchema.js"
import { base64UrlEncode } from "../../../src/shared/crypto/base64UrlEncode.js"
import { webAuthApiClientCreate } from "../../../src/web/auth/model/webAuthApiClientCreate.js"
import { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import { type WebAuthStorageAdapter, webAuthStorageCreate } from "../../../src/web/auth/model/webAuthStorageCreate.js"
import { webAuthUserKeyUnlock } from "../../../src/web/auth/model/webAuthUserKeyUnlock.js"
import { webSsoAuthorizationCreate } from "../../../src/web/sso/model/webSsoAuthorizationCreate.js"
import { webSsoPendingSetupStorageCreate } from "../../../src/web/sso/model/webSsoPendingSetupStorageCreate.js"
import { webSsoPendingSetupTtlMs } from "../../../src/web/sso/model/webSsoPendingSetupTtlMs.js"
import { webSsoTransactionStorageCreate } from "../../../src/web/sso/model/webSsoTransactionStorageCreate.js"
import { AuthSsoConnectorView } from "../../../src/web/sso/ui/AuthSsoConnectorView.jsx"

function memoryStorageCreate(): WebAuthStorageAdapter {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
  }
}

function jwtTokenCreate(claims: Record<string, unknown>): string {
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })))
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)))
  return `${header}.${payload}.mock-sig`
}

function setupTokenResponseCreate(kdfIterations = 5_000): BitwardenPasswordTokenResponse {
  return {
    access_token: jwtTokenCreate({
      sub: "user-sso-new",
      email: "new@example.com",
      iss: "https://vault.example|login",
    }),
    expires_in: 3600,
    token_type: "Bearer",
    refresh_token: "refresh-token-new",
    PrivateKey: null,
    Kdf: 0,
    KdfIterations: kdfIterations,
    KdfMemory: null,
    KdfParallelism: null,
    ResetMasterPassword: false,
    ForcePasswordReset: false,
    MasterPasswordPolicy: { Object: "masterPasswordPolicy" },
    scope: "api offline_access",
    AccountKeys: null,
    UserDecryptionOptions: {
      HasMasterPassword: false,
      MasterPasswordUnlock: null,
      Object: "userDecryptionOptions",
    },
  }
}

const nowMs = Date.parse("2026-09-01T12:00:00.000Z")

async function connectorSetupHarnessCreate(options: { setPasswordRespond?: () => Response } = {}) {
  const authResult = await webSsoAuthorizationCreate({ origin: "https://vault.example", nowMs })
  if (!authResult.success) throw new Error("authorization create failed")
  const { transaction } = authResult.data

  const transactionStorage = webSsoTransactionStorageCreate(memoryStorageCreate())
  transactionStorage.save(transaction)
  const pendingSetupStorage = webSsoPendingSetupStorageCreate(memoryStorageCreate())

  const authMemory = memoryStorageCreate()
  const storage = webAuthStorageCreate(authMemory)

  const requests: Array<{ url: string; body: string; authorization: string | null }> = []
  const apiClient = webAuthApiClientCreate({
    fetch: async (input, init) => {
      const url = String(input)
      const headers = new Headers(init?.headers)
      requests.push({ url, body: String(init?.body ?? ""), authorization: headers.get("authorization") })
      if (url.endsWith("/api/accounts/set-password")) {
        return options.setPasswordRespond?.() ?? Response.json({ object: "set-password", captchaBypassToken: "" })
      }
      return Response.json(setupTokenResponseCreate())
    },
  })
  const session = webAuthSessionCreate({ storage, apiClient })

  const url = `https://vault.example/sso-connector.html?code=backend-code&state=${encodeURIComponent(transaction.state)}&scope=api+offline_access&iss=https%3A%2F%2Fvault.example`

  return { transaction, transactionStorage, pendingSetupStorage, storage, apiClient, session, requests, url }
}

describe("SSO first-login master password setup", () => {
  test("shows the setup form and stores a tab-scoped, state-bound, TTL-bounded pending setup", async () => {
    const harness = await connectorSetupHarnessCreate()

    const screen = render(() => (
      <AuthSsoConnectorView
        session={harness.session}
        apiClient={harness.apiClient}
        storage={harness.storage}
        transactionStorage={harness.transactionStorage}
        pendingSetupStorage={harness.pendingSetupStorage}
        urlOverride={harness.url}
        nowMs={nowMs + 1000}
      />
    ))

    await new Promise((r) => setTimeout(r, 15))

    expect(screen.getByText("Account Setup Required")).toBeDefined()
    expect(screen.getByLabelText("Master Password *")).toBeDefined()
    expect(screen.getByLabelText("Confirm Master Password *")).toBeDefined()
    expect(screen.getByLabelText("Master Password Hint (Optional)")).toBeDefined()

    const pending = harness.pendingSetupStorage.load(nowMs + 1000).data
    expect(pending).not.toBeNull()
    expect(pending?.state).toBe(harness.transaction.state)
    expect(pending?.email).toBe("new@example.com")
    expect(pending?.kdfIterations).toBe(5_000)
    expect(pending?.expiresAt).toBe((pending?.createdAt ?? 0) + webSsoPendingSetupTtlMs)

    // The SSO transaction is consumed, and no normal vault session exists yet.
    expect(harness.transactionStorage.load(nowMs + 1000).data).toBeNull()
    expect(harness.storage.sessionLoad().data).toBeNull()
    expect(harness.session.isUnauthenticated()).toBe(true)

    screen.unmount()
  })

  test("rejects a password below the minimum policy and a confirmation mismatch without any request", async () => {
    const harness = await connectorSetupHarnessCreate()

    const screen = render(() => (
      <AuthSsoConnectorView
        session={harness.session}
        apiClient={harness.apiClient}
        storage={harness.storage}
        transactionStorage={harness.transactionStorage}
        pendingSetupStorage={harness.pendingSetupStorage}
        urlOverride={harness.url}
        nowMs={nowMs + 1000}
      />
    ))
    await new Promise((r) => setTimeout(r, 15))

    const password = screen.getByLabelText("Master Password *") as HTMLInputElement
    const confirm = screen.getByLabelText("Confirm Master Password *") as HTMLInputElement
    const submit = screen.getByText("Set Master Password")

    fireEvent.input(password, { target: { value: "short" } })
    fireEvent.input(confirm, { target: { value: "short" } })
    fireEvent.click(submit)
    await new Promise((r) => setTimeout(r, 10))

    expect(screen.getByText(/at least 8 characters long/i)).toBeDefined()
    expect(harness.requests.filter((r) => r.url.endsWith("/api/accounts/set-password"))).toHaveLength(0)

    fireEvent.input(password, { target: { value: "correct-horse" } })
    fireEvent.input(confirm, { target: { value: "different-horse" } })
    fireEvent.click(submit)
    await new Promise((r) => setTimeout(r, 10))

    expect(screen.getByText("Master passwords do not match.")).toBeDefined()
    expect(harness.requests.filter((r) => r.url.endsWith("/api/accounts/set-password"))).toHaveLength(0)
    expect(harness.session.isUnauthenticated()).toBe(true)

    screen.unmount()
  })

  test("submits the exact payload and lands in an unlocked vault at /", async () => {
    const harness = await connectorSetupHarnessCreate()

    let replaceStatePath: string | null = null
    const originalReplaceState = window.history.replaceState
    window.history.replaceState = (_data, _unused, url) => {
      replaceStatePath = String(url)
    }

    let navigatedToVault = false
    const screen = render(() => (
      <AuthSsoConnectorView
        session={harness.session}
        apiClient={harness.apiClient}
        storage={harness.storage}
        transactionStorage={harness.transactionStorage}
        pendingSetupStorage={harness.pendingSetupStorage}
        urlOverride={harness.url}
        nowMs={nowMs + 1000}
        onNavigateToVault={() => {
          navigatedToVault = true
        }}
      />
    ))
    await new Promise((r) => setTimeout(r, 15))

    fireEvent.input(screen.getByLabelText("Master Password *"), { target: { value: "correct-horse-battery" } })
    fireEvent.input(screen.getByLabelText("Confirm Master Password *"), {
      target: { value: "correct-horse-battery" },
    })
    fireEvent.input(screen.getByLabelText("Master Password Hint (Optional)"), { target: { value: "  my hint  " } })
    fireEvent.click(screen.getByText("Set Master Password"))

    await new Promise((r) => setTimeout(r, 2000))
    window.history.replaceState = originalReplaceState

    const setPasswordRequest = harness.requests.find((r) => r.url.endsWith("/api/accounts/set-password"))
    expect(setPasswordRequest).toBeDefined()
    if (setPasswordRequest === undefined) return

    const tokenAccess = harness.pendingSetupStorage.load(nowMs + 1000).data
    expect(tokenAccess).toBeNull() // pending setup cleared atomically on success

    expect(setPasswordRequest.authorization?.startsWith("Bearer ")).toBe(true)
    const payload = JSON.parse(setPasswordRequest.body) as Record<string, unknown>
    expect(Object.keys(payload).sort()).toEqual([
      "kdf",
      "kdfIterations",
      "kdfMemory",
      "kdfParallelism",
      "key",
      "keys",
      "masterPasswordHash",
      "masterPasswordHint",
    ])
    // KDF values come from the token response, no org identifier is sent.
    expect(payload.kdf).toBe(0)
    expect(payload.kdfIterations).toBe(5_000)
    expect(payload.kdfMemory).toBeNull()
    expect(payload.kdfParallelism).toBeNull()
    expect(payload.orgIdentifier).toBeUndefined()
    expect(payload.masterPasswordHint).toBe("my hint")
    expect(typeof payload.masterPasswordHash).toBe("string")
    expect(String(payload.key).startsWith("2.")).toBe(true)
    const keys = payload.keys as { encryptedPrivateKey: string; publicKey: string }
    expect(keys.encryptedPrivateKey.startsWith("2.")).toBe(true)
    expect(keys.publicKey.length).toBeGreaterThan(0)
    // The plaintext password is never part of the request.
    expect(setPasswordRequest.body).not.toContain("correct-horse-battery")

    // Standard session persisted with the wrapped user key; vault is unlocked in memory.
    const persisted = harness.storage.sessionLoad().data
    expect(persisted?.email).toBe("new@example.com")
    expect(persisted?.encryptedUserKey).toBe(String(payload.key))
    expect(harness.session.isUnlocked()).toBe(true)
    expect(harness.session.getUserKey()?.byteLength).toBe(64)

    // The persisted wrapped key really unwraps with the chosen master password.
    const unlockResult = await webAuthUserKeyUnlock(
      "correct-horse-battery",
      "new@example.com",
      { kdfType: 0, iterations: 5_000, memory: null, parallelism: null },
      persisted?.encryptedUserKey ?? "",
    )
    expect(unlockResult.success).toBe(true)

    expect(replaceStatePath).toBe("/")
    expect(navigatedToVault).toBe(true)

    screen.unmount()
  }, 30_000)

  test("cancel clears the pending setup and leaves no vault session", async () => {
    const harness = await connectorSetupHarnessCreate()

    const screen = render(() => (
      <AuthSsoConnectorView
        session={harness.session}
        apiClient={harness.apiClient}
        storage={harness.storage}
        transactionStorage={harness.transactionStorage}
        pendingSetupStorage={harness.pendingSetupStorage}
        urlOverride={harness.url}
        nowMs={nowMs + 1000}
      />
    ))
    await new Promise((r) => setTimeout(r, 15))

    fireEvent.input(screen.getByLabelText("Master Password *"), { target: { value: "correct-horse-battery" } })
    fireEvent.click(screen.getByText("Cancel"))
    await new Promise((r) => setTimeout(r, 10))

    expect(harness.pendingSetupStorage.load(nowMs + 1000).data).toBeNull()
    expect(harness.transactionStorage.load(nowMs + 1000).data).toBeNull()
    expect(harness.storage.sessionLoad().data).toBeNull()
    expect(harness.session.isUnauthenticated()).toBe(true)
    expect(screen.getByText("SSO Authentication Failed")).toBeDefined()

    screen.unmount()
  }, 15_000)

  test("a definitive set-password failure leaves no session and no pending setup", async () => {
    const harness = await connectorSetupHarnessCreate({
      setPasswordRespond: () =>
        new Response(JSON.stringify({ error: "Account already initialized, cannot set password" }), { status: 400 }),
    })

    const screen = render(() => (
      <AuthSsoConnectorView
        session={harness.session}
        apiClient={harness.apiClient}
        storage={harness.storage}
        transactionStorage={harness.transactionStorage}
        pendingSetupStorage={harness.pendingSetupStorage}
        urlOverride={harness.url}
        nowMs={nowMs + 1000}
      />
    ))
    await new Promise((r) => setTimeout(r, 15))

    fireEvent.input(screen.getByLabelText("Master Password *"), { target: { value: "correct-horse-battery" } })
    fireEvent.input(screen.getByLabelText("Confirm Master Password *"), {
      target: { value: "correct-horse-battery" },
    })
    fireEvent.click(screen.getByText("Set Master Password"))
    await new Promise((r) => setTimeout(r, 2000))

    expect(screen.getByText("SSO Authentication Failed")).toBeDefined()
    expect(harness.pendingSetupStorage.load(nowMs + 1000).data).toBeNull()
    expect(harness.storage.sessionLoad().data).toBeNull()
    expect(harness.session.isUnauthenticated()).toBe(true)
    expect(harness.session.isUnlocked()).toBe(false)

    screen.unmount()
  }, 30_000)

  test("resumes a pending setup on reload without a transaction or callback query", async () => {
    const harness = await connectorSetupHarnessCreate()

    const first = render(() => (
      <AuthSsoConnectorView
        session={harness.session}
        apiClient={harness.apiClient}
        storage={harness.storage}
        transactionStorage={harness.transactionStorage}
        pendingSetupStorage={harness.pendingSetupStorage}
        urlOverride={harness.url}
        nowMs={nowMs + 1000}
      />
    ))
    await new Promise((r) => setTimeout(r, 15))
    expect(first.getByText("Account Setup Required")).toBeDefined()
    first.unmount()

    // Reload: the SSO transaction is gone and the URL is scrubbed.
    const second = render(() => (
      <AuthSsoConnectorView
        session={harness.session}
        apiClient={harness.apiClient}
        storage={harness.storage}
        transactionStorage={harness.transactionStorage}
        pendingSetupStorage={harness.pendingSetupStorage}
        urlOverride="https://vault.example/sso-connector.html"
        nowMs={nowMs + 2000}
      />
    ))
    await new Promise((r) => setTimeout(r, 15))

    expect(second.getByText("Account Setup Required")).toBeDefined()
    expect(second.getByLabelText("Master Password *")).toBeDefined()
    expect(second.getByText("new@example.com")).toBeDefined()

    second.unmount()
  }, 15_000)
})
