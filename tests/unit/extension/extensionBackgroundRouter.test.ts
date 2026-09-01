import { expect, test } from "bun:test"
import { extensionBackgroundRouterCreate } from "../../../src/extension/background/extensionBackgroundRouterCreate.js"
import type { ExtensionPersonalLoginCipher } from "../../../src/extension/crypto/extensionPersonalLoginCipherSchema.js"
import type { ExtensionLogin } from "../../../src/extension/ExtensionLogin.js"
import type { ExtensionRuntimeMessage } from "../../../src/extension/messaging/extensionRuntimeMessageSchema.js"
import { extensionRuntimeMessageSend } from "../../../src/extension/messaging/extensionRuntimeMessageSend.js"
import type { ExtensionLockPolicy } from "../../../src/extension/storage/extensionLockPolicySchema.js"
import type { ExtensionStorageAdapter } from "../../../src/extension/storage/extensionStorageAdapter.js"
import { extensionStorageAdapterCreate } from "../../../src/extension/storage/extensionStorageAdapterCreate.js"
import type { ExtensionStorageArea } from "../../../src/extension/storage/extensionStorageArea.js"
import { extensionStorageCreate } from "../../../src/extension/storage/extensionStorageCreate.js"
import { extensionStorageKeys } from "../../../src/extension/storage/extensionStorageKeys.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { vaultSortApply } from "../../../src/shared/vault/vaultSortApply.js"

type SnapshotCipherOverride = Pick<ExtensionPersonalLoginCipher, "id" | "name" | "creationDate" | "revisionDate">

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

