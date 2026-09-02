import { describe, expect, test } from "bun:test"
import { fireEvent, render } from "@solidjs/testing-library"
import type { BitwardenPasswordTokenResponse } from "../../../src/shared/api/bitwardenPasswordTokenResponseSchema.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { base64Encode } from "../../../src/shared/crypto/base64Encode.js"
import { base64UrlEncode } from "../../../src/shared/crypto/base64UrlEncode.js"
import { passwordHashCreate } from "../../../src/shared/crypto/passwordHashCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import type { IdentitySsoAdapter } from "../../../src/server/contexts/identity/identitySsoAdapter.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { webAuthApiClientCreate } from "../../../src/web/auth/model/webAuthApiClientCreate.js"
import { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import { type WebAuthStorageAdapter, webAuthStorageCreate } from "../../../src/web/auth/model/webAuthStorageCreate.js"
import { webSsoAuthorizationCreate } from "../../../src/web/sso/model/webSsoAuthorizationCreate.js"
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

function mockTokenResponseCreate(
  overrides: Partial<BitwardenPasswordTokenResponse> = {},
): BitwardenPasswordTokenResponse {
  return {
    access_token: jwtTokenCreate({
      sub: "user-sso-1",
      email: "user@example.com",
      iss: "https://vault.example|login",
    }),
    expires_in: 3600,
    token_type: "Bearer",
    refresh_token: "refresh-token-123",
    PrivateKey: null,
    Kdf: 0,
    KdfIterations: 600_000,
    KdfMemory: null,
    KdfParallelism: null,
    ResetMasterPassword: false,
    ForcePasswordReset: false,
    MasterPasswordPolicy: { Object: "masterPasswordPolicy" },
    scope: "api offline_access",
    AccountKeys: null,
    UserDecryptionOptions: {
      HasMasterPassword: true,
      MasterPasswordUnlock: {
        Kdf: { KdfType: 0, Iterations: 600_000, Memory: null, Parallelism: null },
        MasterKeyEncryptedUserKey: "2.encrypted-user-key==",
        MasterKeyWrappedUserKey: "wrapped",
        Salt: "salt==",
      },
      Object: "userDecryptionOptions",
    },
    ...overrides,
  }
}

describe("AuthSsoConnectorView", () => {
  const nowMs = Date.parse("2026-09-01T12:00:00.000Z")

  test("Hop 1: validates state and replace-navigates to /identity/connect/oidc-signin", async () => {
    const authResult = await webSsoAuthorizationCreate({
      origin: "https://vault.example",
      nowMs,
    })
    expect(authResult.success).toBe(true)
    if (!authResult.success) return
    const { transaction } = authResult.data

    const transactionMemory = memoryStorageCreate()
    const transactionStorage = webSsoTransactionStorageCreate(transactionMemory)
    transactionStorage.save(transaction)

    let replacedLocation: string | null = null
    const originalReplace = window.location.replace
    window.location.replace = (url: string) => {
      replacedLocation = url
    }

    const providerState = base64Encode(new TextEncoder().encode(transaction.state))
    const url = `https://vault.example/sso-connector.html?code=provider-code-123&state=${encodeURIComponent(providerState)}`

    const screen = render(() => (
      <AuthSsoConnectorView transactionStorage={transactionStorage} urlOverride={url} nowMs={nowMs + 1000} />
    ))

    await Promise.resolve()
    expect(replacedLocation).toBe(
      `/identity/connect/oidc-signin?code=provider-code-123&state=${encodeURIComponent(providerState)}`,
    )

    window.location.replace = originalReplace
    screen.unmount()
  })

  test("Hop 1: strips provider iss/scope and extra parameters, forwarding only allowed fields", async () => {
    const authResult = await webSsoAuthorizationCreate({
      origin: "https://vault.example",
      nowMs,
    })
    expect(authResult.success).toBe(true)
    if (!authResult.success) return
    const { transaction } = authResult.data

    const transactionMemory = memoryStorageCreate()
    const transactionStorage = webSsoTransactionStorageCreate(transactionMemory)
    transactionStorage.save(transaction)

    let replacedLocation: string | null = null
    const originalReplace = window.location.replace
    window.location.replace = (url: string) => {
      replacedLocation = url
    }

    const providerState = base64Encode(new TextEncoder().encode(transaction.state))
    const url = `https://vault.example/sso-connector.html?code=provider-code-123&state=${encodeURIComponent(providerState)}&iss=https%3A%2F%2Fauth.contentoren.de&scope=openid+profile&session_state=xyz&authuser=0`

    const screen = render(() => (
      <AuthSsoConnectorView transactionStorage={transactionStorage} urlOverride={url} nowMs={nowMs + 1000} />
    ))

    await Promise.resolve()
    expect(replacedLocation).toBe(
      `/identity/connect/oidc-signin?code=provider-code-123&state=${encodeURIComponent(providerState)}`,
    )

    window.location.replace = originalReplace
    screen.unmount()
  })

  test("Hop 1: provider error trampoline forwards only error, error_description, and state", async () => {
    const authResult = await webSsoAuthorizationCreate({
      origin: "https://vault.example",
      nowMs,
    })
    expect(authResult.success).toBe(true)
    if (!authResult.success) return
    const { transaction } = authResult.data

    const transactionMemory = memoryStorageCreate()
    const transactionStorage = webSsoTransactionStorageCreate(transactionMemory)
    transactionStorage.save(transaction)

    let replacedLocation: string | null = null
    const originalReplace = window.location.replace
    window.location.replace = (url: string) => {
      replacedLocation = url
    }

    const providerState = base64Encode(new TextEncoder().encode(transaction.state))
    const url = `https://vault.example/sso-connector.html?error=access_denied&error_description=User+denied+access&state=${encodeURIComponent(providerState)}&iss=https%3A%2F%2Fauth.contentoren.de&scope=openid`

    const screen = render(() => (
      <AuthSsoConnectorView transactionStorage={transactionStorage} urlOverride={url} nowMs={nowMs + 1000} />
    ))

    await Promise.resolve()
    expect(replacedLocation).toBe(
      `/identity/connect/oidc-signin?error=access_denied&error_description=User+denied+access&state=${encodeURIComponent(providerState)}`,
    )

    window.location.replace = originalReplace
    screen.unmount()
  })

  test("Hop 1: raw state without standard-base64 encoding is rejected as state mismatch", async () => {
    const authResult = await webSsoAuthorizationCreate({
      origin: "https://vault.example",
      nowMs,
    })
    expect(authResult.success).toBe(true)
    if (!authResult.success) return
    const { transaction } = authResult.data

    const transactionMemory = memoryStorageCreate()
    const transactionStorage = webSsoTransactionStorageCreate(transactionMemory)
    transactionStorage.save(transaction)

    let replacedLocation: string | null = null
    const originalReplace = window.location.replace
    window.location.replace = (url: string) => {
      replacedLocation = url
    }

    // Raw state passed directly without base64 encoding (and without Hop 2's iss/scope)
    const url = `https://vault.example/sso-connector.html?code=provider-code-123&state=${encodeURIComponent(transaction.state)}`

    const screen = render(() => (
      <AuthSsoConnectorView transactionStorage={transactionStorage} urlOverride={url} nowMs={nowMs + 1000} />
    ))

    await Promise.resolve()
    expect(replacedLocation).toBeNull()
    expect(screen.getByText("SSO Authentication Failed")).toBeDefined()
    expect(screen.getByText(/State mismatch/i)).toBeDefined()
    expect(transactionStorage.load(nowMs + 1000).data).toBeNull()

    window.location.replace = originalReplace
    screen.unmount()
  })

  test("Hop 1: state mismatch shows error feedback, clears transaction, and does not navigate", async () => {
    const authResult = await webSsoAuthorizationCreate({
      origin: "https://vault.example",
      nowMs,
    })
    expect(authResult.success).toBe(true)
    if (!authResult.success) return
    const { transaction } = authResult.data

    const transactionMemory = memoryStorageCreate()
    const transactionStorage = webSsoTransactionStorageCreate(transactionMemory)
    transactionStorage.save(transaction)

    let replacedLocation: string | null = null
    const originalReplace = window.location.replace
    window.location.replace = (url: string) => {
      replacedLocation = url
    }

    const wrongState = base64Encode(new TextEncoder().encode("different-random-state"))
    const url = `https://vault.example/sso-connector.html?code=provider-code-123&state=${encodeURIComponent(wrongState)}`

    const screen = render(() => (
      <AuthSsoConnectorView transactionStorage={transactionStorage} urlOverride={url} nowMs={nowMs + 1000} />
    ))

    await Promise.resolve()
    expect(replacedLocation).toBeNull()
    expect(screen.getByText("SSO Authentication Failed")).toBeDefined()
    expect(screen.getByText(/State mismatch/i)).toBeDefined()
    expect(transactionStorage.load(nowMs + 1000).data).toBeNull()

    window.location.replace = originalReplace
    screen.unmount()
  })

  test("Hop 2: scrubs query, exchanges code, persists session, and navigates to /unlock for existing user", async () => {
    const authResult = await webSsoAuthorizationCreate({
      origin: "https://vault.example",
      nowMs,
    })
    expect(authResult.success).toBe(true)
    if (!authResult.success) return
    const { transaction } = authResult.data

    const transactionMemory = memoryStorageCreate()
    const transactionStorage = webSsoTransactionStorageCreate(transactionMemory)
    transactionStorage.save(transaction)

    const authMemory = memoryStorageCreate()
    const storage = webAuthStorageCreate(authMemory)
    const session = webAuthSessionCreate({ storage })

    const requests: Array<{ url: string; body: string }> = []
    const apiClient = webAuthApiClientCreate({
      fetch: async (input, init) => {
        requests.push({ url: String(input), body: String(init?.body) })
        return Response.json(mockTokenResponseCreate())
      },
    })

    let replaceStateCalledWith: string | null = null

    let navigatedToUnlock = false
    const url = `https://vault.example/sso-connector.html?code=backend-code&state=${encodeURIComponent(transaction.state)}&scope=api+offline_access&iss=https%3A%2F%2Fvault.example`

    const screen = render(() => (
      <AuthSsoConnectorView
        session={session}
        apiClient={apiClient}
        storage={storage}
        transactionStorage={transactionStorage}
        urlOverride={url}
        nowMs={nowMs + 1000}
        navigateReplace={(path) => {
          replaceStateCalledWith = path
        }}
        onNavigateToUnlock={() => {
          navigatedToUnlock = true
        }}
      />
    ))

    await new Promise((r) => setTimeout(r, 10))

    // History query was scrubbed
    expect(replaceStateCalledWith).toBe("/sso-connector.html")

    // Exact token request
    expect(requests).toHaveLength(1)
    expect(requests[0]?.url).toBe("/identity/connect/token")
    const form = Object.fromEntries(new URLSearchParams(requests[0]?.body))
    expect(form).toEqual({
      grant_type: "authorization_code",
      code: "backend-code",
      code_verifier: transaction.codeVerifier,
      client_id: "web",
      device_identifier: storage.deviceIdentifierGet(),
      device_name: "Web Browser",
      device_type: "6",
      scope: "api offline_access",
    })

    // Existing user session was persisted and locked
    expect(session.isLocked()).toBe(true)
    expect(session.session()?.email).toBe("user@example.com")
    expect(storage.sessionLoad().data?.email).toBe("user@example.com")

    // Navigated to /unlock
    expect(navigatedToUnlock).toBe(true)

    // Transaction was cleared
    expect(transactionStorage.load(nowMs + 1000).data).toBeNull()

    screen.unmount()
  })

  test("Hop 2: retains transaction across retryable transport failures and succeeds upon retry", async () => {
    const authResult = await webSsoAuthorizationCreate({
      origin: "https://vault.example",
      nowMs,
    })
    expect(authResult.success).toBe(true)
    if (!authResult.success) return
    const { transaction } = authResult.data

    const transactionMemory = memoryStorageCreate()
    const transactionStorage = webSsoTransactionStorageCreate(transactionMemory)
    transactionStorage.save(transaction)

    const authMemory = memoryStorageCreate()
    const storage = webAuthStorageCreate(authMemory)
    const session = webAuthSessionCreate({ storage })

    let attemptCount = 0
    const apiClient = webAuthApiClientCreate({
      fetch: async () => {
        attemptCount++
        if (attemptCount === 1) {
          return new Response(JSON.stringify({ error: "Service Unavailable" }), { status: 503 })
        }
        return Response.json(mockTokenResponseCreate())
      },
    })

    let navigatedToUnlock = false
    const url = `https://vault.example/sso-connector.html?code=backend-code&state=${encodeURIComponent(transaction.state)}&scope=api+offline_access&iss=https%3A%2F%2Fvault.example`

    const screen = render(() => (
      <AuthSsoConnectorView
        session={session}
        apiClient={apiClient}
        storage={storage}
        transactionStorage={transactionStorage}
        urlOverride={url}
        nowMs={nowMs + 1000}
        onNavigateToUnlock={() => {
          navigatedToUnlock = true
        }}
      />
    ))

    await new Promise((r) => setTimeout(r, 15))

    // First attempt failed with retryable 503
    expect(attemptCount).toBe(1)
    expect(screen.getByText("SSO Authentication Failed")).toBeDefined()
    expect(transactionStorage.load(nowMs + 1000).data).not.toBeNull()

    // Retry button is available
    const retryBtn = screen.getByText("Retry")
    expect(retryBtn).toBeDefined()

    // Click retry
    fireEvent.click(retryBtn)
    await new Promise((r) => setTimeout(r, 15))

    expect(attemptCount).toBe(2)
    expect(navigatedToUnlock).toBe(true)
    expect(session.isLocked()).toBe(true)
    // Transaction cleared on success
    expect(transactionStorage.load(nowMs + 1000).data).toBeNull()

    screen.unmount()
  })

  test("Hop 2: definitive auth error (400) clears transaction and offers no retry", async () => {
    const authResult = await webSsoAuthorizationCreate({
      origin: "https://vault.example",
      nowMs,
    })
    expect(authResult.success).toBe(true)
    if (!authResult.success) return
    const { transaction } = authResult.data

    const transactionMemory = memoryStorageCreate()
    const transactionStorage = webSsoTransactionStorageCreate(transactionMemory)
    transactionStorage.save(transaction)

    const apiClient = webAuthApiClientCreate({
      fetch: async () => new Response(JSON.stringify({ error: "Invalid grant" }), { status: 400 }),
    })

    const url = `https://vault.example/sso-connector.html?code=backend-code&state=${encodeURIComponent(transaction.state)}&scope=api+offline_access&iss=https%3A%2F%2Fvault.example`

    const screen = render(() => (
      <AuthSsoConnectorView
        apiClient={apiClient}
        transactionStorage={transactionStorage}
        urlOverride={url}
        nowMs={nowMs + 1000}
      />
    ))

    await new Promise((r) => setTimeout(r, 15))

    expect(screen.getByText("SSO Authentication Failed")).toBeDefined()
    expect(screen.queryByText("Retry")).toBeNull()
    expect(transactionStorage.load(nowMs + 1000).data).toBeNull()

    screen.unmount()
  })

  test("Cancellation: Back to Login clears transaction", async () => {
    const authResult = await webSsoAuthorizationCreate({
      origin: "https://vault.example",
      nowMs,
    })
    expect(authResult.success).toBe(true)
    if (!authResult.success) return
    const { transaction } = authResult.data

    const transactionMemory = memoryStorageCreate()
    const transactionStorage = webSsoTransactionStorageCreate(transactionMemory)
    transactionStorage.save(transaction)

    const apiClient = webAuthApiClientCreate({
      fetch: async () => new Response(JSON.stringify({ error: "Service Unavailable" }), { status: 503 }),
    })

    let loginNavigated = false
    const url = `https://vault.example/sso-connector.html?code=backend-code&state=${encodeURIComponent(transaction.state)}&scope=api+offline_access&iss=https%3A%2F%2Fvault.example`

    const screen = render(() => (
      <AuthSsoConnectorView
        apiClient={apiClient}
        transactionStorage={transactionStorage}
        urlOverride={url}
        nowMs={nowMs + 1000}
        onNavigateToLogin={() => {
          loginNavigated = true
        }}
      />
    ))

    await new Promise((r) => setTimeout(r, 15))

    const backBtn = screen.getByText("Back to Login")
    fireEvent.click(backBtn)

    expect(loginNavigated).toBe(true)
    expect(transactionStorage.load(nowMs + 1000).data).toBeNull()

    screen.unmount()
  })

  test("Hop 2: shows the non-destructive first-login setup form when HasMasterPassword is false", async () => {
    const authResult = await webSsoAuthorizationCreate({
      origin: "https://vault.example",
      nowMs,
    })
    expect(authResult.success).toBe(true)
    if (!authResult.success) return
    const { transaction } = authResult.data

    const transactionMemory = memoryStorageCreate()
    const transactionStorage = webSsoTransactionStorageCreate(transactionMemory)
    transactionStorage.save(transaction)

    const authMemory = memoryStorageCreate()
    const storage = webAuthStorageCreate(authMemory)
    const session = webAuthSessionCreate({ storage })

    const apiClient = webAuthApiClientCreate({
      fetch: async () =>
        Response.json(
          mockTokenResponseCreate({
            UserDecryptionOptions: {
              HasMasterPassword: false,
              MasterPasswordUnlock: null,
              Object: "userDecryptionOptions",
            },
          }),
        ),
    })

    let navigatedToUnlock = false
    const url = `https://vault.example/sso-connector.html?code=backend-code&state=${encodeURIComponent(transaction.state)}&scope=api+offline_access&iss=https%3A%2F%2Fvault.example`

    const screen = render(() => (
      <AuthSsoConnectorView
        session={session}
        apiClient={apiClient}
        storage={storage}
        transactionStorage={transactionStorage}
        urlOverride={url}
        nowMs={nowMs + 1000}
        onNavigateToUnlock={() => {
          navigatedToUnlock = true
        }}
      />
    ))

    await new Promise((r) => setTimeout(r, 10))

    expect(screen.getByText("Account Setup Required")).toBeDefined()
    expect(screen.getByText(/This is your first login with Single Sign-On/)).toBeDefined()
    expect(screen.getByLabelText("Master Password *")).toBeDefined()
    expect(navigatedToUnlock).toBe(false)
    expect(session.isUnauthenticated()).toBe(true)
    expect(storage.sessionLoad().data).toBeNull()

    screen.unmount()
  })

  test("Full two-hop integration with actual backend /identity/connect/oidc-signin route", async () => {
    const keyPairResult = rsaKeyPairGenerate()
    expect(keyPairResult.success).toBe(true)
    if (!keyPairResult.success) return

    const databaseResult = databaseTestCreate()
    expect(databaseResult.success).toBe(true)
    if (!databaseResult.success) return
    const database = databaseResult.data

    const salt = Uint8Array.from({ length: 64 }, (_, index) => index + 1)
    const passwordHashResult = await passwordHashCreate("client-password", salt, 100_000)
    expect(passwordHashResult.success).toBe(true)
    if (!passwordHashResult.success) return

    const user: IdentityUser = {
      uuid: "user-uuid",
      enabled: true,
      createdAt: "2026-08-28T00:00:00.000Z",
      updatedAt: "2026-08-28T00:00:00.000Z",
      verifiedAt: "2026-08-27T00:00:00.000Z",
      lastVerifyingAt: null,
      loginVerifyCount: 0,
      email: "user@example.com",
      emailNew: null,
      emailNewToken: null,
      name: "SSO User",
      passwordHash: passwordHashResult.data,
      salt,
      passwordIterations: 100_000,
      passwordHint: "hint",
      akey: "wrapped-user-key",
      privateKey: "encrypted-private-key",
      publicKey: "public-key",
      securityStamp: "security-stamp",
      stampException: null,
      equivalentDomains: "[]",
      excludedGlobals: "[]",
      clientKdfType: 0,
      clientKdfIter: 100_000,
      clientKdfMemory: null,
      clientKdfParallelism: null,
      apiKey: "personal-secret",
      avatarColor: null,
      externalId: null,
    }
    identityUserSave(database, user)

    const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
    const ssoAdapter: IdentitySsoAdapter = {
      authorize: async () => resultCreate({ authorizationUrl: "https://idp.example/auth", nonce: "nonce-123" }),
      exchange: async () =>
        resultCreate({
          refresh_token: null,
          access_token: "mock-sso-access-token",
          expires_in: 3600,
          identifier: "https://idp.example/subject-1",
          email: "user@example.com",
          email_verified: true,
          user_name: "SSO User",
        }),
    }

    const app = serverAppCreate({
      clock,
      database,
      identity: {
        clock,
        config: identityConfigCreate({ PASSWORD_ITERATIONS: 100_000, SSO_ENABLED: true }),
        database,
        identifier: { uuid: () => "new-user-uuid" },
        mail: {
          sendRegisterVerifyEmail: async () => resultCreate(undefined),
          sendWelcome: async () => resultCreate(undefined),
          sendWelcomeMustVerify: async () => resultCreate(undefined),
        },
        privateKey: keyPairResult.data.privateKey,
        publicKey: keyPairResult.data.publicKey,
        publicOrigin: "https://vault.example/",
        rateLimiter: { check: () => resultCreate(undefined) },
        sso: ssoAdapter,
      },
    })

    // 1. Client starts SSO
    const authResult = await webSsoAuthorizationCreate({
      origin: "https://vault.example",
      nowMs,
    })
    expect(authResult.success).toBe(true)
    if (!authResult.success) return
    const { transaction, authorizationUrl } = authResult.data

    const transactionMemory = memoryStorageCreate()
    const transactionStorage = webSsoTransactionStorageCreate(transactionMemory)
    transactionStorage.save(transaction)

    // 2. Authorize request against backend
    const authorizeResponse = await app.request(authorizationUrl)
    expect(authorizeResponse.status).toBe(307)
    const bindingCookie = authorizeResponse.headers.get("set-cookie")
    expect(bindingCookie).not.toBeNull()

    // 3. Provider redirects to sso-connector.html with provider-specific parameters
    const providerState = base64Encode(new TextEncoder().encode(transaction.state))
    const providerCallbackUrl = `https://vault.example/sso-connector.html?code=real-provider-code&state=${encodeURIComponent(providerState)}&iss=https%3A%2F%2Fauth.contentoren.de&scope=openid+profile`

    let replacedLocation: string | null = null
    const originalReplace = window.location.replace
    window.location.replace = (url: string) => {
      replacedLocation = url
    }

    // Render Hop 1
    const screen1 = render(() => (
      <AuthSsoConnectorView
        transactionStorage={transactionStorage}
        urlOverride={providerCallbackUrl}
        nowMs={nowMs + 1000}
      />
    ))
    await Promise.resolve()

    // Connector forward path stripped to allowed fields
    expect(replacedLocation).toBe(
      `/identity/connect/oidc-signin?code=real-provider-code&state=${encodeURIComponent(providerState)}`,
    )
    screen1.unmount()

    // 4. Browser performs request to backend /identity/connect/oidc-signin with the binding cookie
    const backendSigninResponse = await app.request(`https://vault.example${replacedLocation}`, {
      headers: { cookie: bindingCookie ?? "" },
    })
    expect(backendSigninResponse.status).toBe(307)
    const backendRedirectLocation = backendSigninResponse.headers.get("location")
    expect(backendRedirectLocation).toBe(
      `https://vault.example/sso-connector.html?code=real-provider-code&state=${encodeURIComponent(transaction.state)}&scope=api+offline_access&iss=https%3A%2F%2Fvault.example`,
    )
    if (backendRedirectLocation === null) return

    // 5. Render Hop 2 with backend redirect location and real backend API client
    const authMemory = memoryStorageCreate()
    const storage = webAuthStorageCreate(authMemory)
    const session = webAuthSessionCreate({ storage })
    const apiClient = webAuthApiClientCreate({
      fetch: (input, init) => app.request(input, init),
    })

    let navigatedToUnlock = false
    const screen2 = render(() => (
      <AuthSsoConnectorView
        session={session}
        apiClient={apiClient}
        storage={storage}
        transactionStorage={transactionStorage}
        urlOverride={backendRedirectLocation}
        nowMs={nowMs + 2000}
        onNavigateToUnlock={() => {
          navigatedToUnlock = true
        }}
      />
    ))

    await new Promise((r) => setTimeout(r, 25))

    expect(navigatedToUnlock).toBe(true)
    expect(session.isLocked()).toBe(true)
    expect(session.session()?.email).toBe("user@example.com")
    expect(transactionStorage.load(nowMs + 2000).data).toBeNull()

    window.location.replace = originalReplace
    screen2.unmount()
  })

  test("Full two-hop integration with actual backend provider error trampoline", async () => {
    const keyPairResult = rsaKeyPairGenerate()
    expect(keyPairResult.success).toBe(true)
    if (!keyPairResult.success) return

    const databaseResult = databaseTestCreate()
    expect(databaseResult.success).toBe(true)
    if (!databaseResult.success) return
    const database = databaseResult.data

    const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
    const ssoAdapter: IdentitySsoAdapter = {
      authorize: async () => resultCreate({ authorizationUrl: "https://idp.example/auth", nonce: "nonce-123" }),
      exchange: async () =>
        resultCreate({
          refresh_token: null,
          access_token: "mock-sso-access-token",
          expires_in: 3600,
          identifier: "https://idp.example/subject-1",
          email: "user@example.com",
          email_verified: true,
          user_name: "SSO User",
        }),
    }

    const app = serverAppCreate({
      clock,
      database,
      identity: {
        clock,
        config: identityConfigCreate({ PASSWORD_ITERATIONS: 100_000, SSO_ENABLED: true }),
        database,
        identifier: { uuid: () => "new-user-uuid" },
        mail: {
          sendRegisterVerifyEmail: async () => resultCreate(undefined),
          sendWelcome: async () => resultCreate(undefined),
          sendWelcomeMustVerify: async () => resultCreate(undefined),
        },
        privateKey: keyPairResult.data.privateKey,
        publicKey: keyPairResult.data.publicKey,
        publicOrigin: "https://vault.example/",
        rateLimiter: { check: () => resultCreate(undefined) },
        sso: ssoAdapter,
      },
    })

    // 1. Client starts SSO
    const authResult = await webSsoAuthorizationCreate({
      origin: "https://vault.example",
      nowMs,
    })
    expect(authResult.success).toBe(true)
    if (!authResult.success) return
    const { transaction, authorizationUrl } = authResult.data

    const transactionMemory = memoryStorageCreate()
    const transactionStorage = webSsoTransactionStorageCreate(transactionMemory)
    transactionStorage.save(transaction)

    // 2. Authorize request against backend
    const authorizeResponse = await app.request(authorizationUrl)
    expect(authorizeResponse.status).toBe(307)
    const bindingCookie = authorizeResponse.headers.get("set-cookie")
    expect(bindingCookie).not.toBeNull()

    // 3. Provider redirects to sso-connector.html with provider error
    const providerState = base64Encode(new TextEncoder().encode(transaction.state))
    const providerCallbackUrl = `https://vault.example/sso-connector.html?error=access_denied&error_description=Consent+denied&state=${encodeURIComponent(providerState)}&iss=https%3A%2F%2Fauth.contentoren.de`

    let replacedLocation: string | null = null
    const originalReplace = window.location.replace
    window.location.replace = (url: string) => {
      replacedLocation = url
    }

    // Render Hop 1
    const screen1 = render(() => (
      <AuthSsoConnectorView
        transactionStorage={transactionStorage}
        urlOverride={providerCallbackUrl}
        nowMs={nowMs + 1000}
      />
    ))
    await Promise.resolve()

    expect(replacedLocation).toBe(
      `/identity/connect/oidc-signin?error=access_denied&error_description=Consent+denied&state=${encodeURIComponent(providerState)}`,
    )
    screen1.unmount()

    // 4. Forwarded error request to backend /identity/connect/oidc-signin
    const backendSigninResponse = await app.request(`https://vault.example${replacedLocation}`, {
      headers: { cookie: bindingCookie ?? "" },
    })
    expect(backendSigninResponse.status).toBe(307)
    const backendRedirectLocation = backendSigninResponse.headers.get("location")
    expect(backendRedirectLocation).toBe(
      `https://vault.example/sso-connector.html?code=${encodeURIComponent(providerState)}&state=${encodeURIComponent(transaction.state)}&scope=api+offline_access&iss=https%3A%2F%2Fvault.example`,
    )
    if (backendRedirectLocation === null) return

    // 5. Render Hop 2 with backend redirect location and real backend API client
    const authMemory = memoryStorageCreate()
    const storage = webAuthStorageCreate(authMemory)
    const session = webAuthSessionCreate({ storage })
    const apiClient = webAuthApiClientCreate({
      fetch: (input, init) => app.request(input, init),
    })

    const screen2 = render(() => (
      <AuthSsoConnectorView
        session={session}
        apiClient={apiClient}
        storage={storage}
        transactionStorage={transactionStorage}
        urlOverride={backendRedirectLocation}
        nowMs={nowMs + 2000}
      />
    ))

    await new Promise((r) => setTimeout(r, 25))

    expect(screen2.getByText("SSO Authentication Failed")).toBeDefined()
    expect(screen2.getByText(/Failed to exchange SSO authorization code/i)).toBeDefined()
    // Definitive error -> transaction cleared, no retry
    expect(screen2.queryByText("Retry")).toBeNull()
    expect(transactionStorage.load(nowMs + 2000).data).toBeNull()

    window.location.replace = originalReplace
    screen2.unmount()
  })
})
