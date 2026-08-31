import { expect, test } from "bun:test"
import { extensionWebAuthnBackgroundBridgeCreate } from "../../../src/extension/webauthn/extensionWebAuthnBackgroundBridgeCreate.js"
import { extensionWebAuthnContentBridgeInstall } from "../../../src/extension/webauthn/extensionWebAuthnContentBridge.js"
import { extensionWebAuthnPageBridgeInstall } from "../../../src/extension/webauthn/extensionWebAuthnPageBridge.js"
import { extensionWebAuthnRpIdValidate } from "../../../src/extension/webauthn/extensionWebAuthnRpIdValidate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"

const origin = "https://login.example.test"
const response = {
  id: "AQ",
  rawId: "AQ",
  response: {
    clientDataJSON: "Ag",
    authenticatorData: "Aw",
    attestationObject: "BA",
    transports: ["internal"] as ["internal"],
    publicKey: "BQ",
    publicKeyAlgorithm: -7 as const,
  },
  authenticatorAttachment: "platform" as const,
  clientExtensionResults: {},
  type: "public-key" as const,
}

function bridgeRequest(overrides: Record<string, unknown> = {}) {
  return {
    type: "webauthnBridgeRequest" as const,
    requestId: "request-1",
    operation: "create" as const,
    request: {
      challenge: "AQ",
      rpId: null,
      rpName: "Example",
      userId: "Ag",
      userName: "alice",
      userDisplayName: "Alice",
      requireResidentKey: false,
      residentKey: "discouraged" as const,
      userVerification: "discouraged" as const,
      excludeCredentialIds: [],
      pubKeyCredParams: [{ type: "public-key" as const, alg: -7 }],
      timeout: 1_000,
      nativeFallbackSupported: true,
      ...overrides,
    },
  }
}

function senderCreate(url = `${origin}/register`, frameId = 0) {
  return { tab: { id: 41 }, frameId, url }
}

