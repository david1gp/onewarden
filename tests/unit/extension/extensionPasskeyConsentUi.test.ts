import { expect, test } from "bun:test"
import { extensionPasskeyConsentUiCreate } from "../../../src/extension/passkey/extensionPasskeyConsentUiCreate.js"
import type { ExtensionPasskeyConsentContext } from "../../../src/extension/passkey/extensionPasskeyConsentContextSchema.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../src/shared/result/resultErrorCreate.js"

const consentContext: ExtensionPasskeyConsentContext = {
  requestId: "request-1",
  operation: "create",
  rpId: "example.test",
  rpName: "Example",
  userName: "user@example.test",
  userId: "dXNlcg",
  credentialId: null,
  cipherId: null,
  allowCredentialIds: [],
  userVerification: "required",
  clientDataJSON: "client-data",
  expiresAt: 70_000,
}

function cipherCreate(revisionDate = "2026-08-31T00:00:00.000Z", edit = true) {
  return {
    object: "cipherDetails" as const,
    id: "login-1",
    type: 1 as const,
    revisionDate,
    deletedDate: null,
    organizationId: edit ? null : "organization-1",
    name: "Example login",
    notes: null,
    edit,
    login: { username: "user@example.test", password: null, uris: [], totp: null, fido2Credentials: [] },
    fields: [],
  }
}

function consentUiCreate(options: { locked?: boolean; edit?: boolean } = {}) {
  let locked = options.locked ?? false
  let revisionDate = "2026-08-31T00:00:00.000Z"
  let unlockCalls = 0
  let removedListener: (windowId: number) => void = () => {}
  const ui = extensionPasskeyConsentUiCreate({
    now: () => 10_000,
    urlCreate: (path) => `chrome-extension://onewarden/${path}`,
    windows: {
      create: async () => ({ id: 42 }),
      onRemovedAddListener: (listener) => {
        removedListener = listener
      },
    },
    service: {
      unlock: async (request: unknown) => {
        const password = (request as { password?: unknown }).password
        unlockCalls += 1
        if (password !== "correct")
          return resultErrorCreate("test.unlock", "Incorrect password.", {
            code: "platform.unauthorized",
            statusCode: 401,
          })
        locked = false
        return resultCreate(undefined)
      },
      syncSnapshotLoad: async () =>
        locked
          ? resultErrorCreate("test.sync", "Vault is locked.", {
              code: "platform.unauthorized",
              statusCode: 401,
            })
          : resultCreate({ ciphers: [cipherCreate(revisionDate, options.edit ?? true)] }),
    },
  })
  return {
    ui,
    unlockCalls: () => unlockCalls,
    removeWindow: () => removedListener(42),
    conflict: () => {
      revisionDate = "2026-08-31T00:01:00.000Z"
    },
  }
}

test("passkey consent requires fresh verification and returns the selected credential", async () => {
  const context = consentUiCreate()
  const consentPromise = context.ui.open(consentContext)
  await Promise.resolve()

  expect(await context.ui.load("request-1")).toMatchObject({
    success: true,
    data: { verificationRequired: true, verified: false, candidates: [] },
  })
  expect(context.unlockCalls()).toBe(0)
  expect(await context.ui.verify("request-1", "correct")).toMatchObject({
    success: true,
    data: { verified: true, locked: false, candidates: [{ cipherId: "login-1", readOnly: false }] },
  })
  expect(context.unlockCalls()).toBe(1)
  expect(
    await context.ui.approve({
      requestId: "request-1",
      cipherId: "login-1",
      credentialId: null,
      revisionDate: "2026-08-31T00:00:00.000Z",
    }),
  ).toEqual({ success: true, data: undefined })
  expect(await consentPromise).toEqual({
    requestId: "request-1",
    approved: true,
    userVerified: true,
    cipherId: "login-1",
    credentialId: undefined,
  })
})

test("passkey consent supports locked-vault verification and window cancellation", async () => {
  const context = consentUiCreate({ locked: true })
  const openContext = { ...consentContext, userVerification: "discouraged" as const }
  const consentPromise = context.ui.open(openContext)
  await Promise.resolve()
  expect(await context.ui.load("request-1")).toMatchObject({ success: true, data: { locked: true } })
  expect(await context.ui.verify("request-1", "wrong")).toMatchObject({ success: false, statusCode: 401 })
  context.removeWindow()
  expect(await consentPromise).toBeNull()
})

test("passkey consent rejects read-only organization selections", async () => {
  const context = consentUiCreate({ edit: false })
  const openContext = { ...consentContext, userVerification: "discouraged" as const }
  const consentPromise = context.ui.open(openContext)
  await Promise.resolve()
  const loaded = await context.ui.load("request-1")
  expect(loaded).toMatchObject({
    success: true,
    data: { candidates: [{ cipherId: "login-1", organization: true, readOnly: true }] },
  })
  expect(
    await context.ui.approve({
      requestId: "request-1",
      cipherId: "login-1",
      credentialId: null,
      revisionDate: "2026-08-31T00:00:00.000Z",
    }),
  ).toMatchObject({ success: false, statusCode: 403 })
  context.ui.cancel("request-1")
  expect(await consentPromise).toBeNull()
})

test("passkey consent keeps the request open after a conflicting update", async () => {
  const context = consentUiCreate()
  const consentPromise = context.ui.open(consentContext)
  await Promise.resolve()
  await context.ui.verify("request-1", "correct")
  context.conflict()
  expect(
    await context.ui.approve({
      requestId: "request-1",
      cipherId: "login-1",
      credentialId: null,
      revisionDate: "2026-08-31T00:00:00.000Z",
    }),
  ).toMatchObject({ success: false, statusCode: 409 })
  expect((await context.ui.load("request-1")).success).toBe(true)
  context.ui.cancel("request-1")
  expect(await consentPromise).toBeNull()
})
