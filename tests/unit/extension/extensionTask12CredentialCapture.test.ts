import { afterEach, describe, expect, test } from "bun:test"
import { Window } from "happy-dom"
import * as v from "valibot"
import { extensionAutofillContentStart } from "../../../src/extension/autofill/extensionAutofillContentStart.js"
import { extensionCredentialCapturePlanCreate } from "../../../src/extension/autofill/extensionCredentialCapturePlanCreate.js"
import { extensionCredentialCaptureRequestSchema } from "../../../src/extension/autofill/extensionCredentialCaptureRequestSchema.js"
import { extensionCredentialNetworkBridgeStart } from "../../../src/extension/autofill/extensionCredentialNetworkBridgeStart.js"
import type { ExtensionPersonalLoginCipher } from "../../../src/extension/crypto/extensionPersonalLoginCipherSchema.js"

function eventCreate<T extends (...args: never[]) => void>() {
  const listeners: T[] = []
  return {
    addListener: (listener: T) => listeners.push(listener),
    emit: (...args: Parameters<T>) => {
      for (const listener of listeners) listener(...args)
    },
  }
}

function loginCreate(overrides: Partial<ExtensionPersonalLoginCipher> = {}): ExtensionPersonalLoginCipher {
  return {
    object: "cipher",
    id: "login-1",
    type: 1,
    revisionDate: "2026-01-01T00:00:00.000Z",
    deletedDate: null,
    name: "Example",
    notes: null,
    fields: [],
    login: {
      username: "person@example.test",
      password: "old-password",
      uris: [{ uri: "https://example.test", match: null }],
      totp: null,
    },
    ...overrides,
  }
}

const request = {
  captureId: "capture-1",
  url: "https://example.test/login",
  actionUrl: "https://example.test/session",
  method: "POST" as const,
  cause: "submit" as const,
  username: "person@example.test",
  password: "new-password",
}

afterEach(() => document.documentElement.replaceChildren(document.createElement("head"), document.createElement("body")))

describe("task 12 credential comparison", () => {
  test("returns no prompt for unchanged credentials and a guarded change plan for a changed password", () => {
    expect(
      extensionCredentialCapturePlanCreate({ ...request, password: "old-password" }, [loginCreate()], 1, () => "new"),
    ).toBeNull()
    const plan = extensionCredentialCapturePlanCreate(request, [loginCreate()], 1_788_192_000_000, () => "new")
    expect(plan?.kind).toBe("change")
    if (plan?.kind !== "change") throw new Error("Expected a change plan")
    expect(plan.cipher.login.password).toBe("new-password")
    expect(plan.cipher.passwordHistory?.[0]?.password).toBe("old-password")
  })

  test("creates a personal login while rejecting insecure, cross-origin, read-only and ambiguous updates", () => {
    const add = extensionCredentialCapturePlanCreate(
      { ...request, username: "new@example.test" },
      [],
      1_788_192_000_000,
      () => "created-id",
    )
    expect(add?.kind).toBe("add")
    if (add?.kind !== "add") throw new Error("Expected an add plan")
    expect(add.cipher.login.uris[0]?.uri).toBe("https://example.test")
    expect(
      extensionCredentialCapturePlanCreate({ ...request, url: "http://example.test" }, [], 1, () => "new"),
    ).toEqual({ kind: "atRisk", risk: "insecure" })
    expect(
      extensionCredentialCapturePlanCreate(
        { ...request, actionUrl: "https://accounts.example.net" },
        [],
        1,
        () => "new",
      ),
    ).toEqual({ kind: "atRisk", risk: "crossOrigin" })
    expect(extensionCredentialCapturePlanCreate(request, [loginCreate({ edit: false })], 1, () => "new")).toEqual({
      kind: "atRisk",
      risk: "readOnly",
    })
    expect(
      extensionCredentialCapturePlanCreate(request, [loginCreate(), loginCreate({ id: "login-2" })], 1, () => "new"),
    ).toEqual({ kind: "atRisk", risk: "ambiguous" })
    expect(
      extensionCredentialCapturePlanCreate(
        request,
        [loginCreate({ login: { ...loginCreate().login, username: "someone-else@example.test" } })],
        1,
        () => "new",
      ),
    ).toEqual({ kind: "atRisk", risk: "ambiguous" })
  })

  test("bounds strict capture contracts", () => {
    expect(v.safeParse(extensionCredentialCaptureRequestSchema, request).success).toBe(true)
    expect(v.safeParse(extensionCredentialCaptureRequestSchema, { ...request, password: "x".repeat(4_097) }).success).toBe(
      false,
    )
    expect(v.safeParse(extensionCredentialCaptureRequestSchema, { ...request, totp: "123456" }).success).toBe(false)
  })
})