function routerCreate(
  activeTab = { id: 7, url: "https://example.test/login", windowId: 3 },
  otherActiveTabs = [activeTab],
  snapshotCipherOverrides?: SnapshotCipherOverride[],
) {
  const local = storageAreaCreate()
  const session = storageAreaCreate()
  const adapter: ExtensionStorageAdapter = extensionStorageAdapterCreate({ local: local.area, session: session.area })
  const storage = extensionStorageCreate(adapter)
  const cipher = {
    id: "matching-login",
    creationDate: "2026-08-01T00:00:00.000Z",
    revisionDate: "2026-09-01T00:00:00.000Z",
    name: "Example login",
    notes: "A note",
    login: {
      username: "user",
      password: "password",
      totp: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
      uri: "https://example.test/login",
      uris: [
        { uri: "https://example.test/login", match: 0 },
        { uri: "https://example.test/account", match: 0 },
      ],
    },
    fields: [
      { name: "Recovery code", value: "secret-1", type: 1 },
      { name: "Recovery code", value: "secret-2", type: 1 },
      { name: null, value: "unnamed", type: 0 },
      { name: "Empty", value: "", type: 0 },
      { name: "Linked", value: null, type: 2 },
    ],
  } as unknown as ExtensionPersonalLoginCipher
  const snapshotCiphers: ExtensionPersonalLoginCipher[] = snapshotCipherOverrides?.map((overrides) => ({
    ...cipher,
    ...overrides,
  })) ?? [cipher]
  const mutationCipher = {
    object: "cipherDetails" as const,
    id: "mutation-cipher",
    type: 1 as const,
    creationDate: "2026-08-28T00:00:00.000Z",
    revisionDate: "2026-08-28T00:00:00.000Z",
    deletedDate: null,
    organizationId: null,
    folderId: null,
    name: "Mutation cipher",
    notes: null,
    favorite: false,
    login: { username: "user", password: "password", uris: [], uri: null, totp: null },
    fields: [],
  }
  let listener: RuntimeListener = () => undefined
  const handoffCalls: {
    operation: string
    cipherId: string | null
    webVaultOrigin: string
    prefillUrl: string | null
  }[] = []
  const vaultSearchCalls: unknown[] = []
  const cipherDetailReadCalls: unknown[] = []
  const cipherMutationCalls: { type: string; request: unknown }[] = []
  const folderCalls: { type: string; request: unknown }[] = []
  const collectionCalls: { type: string; request: unknown }[] = []
  const service = {
    start: async () => resultCreate(undefined),
    passwordLogin: async () => resultCreate(undefined),
    unlock: async () => resultCreate(undefined),
    conditionalSync: async () =>
      resultCreate({ status: "unchanged", changed: false, revisionDate: 1, lastSyncedAt: 2 }),
    manualSync: async () => resultCreate({ status: "synced", changed: true, revisionDate: 2, lastSyncedAt: 3 }),
    vaultSearch: async (request: unknown) => {
      vaultSearchCalls.push(request)
      return resultCreate({ ciphers: [], folders: [], collections: [] })
    },
    cipherDetailRead: async (request: unknown) => {
      cipherDetailReadCalls.push(request)
      return resultCreate({
        object: "cipherDetails" as const,
        id: "matching-login",
        type: 1 as const,
        creationDate: "2026-08-28T00:00:00.000Z",
        revisionDate: "2026-08-28T00:00:00.000Z",
        deletedDate: null,
        organizationId: null,
        folderId: null,
        name: "Example login",
        notes: "A note",
        login: { username: "user", password: "password", uris: [], uri: null, totp: null },
        fields: [],
      })
    },
    cipherCreate: async (request: unknown) => {
      cipherMutationCalls.push({ type: "create", request })
      return resultCreate(mutationCipher)
    },
    cipherUpdate: async (request: unknown) => {
      cipherMutationCalls.push({ type: "update", request })
      return resultCreate(mutationCipher)
    },
    cipherPartial: async (request: unknown) => {
      cipherMutationCalls.push({ type: "partial", request })
      return resultCreate(mutationCipher)
    },
    cipherDelete: async (request: unknown) => {
      cipherMutationCalls.push({ type: "delete", request })
      return resultCreate(undefined)
    },
    cipherRestore: async (request: unknown) => {
      cipherMutationCalls.push({ type: "restore", request })
      return resultCreate(mutationCipher)
    },
    cipherArchive: async (request: unknown) => {
      cipherMutationCalls.push({ type: "archive", request })
      return resultCreate(mutationCipher)
    },
    cipherMove: async (request: unknown) => {
      cipherMutationCalls.push({ type: "move", request })
      return resultCreate(undefined)
    },
    cipherCollectionsUpdate: async (request: unknown) => {
      cipherMutationCalls.push({ type: "collections", request })
      return resultCreate(mutationCipher)
    },
    folderList: async (request: unknown) => {
      folderCalls.push({ type: "list", request })
      return resultCreate([{ id: "folder-id", name: "Folder", object: "folder" as const }])
    },
    folderRead: async (request: unknown) => {
      folderCalls.push({ type: "read", request })
      return resultCreate({ id: "folder-id", name: "Folder", object: "folder" as const })
    },
    folderCreate: async (request: unknown) => {
      folderCalls.push({ type: "create", request })
      return resultCreate({ id: "folder-id", name: "Folder", object: "folder" as const })
    },
    folderUpdate: async (request: unknown) => {
      folderCalls.push({ type: "update", request })
      return resultCreate({ id: "folder-id", name: "Folder", object: "folder" as const })
    },
    folderDelete: async (request: unknown) => {
      folderCalls.push({ type: "delete", request })
      return resultCreate(undefined)
    },
    collectionList: async (request: unknown) => {
      collectionCalls.push({ type: "list", request })
      return resultCreate([{ id: "collection-id", organizationId: "organization-id", name: "Collection" }])
    },
    collectionRead: async (request: unknown) => {
      collectionCalls.push({ type: "read", request })
      return resultCreate({ id: "collection-id", organizationId: "organization-id", name: "Collection" })
    },
    collectionCreate: async (request: unknown) => {
      collectionCalls.push({ type: "create", request })
      return resultCreate({ id: "collection-id", organizationId: "organization-id", name: "Collection" })
    },
    collectionUpdate: async (request: unknown) => {
      collectionCalls.push({ type: "update", request })
      return resultCreate({ id: "collection-id", organizationId: "organization-id", name: "Collection" })
    },
    collectionDelete: async (request: unknown) => {
      collectionCalls.push({ type: "delete", request })
      return resultCreate(undefined)
    },
    sessionHandoffCreate: async (
      operation: "create" | "edit",
      cipherId: string | null,
      webVaultOrigin: string,
      prefillUrl: string | null,
    ) => {
      handoffCalls.push({ operation, cipherId, webVaultOrigin, prefillUrl })
      return resultCreate(`${webVaultOrigin}/ciphers/${operation === "create" ? "new" : `${cipherId}/edit`}#handoff`)
    },
    syncSnapshotLoad: async () => resultCreate({ ciphers: snapshotCiphers }),
    lock: async () => resultCreate(undefined),
    logout: async () => resultCreate(undefined),
    lockPolicyLoad: async () => storage.lockPolicyLoad(),
    lockPolicySave: async (policy: ExtensionLockPolicy) => storage.lockPolicySave(policy),
  } as unknown as RouterOptions["service"]
  let fullWindowTab: { id: number; url: string; windowId: number } | null = null
  let listenerRegistered = false
  const contextFilters: { documentUrls?: string[] }[] = []
  const focusedTabs: { id: number; active: boolean; url?: string }[] = []
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
        if (fullWindowTab === null) return []
        const documentUrl = fullWindowTab.url
        const matches =
          filter.documentUrls === undefined ||
          filter.documentUrls.some((candidate) =>
            candidate.endsWith("*") ? documentUrl.startsWith(candidate.slice(0, -1)) : documentUrl === candidate,
          )
        return matches ? [{ tabId: fullWindowTab.id, windowId: fullWindowTab.windowId }] : []
      },
    },
    tabs: {
      query: async (query) => {
        if (query.url !== undefined) return fullWindowTab === null ? [] : [fullWindowTab]
        return query.lastFocusedWindow === true ? [activeTab] : otherActiveTabs
      },
      update: async (tabId, update) => {
        if (update.url !== undefined && fullWindowTab !== null) fullWindowTab = { ...fullWindowTab, url: update.url }
        if (update.active === true)
          focusedTabs.push({ id: tabId, active: true, ...(update.url ? { url: update.url } : {}) })
      },
    },
    scripting: {
      executeScript: async (target, credentials) => {
        fillCalls.push({ tabId: target.tabId, frameId: target.frameId, ...credentials })
        return resultCreate({ status: "filled", usernameFilled: true, passwordFilled: true })
      },
    },
    now: () => 59_000,
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
    handoffCalls,
    vaultSearchCalls,
    cipherDetailReadCalls,
    cipherMutationCalls,
    folderCalls,
    collectionCalls,
    fullWindowTabSet: (url: string) => {
      if (fullWindowTab !== null) fullWindowTab = { ...fullWindowTab, url }
    },
  }
}