function backgroundCreate(options: Partial<Parameters<typeof extensionWebAuthnBackgroundBridgeCreate>[0]> = {}) {
  let listener:
    | ((message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => boolean | undefined)
    | null = null
  const service = {
    passkeyConsentContextCreate: (request: unknown) =>
      resultCreate({
        requestId: "consent-1",
        operation: "create" as const,
        rpId: (request as { rpId: string }).rpId,
        rpName: "Example",
        userName: "alice",
        userId: "Ag",
        credentialId: null,
        cipherId: null,
        userVerification: "discouraged" as const,
        clientDataJSON: (request as { clientDataJSON: string }).clientDataJSON,
        expiresAt: Date.now() + 60_000,
      }),
    passkeyCredentialCreate: async () => resultCreate(response),
    passkeyAssertion: async () => resultCreate(response),
  }
  const bridge = extensionWebAuthnBackgroundBridgeCreate({
    service,
    runtime: {
      onMessageAddListener: (nextListener) => {
        listener = nextListener
      },
    },
    oneWardenOriginsRead: async () => [],
    framePolicyAllows: async () => true,
    consentResolve: async (context, requestContext) => {
      expect(requestContext.origin).toBe(origin)
      expect(requestContext.frameId).toBe(0)
      expect(new TextDecoder().decode(base64UrlDecode(context.clientDataJSON))).toContain(origin)
      return { requestId: context.requestId, approved: true, userVerified: false }
    },
    ...options,
  })
  return { bridge, listener }
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/")
  return Uint8Array.from(atob(`${normalized}${"=".repeat((4 - (normalized.length % 4)) % 4)}`), (character) =>
    character.charCodeAt(0),
  )
}

test("RP ID validation follows the trusted origin and public-suffix boundaries", () => {
  expect(extensionWebAuthnRpIdValidate(null, "login.example.co.uk")).toEqual({
    success: true,
    data: "login.example.co.uk",
  })
  expect(extensionWebAuthnRpIdValidate("example.co.uk", "login.example.co.uk").success).toBe(true)
  expect(extensionWebAuthnRpIdValidate("co.uk", "login.example.co.uk").success).toBe(false)
  expect(extensionWebAuthnRpIdValidate("example.com", "login.example.test").success).toBe(false)
  expect(extensionWebAuthnRpIdValidate("localhost", "localhost")).toEqual({ success: true, data: "localhost" })
})

test("background WebAuthn bridge derives origin and frame from MessageSender and never accepts page claims", async () => {
  const { bridge } = backgroundCreate()
  const result = await bridge.messageHandle(bridgeRequest(), senderCreate())

  expect(result?.result).toMatchObject({ success: true })
  expect(result?.fallbackRequested).toBe(false)
})

test("background WebAuthn bridge rejects insecure, excluded, public-suffix, and child-frame requests", async () => {
  const { bridge } = backgroundCreate({ oneWardenOriginsRead: async () => [origin] })
  const excluded = await bridge.messageHandle(bridgeRequest(), senderCreate())
  const insecure = await bridge.messageHandle(bridgeRequest(), senderCreate("http://attacker.test/register"))
  const childFrame = await bridge.messageHandle(bridgeRequest(), senderCreate(origin, 2))
  const publicSuffix = await bridge.messageHandle(bridgeRequest({ rpId: "test" }), senderCreate())

  expect(excluded?.fallbackRequested).toBe(true)
  expect(insecure?.fallbackRequested).toBe(true)
  expect(childFrame?.fallbackRequested).toBe(true)
  expect(publicSuffix?.fallbackRequested).toBe(true)
})

test("background WebAuthn bridge times out and cleans up a pending consent request", async () => {
  const releaseConsent: { current: (() => void) | null } = { current: null }
  const { bridge } = backgroundCreate({
    requestTimeoutMs: 5,
    consentResolve: async () =>
      new Promise<null>((resolve) => {
        releaseConsent.current = () => resolve(null)
      }),
  })
  const result = await bridge.messageHandle(
    { ...bridgeRequest(), request: { ...bridgeRequest().request, timeout: 1_000 } },
    senderCreate(),
  )

  expect(result?.result).toMatchObject({ success: false, errorMessage: "The WebAuthn operation timed out." })
  releaseConsent.current?.()
})

test("page bridge preserves native fallback, aborts requests, and reconstructs no vault material", async () => {
  const globalWithWebAuthn = globalThis as typeof globalThis & { PublicKeyCredential?: typeof PublicKeyCredential }
  const previousPublicKeyCredential = globalWithWebAuthn.PublicKeyCredential
  globalWithWebAuthn.PublicKeyCredential = Object.assign(function TestPublicKeyCredential() {}, {
    isUserVerifyingPlatformAuthenticatorAvailable: () => Promise.resolve(true),
  }) as unknown as typeof PublicKeyCredential
  const listeners = new Set<(event: MessageEvent<unknown>) => void>()
  const sentMessages: unknown[] = []
  let fallbackNext = false
  let nativeGetCalls = 0
  const pageWindow = {
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.add(listener as (event: MessageEvent<unknown>) => void)
    },
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.delete(listener as (event: MessageEvent<unknown>) => void)
    },
    postMessage: (message: unknown) => {
      sentMessages.push(message)
      const record = message as { kind?: string; requestId?: string }
      if (record.kind === "request") {
        queueMicrotask(() => {
          for (const listener of listeners) {
            listener({
              source: pageWindow,
              origin,
              data: {
                source: "onewarden-webauthn",
                kind: "response",
                requestId: record.requestId,
                result: { success: true, data: response },
                ...(fallbackNext ? { fallbackRequested: true } : {}),
              },
            } as MessageEvent<unknown>)
          }
          fallbackNext = false
        })
      }
    },
  } as unknown as Window
  const nativeCreate = async () => null
  const nativeGet = async () => {
    nativeGetCalls += 1
    return null
  }
  const credentials = { create: nativeCreate, get: nativeGet } as unknown as CredentialsContainer
  const context = {
    window: pageWindow,
    navigator: { credentials } as Navigator,
    location: { href: `${origin}/register`, origin, protocol: "https:", hostname: "login.example.test" } as Location,
    document: { contentType: "text/html", featurePolicy: { allowsFeature: () => true } } as unknown as Document,
  }
  const destroy = extensionWebAuthnPageBridgeInstall(context)
  for (const listener of listeners)
    listener({
      source: pageWindow,
      origin,
      data: { source: "onewarden-webauthn", kind: "enable" },
    } as MessageEvent<unknown>)

  const created = await credentials.create({
    publicKey: {
      challenge: Uint8Array.of(1),
      rp: { name: "Example" },
      user: { id: Uint8Array.of(2), name: "alice", displayName: "Alice" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
    },
  })
  expect(created?.type).toBe("public-key")
  expect(JSON.stringify(sentMessages)).not.toContain("keyValue")

  fallbackNext = true
  await credentials.get({ publicKey: { challenge: Uint8Array.of(1) } })
  expect(nativeGetCalls).toBe(1)

  const abortController = new AbortController()
  const aborted = credentials.get({
    publicKey: { challenge: Uint8Array.of(1) },
    signal: abortController.signal,
  })
  abortController.abort()
  await expect(aborted).rejects.toMatchObject({ name: "AbortError" })
  expect(sentMessages).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "abort" })]))

  destroy()
  expect(credentials.create).toBe(nativeCreate)
  globalWithWebAuthn.PublicKeyCredential = previousPublicKeyCredential
})

