import { extensionAlarmsAdapterCreate } from "./extensionAlarmsAdapterCreate.js"
import { extensionBackgroundApiClientCreate } from "./extensionBackgroundApiClientCreate.js"
import { extensionBackgroundRouterCreate } from "./extensionBackgroundRouterCreate.js"
import { extensionBackgroundServiceCreate } from "./extensionBackgroundServiceCreate.js"
import { extensionScriptingAdapterCreate } from "./extensionScriptingAdapterCreate.js"
import type { ExtensionRuntimeAdapter } from "./extensionRuntimeAdapter.js"
import type { ExtensionTabsAdapter } from "./extensionTabsAdapter.js"
import type { ExtensionWindowsAdapter } from "./extensionWindowsAdapter.js"
import { extensionStorageAdapterCreate } from "../storage/extensionStorageAdapterCreate.js"
import { extensionStorageCreate } from "../storage/extensionStorageCreate.js"
import { extensionVaultSessionCreate } from "../session/extensionVaultSessionCreate.js"

/** Entry point of the MV3 service worker. Listener registration stays synchronous. */
export function extensionBackgroundStart(): void {
  const storage = extensionStorageCreate(extensionStorageAdapterCreate(chrome.storage))
  const vaultSession = extensionVaultSessionCreate(storage)
  const service = extensionBackgroundServiceCreate({
    apiClient: extensionBackgroundApiClientCreate(storage),
    storage,
    vaultSession,
    alarms: extensionAlarmsAdapterCreate(chrome.alarms),
  })

  const runtime: ExtensionRuntimeAdapter = {
    onMessageAddListener: (listener) => {
      chrome.runtime.onMessage.addListener(listener as Parameters<typeof chrome.runtime.onMessage.addListener>[0])
    },
    getURL: (path) => chrome.runtime.getURL(path),
    getContexts: async ({ documentUrls }) => {
      const contexts = await chrome.runtime.getContexts({ documentUrls, contextTypes: ["TAB"] })
      return contexts.map((context) => ({ tabId: context.tabId, windowId: context.windowId }))
    },
  }
  const tabs: ExtensionTabsAdapter = {
    query: async (query) => {
      const result = await chrome.tabs.query(query)
      return result.map((tab) => ({ id: tab.id, url: tab.url, windowId: tab.windowId }))
    },
    update: async (tabId, updateProperties) => {
      await chrome.tabs.update(tabId, updateProperties)
    },
  }
  const windows: ExtensionWindowsAdapter = {
    create: async (createData) => {
      const result = await chrome.windows.create(createData)
      return { id: result?.id }
    },
    update: async (windowId, updateInfo) => {
      await chrome.windows.update(windowId, updateInfo)
    },
  }

  const router = extensionBackgroundRouterCreate({
    storage,
    runtime,
    tabs,
    windows,
    scripting: extensionScriptingAdapterCreate(chrome.scripting),
    service,
  })
  void router.initialize().then((result) => {
    if (!result.success) console.error(result.errorMessage)
  })
  chrome.runtime.onInstalled.addListener(() => {
    console.info("OneWarden extension installed")
  })
}

extensionBackgroundStart()