test("extensionBackgroundRouterCreate validates and routes read-only vault search messages", async () => {
  const context = routerCreate()

  expect(await context.router.messageHandle({ type: "vaultSearch", request: { query: "example" } })).toEqual({
    success: true,
    data: { ciphers: [], folders: [], collections: [] },
  })
  expect(context.vaultSearchCalls).toEqual([
    {
      query: "example",
      includeDeleted: false,
      includeArchived: false,
    },
  ])
  expect((await context.router.messageHandle({ type: "vaultSearch", request: {} })).success).toBe(true)
  expect((await context.router.messageHandle({ type: "vaultSearch" })).success).toBe(false)
  expect(
    (await context.router.messageHandle({ type: "vaultSearch", request: { query: "example", secret: true } })).success,
  ).toBe(false)
  expect(context.vaultSearchCalls).toHaveLength(2)
})

test("extensionBackgroundRouterCreate routes explicit typed cipher detail reads", async () => {
  const context = routerCreate()

  expect(
    await context.router.messageHandle({ type: "cipherDetailRead", request: { cipherId: "matching-login" } }),
  ).toEqual({
    success: true,
    data: {
      object: "cipherDetails",
      id: "matching-login",
      type: 1,
      creationDate: "2026-08-28T00:00:00.000Z",
      revisionDate: "2026-08-28T00:00:00.000Z",
      deletedDate: null,
      organizationId: null,
      folderId: null,
      name: "Example login",
      notes: "A note",
      login: { username: "user", password: "password", uris: [], uri: null, totp: null },
      fields: [],
    },
  })
  expect(context.cipherDetailReadCalls).toEqual([{ cipherId: "matching-login" }])
  expect((await context.router.messageHandle({ type: "cipherDetailRead", request: {} })).success).toBe(false)
  expect((await context.router.messageHandle({ type: "cipherDetailRead" })).success).toBe(false)
})