test("content bridge excludes the configured OneWarden origin and forwards no page origin", async () => {
  const listeners = new Set<(event: MessageEvent<unknown>) => void>()
  const sentMessages: unknown[] = []
  const pageWindow = {
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.add(listener as (event: MessageEvent<unknown>) => void)
    },
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.delete(listener as (event: MessageEvent<unknown>) => void)
    },
    postMessage: (message: unknown) => sentMessages.push(message),
  } as unknown as Window
  const excludedCleanup = await extensionWebAuthnContentBridgeInstall({
    window: pageWindow,
    document: { contentType: "text/html", featurePolicy: { allowsFeature: () => true } } as unknown as Document,
    location: { href: `${origin}/vault`, origin, protocol: "https:", hostname: "login.example.test" } as Location,
    runtime: { sendMessage: async () => undefined },
    excludedOriginsRead: async () => [origin],
  })
  expect(listeners).toHaveLength(0)
  expect(sentMessages).toHaveLength(0)
  excludedCleanup()

  const forwarded: unknown[] = []
  const responseWindow = {
    ...pageWindow,
    postMessage: (message: unknown) => sentMessages.push(message),
  } as unknown as Window
  const cleanup = await extensionWebAuthnContentBridgeInstall({
    window: responseWindow,
    document: { contentType: "text/html" } as Document,
    location: { href: `${origin}/register`, origin, protocol: "https:", hostname: "login.example.test" } as Location,
    runtime: {
      sendMessage: async (message) => {
        forwarded.push(message)
        return { requestId: "request-1", result: { success: true, data: response }, fallbackRequested: false }
      },
    },
    excludedOriginsRead: async () => [],
  })
  const requestListener = [...listeners][0]
  requestListener?.({
    source: responseWindow,
    origin,
    data: {
      source: "onewarden-webauthn",
      kind: "request",
      requestId: "request-1",
      operation: "create",
      request: bridgeRequest().request,
    },
  } as MessageEvent<unknown>)
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(forwarded[0]).not.toHaveProperty("origin")
  expect(forwarded[0]).not.toHaveProperty("frameId")
  expect(sentMessages).toEqual(
    expect.arrayContaining([expect.objectContaining({ kind: "response", requestId: "request-1" })]),
  )
  cleanup()
})