test("content captures POST submissions without cancelling the page and suppresses immediate duplicates", async () => {
  document.body.innerHTML = `<form method="post" action="https://example.test/session">
    <input autocomplete="username" value="person@example.test">
    <input type="password" autocomplete="current-password" value="new-password">
  </form>`
  const sent: unknown[] = []
  const onMessage = eventCreate<(message: unknown) => void>()
  const onDisconnect = eventCreate<() => void>()
  const stop = extensionAutofillContentStart({
    document,
    window,
    connect: () => ({ postMessage: (message) => sent.push(message), disconnect: () => {}, onMessage, onDisconnect }),
    mutationObserverCreate: (callback) => new MutationObserver(callback),
    timeoutSet: (callback, delay) => window.setTimeout(callback, delay),
    timeoutClear: (timer) => window.clearTimeout(timer),
  })
  const ready = sent[0] as { documentId: string }
  onMessage.emit({ type: "autofill.start", documentId: ready.documentId })
  const form = document.querySelector("form") as HTMLFormElement
  const first = new SubmitEvent("submit", { bubbles: true, cancelable: true })
  const second = new SubmitEvent("submit", { bubbles: true, cancelable: true })
  form.dispatchEvent(first)
  form.dispatchEvent(second)
  await new Promise((resolve) => setTimeout(resolve, 0))
  const captures = sent.filter((message) => (message as { type?: string }).type === "autofill.credentialCapture")
  expect(first.defaultPrevented).toBe(false)
  expect(captures).toHaveLength(1)
  expect(captures[0]).toMatchObject({ method: "POST", cause: "submit", username: "person@example.test" })
  stop()
})

test("content suppresses delayed submit and correlated network duplicates but permits a new credential fingerprint", async () => {
  const dateNow = Date.now
  let now = 1_788_192_000_000
  Date.now = () => now
  try {
    document.body.innerHTML = `<form method="post" action="https://example.test/session">
      <input autocomplete="username" value="person@example.test">
      <input type="password" autocomplete="new-password" value="new-password">
    </form>`
    const sent: unknown[] = []
    const onMessage = eventCreate<(message: unknown) => void>()
    const onDisconnect = eventCreate<() => void>()
    const stop = extensionAutofillContentStart({
      document,
      window,
      connect: () => ({ postMessage: (message) => sent.push(message), disconnect: () => {}, onMessage, onDisconnect }),
      mutationObserverCreate: (callback) => new MutationObserver(callback),
      timeoutSet: (callback, delay) => window.setTimeout(callback, delay),
      timeoutClear: (timer) => window.clearTimeout(timer),
    })
    const ready = sent[0] as { documentId: string }
    onMessage.emit({ type: "autofill.start", documentId: ready.documentId })
    const form = document.querySelector("form") as HTMLFormElement
    const password = form.querySelector("input[type='password']") as HTMLInputElement
    password.dispatchEvent(new Event("input", { bubbles: true }))
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    now += 2_500
    window.dispatchEvent(
      new MessageEvent("message", {
        source: window,
        data: {
          source: "onewarden.credential-capture.v1",
          type: "network",
          method: "POST",
          url: "https://example.test/session",
        },
      }),
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    password.value = "another-password"
    password.dispatchEvent(new Event("input", { bubbles: true }))
    now += 1_000
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    const captures = sent.filter((message) => (message as { type?: string }).type === "autofill.credentialCapture")
    expect(captures).toHaveLength(2)
    expect(captures.map((capture) => (capture as { password: string }).password)).toEqual([
      "new-password",
      "another-password",
    ])
    password.value = "new-password"
    now += 31_000
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(sent.filter((message) => (message as { type?: string }).type === "autofill.credentialCapture")).toHaveLength(3)
    stop()
  } finally {
    Date.now = dateNow
  }
})

test("page bridge reports POST, PUT and PATCH metadata without reading or changing request bodies", async () => {
  const page = new Window({ url: "https://example.test/login" })
  const reports: unknown[] = []
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = []
  const body = { privateValue: "must-pass-through-unchanged" }
  page.postMessage = ((message: unknown) => reports.push(message)) as typeof page.postMessage
  page.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init })
    return new Response(null, { status: 204 })
  }) as typeof page.fetch
  const stop = extensionCredentialNetworkBridgeStart(page as unknown as Window & {
    XMLHttpRequest: typeof XMLHttpRequest
    HTMLFormElement: typeof HTMLFormElement
  })
  await page.fetch("/post", { method: "POST", body: body as unknown as BodyInit })
  await page.fetch("/put", { method: "PUT" })
  await page.fetch("/patch", { method: "PATCH" })
  await page.fetch("/get")
  expect(reports).toEqual([
    { source: "onewarden.credential-capture.v1", type: "network", method: "POST", url: "/post" },
    { source: "onewarden.credential-capture.v1", type: "network", method: "PUT", url: "/put" },
    { source: "onewarden.credential-capture.v1", type: "network", method: "PATCH", url: "/patch" },
  ])
  expect(calls[0]?.init?.body).toBe(body)
  stop()
})

test("page bridge reports XHR method and URL metadata while passing the body through unchanged", () => {
  const page = new Window({ url: "https://example.test/login" })
  const reports: unknown[] = []
  const bodies: unknown[] = []
  class FakeXMLHttpRequest {
    open(_method: string, _url: string | URL): void {}

    send(body?: unknown): void {
      bodies.push(body)
    }
  }
  page.postMessage = ((message: unknown) => reports.push(message)) as typeof page.postMessage
  page.XMLHttpRequest = FakeXMLHttpRequest as unknown as typeof page.XMLHttpRequest
  const stop = extensionCredentialNetworkBridgeStart(page as unknown as Window & {
    XMLHttpRequest: typeof XMLHttpRequest
    HTMLFormElement: typeof HTMLFormElement
  })
  const body = { privateValue: "must-pass-through-unchanged" }
  const xhr = new FakeXMLHttpRequest()
  xhr.open("PATCH", "/session")
  xhr.send(body)
  expect(reports).toEqual([
    { source: "onewarden.credential-capture.v1", type: "network", method: "PATCH", url: "/session" },
  ])
  expect(bodies).toEqual([body])
  expect(JSON.stringify(reports)).not.toContain("privateValue")
  stop()
})