test("extensionBackgroundRouterCreate routes every generic cipher mutation command", async () => {
  const context = routerCreate()
  const cipher = {
    object: "cipherDetails" as const,
    id: "mutation-cipher",
    type: 1 as const,
    creationDate: "2026-08-28T00:00:00.000Z",
    revisionDate: "2026-08-28T00:00:00.000Z",
    deletedDate: null,
    organizationId: null,
    folderId: null,
    name: "Mutation cipher",
    notes: null,
    favorite: false,
    login: { username: "user", password: "password", uris: [], uri: null, totp: null },
    fields: [],
  }
  const requests: ExtensionRuntimeMessage[] = [
    { type: "cipherCreate", request: { cipher } },
    { type: "cipherUpdate", request: { cipherId: cipher.id, cipher } },
    { type: "cipherPartial", request: { cipherId: cipher.id, favorite: true } },
    { type: "cipherDelete", request: { cipherId: cipher.id } },
    { type: "cipherRestore", request: { cipherId: cipher.id } },
    { type: "cipherArchive", request: { cipherId: cipher.id } },
    { type: "cipherMove", request: { ids: [cipher.id], folderId: null } },
    { type: "cipherCollectionsUpdate", request: { cipherId: cipher.id, collectionIds: [] } },
  ]
  for (const request of requests) expect((await context.router.messageHandle(request)).success).toBe(true)
  expect(context.cipherMutationCalls.map((entry) => entry.type)).toEqual([
    "create",
    "update",
    "partial",
    "delete",
    "restore",
    "archive",
    "move",
    "collections",
  ])
  expect(
    (await context.router.messageHandle({ type: "cipherDelete", request: { cipherId: cipher.id, hard: "yes" } }))
      .success,
  ).toBe(false)
})

test("extensionBackgroundRouterCreate routes and validates every folder command", async () => {
  const context = routerCreate()
  const folder = { id: "folder-id", name: "Folder", object: "folder" as const }
  const requests: ExtensionRuntimeMessage[] = [
    { type: "folderList", request: {} },
    { type: "folderRead", request: { folderId: folder.id } },
    { type: "folderCreate", request: { folder } },
    { type: "folderUpdate", request: { folderId: folder.id, folder } },
    { type: "folderDelete", request: { folderId: folder.id } },
  ]

  for (const request of requests) expect((await context.router.messageHandle(request)).success).toBe(true)
  expect(context.folderCalls.map((entry) => entry.type)).toEqual(["list", "read", "create", "update", "delete"])
  expect((await context.router.messageHandle({ type: "folderRead", request: {} })).success).toBe(false)
  expect((await context.router.messageHandle({ type: "folderList", request: { extra: true } })).success).toBe(false)
})

