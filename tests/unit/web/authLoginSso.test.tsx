import { describe, expect, test } from "bun:test"
import { render } from "@solidjs/testing-library"
import { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import { type WebAuthStorageAdapter, webAuthStorageCreate } from "../../../src/web/auth/model/webAuthStorageCreate.js"
import { AuthLoginView } from "../../../src/web/auth/ui/AuthLoginView.jsx"
import { webSsoTransactionStorageCreate } from "../../../src/web/sso/model/webSsoTransactionStorageCreate.js"

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

describe("AuthLoginView SSO integration", () => {
  test("renders 'Continue with SSO' button alongside 'Or' separator", () => {
    const memory = memoryStorageCreate()
    const storage = webAuthStorageCreate(memory)
    const session = webAuthSessionCreate({ storage })

    const screen = render(() => <AuthLoginView session={session} />)

    expect(screen.getByRole("button", { name: /Continue with SSO/i })).toBeDefined()
    expect(screen.getByRole("button", { name: /^Log In$/i })).toBeDefined()
    expect(screen.getByText(/^Or$/i)).toBeDefined()

    screen.unmount()
  })

  test("clicking 'Continue with SSO' synchronously generates and stores PKCE transaction before navigating", async () => {
    window.location.href = "http://localhost/"
    const memory = memoryStorageCreate()
    const storage = webAuthStorageCreate(memory)
    const session = webAuthSessionCreate({ storage })

    let assignedUrl: string | null = null
    const originalAssign = window.location.assign
    window.location.assign = (url: string) => {
      assignedUrl = url
    }

    const screen = render(() => <AuthLoginView session={session} initialEmail="Alice@Example.COM" />)

    const ssoButton = screen.getByRole("button", { name: /Continue with SSO/i })
    ssoButton.click()

    await new Promise((r) => setTimeout(r, 20))

    expect(assignedUrl).not.toBeNull()
    if (assignedUrl === null) return

    const parsedUrl = new URL(assignedUrl, window.location.origin)
    expect(parsedUrl.pathname).toBe("/identity/connect/authorize")
    expect(parsedUrl.searchParams.get("client_id")).toBe("web")
    expect(parsedUrl.searchParams.get("redirect_uri")).toContain("/sso-connector.html")
    expect(parsedUrl.searchParams.get("response_type")).toBe("code")
    expect(parsedUrl.searchParams.get("scope")).toBe("api offline_access")
    expect(parsedUrl.searchParams.get("code_challenge_method")).toBe("S256")
    expect(parsedUrl.searchParams.get("domain_hint")).toBe("alice@example.com")
    expect(parsedUrl.searchParams.get("code_challenge")).toBeDefined()

    // Transaction is stored in sessionStorage
    const transactionStorage = webSsoTransactionStorageCreate()
    const loaded = transactionStorage.load(Date.now())
    expect(loaded.success).toBe(true)
    if (loaded.success && loaded.data) {
      expect(loaded.data.state).toBe(parsedUrl.searchParams.get("state"))
      expect(loaded.data.codeVerifier.length).toBeGreaterThanOrEqual(43)
      expect(loaded.data.email).toBe("alice@example.com")
    }

    window.location.assign = originalAssign
    screen.unmount()
  })

  test("does not include domain_hint when email is invalid or empty", async () => {
    window.location.href = "http://localhost/"
    const memory = memoryStorageCreate()
    const storage = webAuthStorageCreate(memory)
    const session = webAuthSessionCreate({ storage })

    let assignedUrl: string | null = null
    const originalAssign = window.location.assign
    window.location.assign = (url: string) => {
      assignedUrl = url
    }

    const screen = render(() => <AuthLoginView session={session} initialEmail="not-an-email" />)

    const ssoButton = screen.getByRole("button", { name: /Continue with SSO/i })
    ssoButton.click()

    await new Promise((r) => setTimeout(r, 20))

    expect(assignedUrl).not.toBeNull()
    if (assignedUrl === null) return

    const parsedUrl = new URL(assignedUrl, window.location.origin)
    expect(parsedUrl.pathname).toBe("/identity/connect/authorize")
    expect(parsedUrl.searchParams.has("domain_hint")).toBe(false)

    window.location.assign = originalAssign
    screen.unmount()
  })
})
