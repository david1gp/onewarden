import { expect, test } from "bun:test"
import { extensionBackgroundRouterCreate } from "../../../src/extension/background/extensionBackgroundRouterCreate.js"
import type { ExtensionStorageAdapter } from "../../../src/extension/storage/extensionStorageAdapter.js"
import type { ExtensionStorageArea } from "../../../src/extension/storage/extensionStorageArea.js"
import { extensionStorageAdapterCreate } from "../../../src/extension/storage/extensionStorageAdapterCreate.js"
import { extensionStorageCreate } from "../../../src/extension/storage/extensionStorageCreate.js"
import { extensionStorageKeys } from "../../../src/extension/storage/extensionStorageKeys.js"
import type { ExtensionPersonalLoginCipher } from "../../../src/extension/crypto/extensionPersonalLoginCipherSchema.js"
import { extensionRuntimeMessageSend } from "../../../src/extension/messaging/extensionRuntimeMessageSend.js"
import type { ExtensionRuntimeMessage } from "../../../src/extension/messaging/extensionRuntimeMessageSchema.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"

type RouterOptions = Parameters<typeof extensionBackgroundRouterCreate>[0]
type RuntimeListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response: unknown) => void,
) => boolean | undefined

function storageAreaCreate() {
  const values = new Map<string, unknown>()
  const area: ExtensionStorageArea = {
    async get<T extends Record<string, unknown> = Record<string, unknown>>(keys?: string | string[] | null) {
      const requestedKeys =
        keys === undefined || keys === null ? [...values.keys()] : typeof keys === "string" ? [keys] : keys
      const result: Record<string, unknown> = {}
      for (const key of requestedKeys) {
        const value = values.get(key)
        if (value !== undefined) result[key] = value
      }
      return result as T
    },
    async set(items) {
      for (const [key, value] of Object.entries(items)) values.set(key, value)
    },
    async remove(keys) {
      for (const key of typeof keys === "string" ? [keys] : keys) values.delete(key)
    },
  }
  return { area, values }
}

function routerCreate() {
  const local = storageAreaCreate()
  const session = storageAreaCreate()
  const adapter: ExtensionStorageAdapter = extensionStorageAdapterCreate({ local: local.area, session: session.area })
  const storage = extensionStorageCreate(adapter)
  const cipher = {
    id: "matching-login",
    name: "Example login",
    notes: "A note",
    login: {
      username: "user",
      password: "password",
      uri: "https://example.test/login",
      uris: [{ uri: "https://example.test/login", match: 0 }],
    },
    fields: [{ name: "Recovery code", value: "secret", type: 1 }],
  } as unknown as ExtensionPersonalLoginCipher
  let listener: RuntimeListener = () => undefined
  const service = {
    start: async () => resultCreate(undefined),
    passwordLogin: async () => resultCreate(undefined),
    unlock: async () => resultCreate(undefined),
    conditionalSync: async () =>
      resultCreate({ status: "unchanged", changed: false, revisionDate: 1, lastSyncedAt: 2 }),
    manualSync: async () => resultCreate({ status: "synced", changed: true, revisionDate: 2, lastSyncedAt: 3 }),
    createLogin: async () => resultCreate({ cipher: { id: "created" } }),
    createLoginDraftSave: async () => resultCreate({ id: "draft", updatedAt: 4 }),
    createLoginDraftDiscard: async () => resultCreate(undefined),
    syncSnapshotLoad: async () => resultCreate({ ciphers: [cipher] }),
    lock: async () => resultCreate(undefined),
    logout: async () => resultCreate(undefined),
  } as unknown as RouterOptions["service"]
  const activeTab = { id: 7, url: "https://example.test/login", windowId: 3 }
  let fullWindowTab: { id: number; url: string; windowId: number } | null = null
  let listenerRegistered = false
  const contextFilters: { documentUrls?: string[] }[] = []
  const focusedTabs: { id: number; active: boolean }[] = []
  const createdWindows: { url: string | undefined }[] = []
  const fillCalls: { tabId: number; frameId: number | undefined; username: string | null; password: string | null }[] =
    []
  const router = extensionBackgroundRouterCreate({
    service,
    storage,
    runtime: {
      onMessageAddListener: (nextListener) => {
        listenerRegistered = true
        listener = nextListener
      },
      getURL: (path) => `chrome-extension://onewarden/${path}`,
      getContexts: async (filter) => {
        contextFilters.push(filter)
        return fullWindowTab === null ? [] : [{ tabId: fullWindowTab.id, windowId: fullWindowTab.windowId }]
      },
    },
    tabs: {
      query: async (query) => (query.url === undefined ? [activeTab] : fullWindowTab === null ? [] : [fullWindowTab]),
      update: async (tabId, update) => {
        if (update.active === true) focusedTabs.push({ id: tabId, active: true })
      },
    },
    scripting: {
      executeScript: async (target, credentials) => {
        fillCalls.push({ tabId: target.tabId, frameId: target.frameId, ...credentials })
        return resultCreate({ status: "filled", usernameFilled: true, passwordFilled: true })
      },
    },
    windows: {
      create: async (data) => {
        createdWindows.push({ url: data.url })
        fullWindowTab = { id: 9, url: data.url as string, windowId: 8 }
        return { id: 9 }
      },
      update: async () => {},
    },
  })
  return {
    local,
    session,
    storage,
    router,
    listener,
    listenerRead: () => listener,
    listenerRegistered,
    contextFilters,
    focusedTabs,
    createdWindows,
    fillCalls,
  }
}