test("extensionBackgroundRouterCreate routes and validates every collection command", async () => {
  const context = routerCreate()
  const collection = { id: "collection-id", organizationId: "organization-id", name: "Collection" }
  const requests: ExtensionRuntimeMessage[] = [
    { type: "collectionList", request: { organizationId: collection.organizationId } },
    {
      type: "collectionRead",
      request: { organizationId: collection.organizationId, collectionId: collection.id },
    },
    { type: "collectionCreate", request: { organizationId: collection.organizationId, collection } },
    {
      type: "collectionUpdate",
      request: { organizationId: collection.organizationId, collectionId: collection.id, collection },
    },
    { type: "collectionDelete", request: { organizationId: collection.organizationId, collectionId: collection.id } },
  ]

  for (const request of requests) expect((await context.router.messageHandle(request)).success).toBe(true)
  expect(context.collectionCalls.map((entry) => entry.type)).toEqual(["list", "read", "create", "update", "delete"])
  expect(
    (await context.router.messageHandle({ type: "collectionRead", request: { collectionId: collection.id } })).success,
  ).toBe(false)
  expect(
    (await context.router.messageHandle({ type: "collectionList", request: { organizationId: "" } })).success,
  ).toBe(false)
})

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
      logins: [
        {
          id: "matching-login",
          creationDate: "2026-08-01T00:00:00.000Z",
          revisionDate: "2026-09-01T00:00:00.000Z",
          copyableFields: [
            { key: "username", label: "Username", value: "user" },
            { key: "password", label: "Password", value: "password", sensitive: true },
            { key: "uri:0", label: "URI 1", value: "https://example.test/login" },
            { key: "uri:1", label: "URI 2", value: "https://example.test/account" },
            { key: "notes", label: "Notes", value: "A note" },
            { key: "custom:0", label: "Recovery code", value: "secret-1", sensitive: true },
            { key: "custom:1", label: "Recovery code", value: "secret-2", sensitive: true },
            { key: "custom:2", label: "Custom field 3", value: "unnamed" },
            { key: "custom:3", label: "Empty", value: "" },
          ],
        },
      ],
    },
  })
  expect(JSON.stringify(response)).not.toContain("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ")
  const responseData = response.success
    ? (response.data as { status?: string; logins?: { totpAvailable?: boolean }[] })
    : null
  expect(responseData?.status === "ready" ? responseData.logins?.[0]?.totpAvailable : null).toBe(true)
  const fullWindowResponse = await context.router.messageHandle({ type: "viewModelLoad", surface: "fullwindow" })
  expect(fullWindowResponse).toMatchObject({
    success: true,
    data: {
      logins: [{ creationDate: "2026-08-01T00:00:00.000Z", revisionDate: "2026-09-01T00:00:00.000Z" }],
    },
  })
  expect(await context.router.messageHandle({ type: "totpCopy", request: { loginId: "matching-login" } })).toEqual({
    success: true,
    data: "287082",
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

test("extensionBackgroundRouterCreate preserves equal fixture timestamps through ExtensionLogin and shared sorting", async () => {
  const context = routerCreate(undefined, undefined, [
    {
      id: "cipher-aws-prod",
      name: "AWS Production Console",
      creationDate: "2026-08-01T00:00:00.000Z",
      revisionDate: "2026-08-28T00:00:00.000Z",
    },
    {
      id: "cipher-secure-note",
      name: "Server Backup Recovery Key",
      creationDate: "2026-08-01T00:00:00.000Z",
      revisionDate: "2026-08-28T00:00:00.000Z",
    },
    {
      id: "cipher-card",
      name: "Corporate Purchasing Card",
      creationDate: "2026-08-01T00:00:00.000Z",
      revisionDate: "2026-08-28T00:00:00.000Z",
    },
  ])
  await context.storage.authSessionSave({
    accessToken: "access",
    refreshToken: "refresh",
    expiresAt: 1_756_368_000_000,
    tokenType: "Bearer",
    scope: "api offline_access",
    accountId: null,
    email: "user@example.test",
  })
  await context.storage.sessionStateSave({ status: "unlocked", unlockedAt: 1_756_368_000_000 })

  const response = await context.router.messageHandle({ type: "viewModelLoad", surface: "fullwindow" })
  expect(response.success).toBe(true)
  if (!response.success) return
  const logins = (response.data as { logins: ExtensionLogin[] }).logins

  expect(logins.map(({ name, creationDate, revisionDate }) => ({ name, creationDate, revisionDate }))).toEqual([
    {
      name: "AWS Production Console",
      creationDate: "2026-08-01T00:00:00.000Z",
      revisionDate: "2026-08-28T00:00:00.000Z",
    },
    {
      name: "Server Backup Recovery Key",
      creationDate: "2026-08-01T00:00:00.000Z",
      revisionDate: "2026-08-28T00:00:00.000Z",
    },
    {
      name: "Corporate Purchasing Card",
      creationDate: "2026-08-01T00:00:00.000Z",
      revisionDate: "2026-08-28T00:00:00.000Z",
    },
  ])
  for (const sort of ["created-newest", "created-oldest", "updated-newest", "updated-oldest"] as const) {
    expect(vaultSortApply(logins, sort).map(({ name }) => name)).toEqual([
      "AWS Production Console",
      "Corporate Purchasing Card",
      "Server Backup Recovery Key",
    ])
  }
})

test("extensionBackgroundRouterCreate retains a website context while the full-window extension is focused", async () => {
  const context = routerCreate({ id: 9, url: "chrome-extension://onewarden/fullwindow/index.html", windowId: 8 }, [
    { id: 9, url: "chrome-extension://onewarden/fullwindow/index.html", windowId: 8 },
    { id: 7, url: "https://example.test/login", windowId: 3 },
  ])

  expect(await context.router.activeTabContextLookup()).toEqual({
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
    { documentUrls: ["chrome-extension://onewarden/fullwindow/index.html*"] },
    { documentUrls: ["chrome-extension://onewarden/fullwindow/index.html*"] },
  ])
})

test("extensionBackgroundRouterCreate opens and retargets a full-window pane", async () => {
  const context = routerCreate()

  expect(await context.router.messageHandle({ type: "fullWindowOpen", pane: "generator" })).toEqual({
    success: true,
    data: { created: true, url: "chrome-extension://onewarden/fullwindow/index.html?pane=generator" },
  })
  context.fullWindowTabSet("chrome-extension://onewarden/fullwindow/index.html?pane=generator&q=mail&login=login-1")
  expect(await context.router.messageHandle({ type: "fullWindowOpen", pane: "settings" })).toEqual({
    success: true,
    data: { created: false, url: "chrome-extension://onewarden/fullwindow/index.html?pane=settings" },
  })
  expect(context.focusedTabs).toEqual([
    { id: 9, active: true, url: "chrome-extension://onewarden/fullwindow/index.html?pane=settings" },
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

test("extensionBackgroundRouterCreate opens create and edit handoffs at the configured web origin", async () => {
  const context = routerCreate()
  await context.storage.environmentSettingsSave({
    base: "https://api.onewarden.test",
    webVault: "https://onewarden.test",
  })

  const createResult = await context.router.messageHandle({
    type: "sessionHandoffOpen",
    request: { operation: "create", cipherId: null },
  })
  const editResult = await context.router.messageHandle({
    type: "sessionHandoffOpen",
    request: { operation: "edit", cipherId: "matching-login" },
  })

  expect(createResult.success).toBe(true)
  expect(editResult.success).toBe(true)
  expect(context.handoffCalls).toEqual([
    {
      operation: "create",
      cipherId: null,
      webVaultOrigin: "https://onewarden.test",
      prefillUrl: "https://example.test/login",
    },
    {
      operation: "edit",
      cipherId: "matching-login",
      webVaultOrigin: "https://onewarden.test",
      prefillUrl: null,
    },
  ])
  expect(context.createdWindows.map((entry) => entry.url)).toEqual([
    "https://onewarden.test/ciphers/new#handoff",
    "https://onewarden.test/ciphers/matching-login/edit#handoff",
  ])
})

test("extensionBackgroundRouterCreate rejects obsolete normal local create and draft actions", async () => {
  const context = routerCreate()

  expect(
    (
      await context.router.messageHandle({
        type: "createLogin",
        request: { name: "Local form mutation" },
      })
    ).success,
  ).toBe(false)
  expect((await context.router.messageHandle({ type: "draftSave", request: {} })).success).toBe(false)
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

test("extensionBackgroundRouterCreate loads and saves the typed lock policy messages", async () => {
  const context = routerCreate()
  const policy = { action: "logout" as const, timeoutMinutes: null }
  const runtimeMessageSend = (message: unknown) =>
    new Promise<unknown>((resolve) => context.listener(message, {}, resolve))

  expect(await runtimeMessageSend({ type: "lockPolicySave", request: policy })).toEqual({ success: true, data: null })
  expect(await runtimeMessageSend({ type: "lockPolicyLoad" })).toEqual({ success: true, data: policy })
  expect(await context.router.messageHandle({ type: "lockPolicyLoad" })).toEqual({ success: true, data: policy })
  expect(await context.router.messageHandle({ type: "viewModelLoad", surface: "fullwindow" })).toMatchObject({
    success: true,
    data: { lockPolicy: policy },
  })
  expect((await context.router.messageHandle({ type: "lockPolicySave", request: { action: "invalid" } })).success).toBe(
    false,
  )
})