test("extensionBackgroundRouterCreate registers synchronously and builds a site-scoped popup model", async () => {
  const context = routerCreate()
  expect(context.listenerRegistered).toBe(true)
  const email = "user@example.test"
  await context.storage.authSessionSave({
    accessToken: "access",
    refreshToken: "refresh",
    expiresAt: 1_756_368_000_000,
    tokenType: "Bearer",
    scope: "api offline_access",
    accountId: null,
    email,
  })
  await context.storage.sessionStateSave({ status: "unlocked", unlockedAt: 1_756_368_000_000 })

  const response = await context.router.messageHandle({ type: "viewModelLoad", surface: "popup" })
  expect(response).toMatchObject({
    success: true,
    data: {
      status: "ready",
      hostname: "example.test",
      logins: [{ id: "matching-login" }],
    },
  })

  let listenerResponse: unknown
  expect(context.listener({ type: "activeTabContextLookup" }, {}, (value: unknown) => (listenerResponse = value))).toBe(
    true,
  )
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(listenerResponse).toEqual({
    success: true,
    data: { tabId: 7, url: "https://example.test/login", hostname: "example.test", fillAvailable: true },
  })
})

test("extensionBackgroundRouterCreate focuses an existing full window or opens one", async () => {
  const context = routerCreate()
  const first = await context.router.fullWindowOpen()
  expect(first).toEqual({
    success: true,
    data: { created: true, url: "chrome-extension://onewarden/fullwindow/index.html" },
  })
  expect(context.createdWindows).toEqual([{ url: "chrome-extension://onewarden/fullwindow/index.html" }])

  const focused = await context.router.fullWindowOpen()
  expect(focused).toEqual({
    success: true,
    data: { created: false, url: "chrome-extension://onewarden/fullwindow/index.html" },
  })
  expect(context.focusedTabs).toEqual([{ id: 9, active: true }])
  expect(context.contextFilters).toEqual([
    { documentUrls: ["chrome-extension://onewarden/fullwindow/index.html"] },
    { documentUrls: ["chrome-extension://onewarden/fullwindow/index.html"] },
  ])
})

test("extensionBackgroundRouterCreate routes an explicit fill to the active tab without sending credentials in the request", async () => {
  const context = routerCreate()

  const response = await context.router.messageHandle({
    type: "loginFill",
    request: { loginId: "matching-login", frameId: 4 },
  })

  expect(response).toEqual({
    success: true,
    data: { status: "filled", usernameFilled: true, passwordFilled: true },
  })
  expect(context.fillCalls).toEqual([{ tabId: 7, frameId: 4, username: "user", password: "password" }])
})

test("typed runtime settings save persists custom environment data for a full-window reload", async () => {
  const context = routerCreate()
  const previousChrome = (globalThis as typeof globalThis & { chrome?: unknown }).chrome
  const chromeGlobal = globalThis as typeof globalThis & {
    chrome?: { runtime: { sendMessage: (message: ExtensionRuntimeMessage) => Promise<unknown> } }
  }
  chromeGlobal.chrome = {
    runtime: {
      sendMessage: (message) =>
        new Promise((resolve) => {
          context.listenerRead()(message, {}, (response) => resolve(JSON.parse(JSON.stringify(response))))
        }),
    },
  }

  try {
    const settings = {
      region: "selfHosted" as const,
      base: "https://vault.example.com",
      webVault: "https://web.example.com",
      api: "https://api.example.com",
      identity: "https://identity.example.com",
      icons: "https://icons.example.com",
      notifications: "https://notifications.example.com",
      events: "https://events.example.com",
    }
    const saveResult = await extensionRuntimeMessageSend({ type: "environmentSave", request: settings })

    expect(saveResult).toEqual({ success: true, data: null })
    expect(context.local.values.get(extensionStorageKeys.environmentSettings)).toMatchObject({
      source: {
        base: settings.base,
        webVault: settings.webVault,
        api: settings.api,
        identity: settings.identity,
        icons: settings.icons,
        notifications: settings.notifications,
        events: settings.events,
      },
    })

    const reloadResult = await extensionRuntimeMessageSend({
      type: "viewModelLoad",
      surface: "fullwindow",
    })

    expect(reloadResult).toMatchObject({
      success: true,
      data: {
        environment: settings,
      },
    })
  } finally {
    chromeGlobal.chrome = previousChrome as typeof chromeGlobal.chrome
  }
})
