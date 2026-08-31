import * as v from "valibot"
import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { totpCodeCreate } from "../../shared/totp/totpCodeCreate.js"
import { extensionEnvironmentResolve } from "../api/extensionEnvironmentResolve.js"
import {
  type ExtensionEnvironmentSource,
  extensionEnvironmentSourceSchema,
} from "../api/extensionEnvironmentSourceSchema.js"
import { type ExtensionCreateLoginRequest } from "../create/extensionCreateLoginRequestSchema.js"
import type { ExtensionPersonalLoginCipher } from "../crypto/extensionPersonalLoginCipherSchema.js"
import type { ExtensionLoginFillData } from "../fill/extensionLoginFillDataSchema.js"
import type { ExtensionLoginFillRequest } from "../fill/extensionLoginFillRequestSchema.js"
import type { ExtensionFullWindowEnvironmentSettings } from "../fullwindow/ExtensionFullWindowEnvironmentSettings.js"
import type { ExtensionFullWindowViewModel } from "../fullwindow/ExtensionFullWindowViewModel.js"
import { extensionFullWindowViewModelCreate } from "../fullwindow/extensionFullWindowViewModelCreate.js"
import {
  type ExtensionRuntimeMessage,
  extensionRuntimeMessageSchema,
} from "../messaging/extensionRuntimeMessageSchema.js"
import { extensionRuntimeResponseSchema } from "../messaging/extensionRuntimeResponseSchema.js"
import type { ExtensionPopupLogin } from "../popup/ExtensionPopupLogin.js"
import type { ExtensionPopupViewModel } from "../popup/ExtensionPopupViewModel.js"
import { extensionPopupViewModelCreate } from "../popup/extensionPopupViewModelCreate.js"
import { extensionStorageCreate } from "../storage/extensionStorageCreate.js"
import { type ExtensionActiveTabContext, extensionActiveTabContextSchema } from "./extensionActiveTabContextSchema.js"
import type { extensionBackgroundServiceCreate } from "./extensionBackgroundServiceCreate.js"
import { extensionPersonalLoginSiteMatch } from "./extensionPersonalLoginSiteMatch.js"
import type { ExtensionRuntimeAdapter } from "./extensionRuntimeAdapter.js"
import type { ExtensionScriptingAdapter } from "./extensionScriptingAdapter.js"
import type { ExtensionTabsAdapter } from "./extensionTabsAdapter.js"
import type { ExtensionWindowsAdapter } from "./extensionWindowsAdapter.js"

type ExtensionBackgroundService = Pick<
  ReturnType<typeof extensionBackgroundServiceCreate>,
  | "start"
  | "passwordLogin"
  | "unlock"
  | "conditionalSync"
  | "manualSync"
  | "createLogin"
  | "createLoginDraftSave"
  | "createLoginDraftDiscard"
  | "syncSnapshotLoad"
  | "lock"
  | "logout"
>
type ExtensionStorage = ReturnType<typeof extensionStorageCreate>
type ExtensionViewModel = ExtensionPopupViewModel | ExtensionFullWindowViewModel

type ExtensionBackgroundRouterOptions = {
  service: ExtensionBackgroundService
  storage: ExtensionStorage
  runtime: ExtensionRuntimeAdapter
  tabs: ExtensionTabsAdapter
  windows: ExtensionWindowsAdapter
  scripting: ExtensionScriptingAdapter
  now?: () => number
  fullWindowPath?: string
}

type ExtensionLoginViewData = {
  id: string
  name: string
  username: string | null
  uri: string | null
  totpAvailable: boolean
  copyableFields: {
    key: string
    label: string
    value: string
    sensitive?: boolean
  }[]
}

const extensionEnvironmentSettingsRequestSchema = v.strictObject({
  region: v.picklist(["us", "eu", "selfHosted"]),
  base: v.string(),
  webVault: v.string(),
  api: v.string(),
  identity: v.string(),
  icons: v.string(),
  notifications: v.string(),
  events: v.string(),
})

function invalid<T>(op: string, message: string, errorData?: string): Result<T> {
  return resultErrorCreate(op, message, {
    code: "platform.invalid-request",
    statusCode: 400,
    errorData,
  })
}

function unavailable<T>(op: string, message: string): Result<T> {
  return resultErrorCreate(op, message, { code: "platform.unavailable", statusCode: 503 })
}

function internal<T>(op: string, message: string): Result<T> {
  return resultErrorCreate(op, message, { code: "platform.internal", statusCode: 500 })
}

function requestRead(request: unknown, op: string): Result<unknown> {
  if (request !== undefined) return resultCreate(request)
  return invalid(op, "Runtime message request is required.")
}

function extensionActiveTabContextCreate(tab: {
  id: number | undefined
  url: string | undefined
}): ExtensionActiveTabContext {
  const tabId = Number.isSafeInteger(tab.id) && (tab.id as number) >= 0 ? (tab.id as number) : null
  const url = typeof tab.url === "string" ? tab.url : null
  const parsedUrl = activeUrlParse(url)
  return {
    tabId,
    url,
    hostname: parsedUrl?.hostname ?? null,
    fillAvailable: tabId !== null && parsedUrl !== null,
  }
}

function activeUrlParse(url: string | null): { hostname: string } | null {
  if (url === null) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
    return { hostname: parsed.hostname.toLowerCase().replace(/\.$/, "") }
  } catch {
    return null
  }
}

function extensionEnvironmentSettingsCreate(
  source: ExtensionEnvironmentSource | null,
): ExtensionFullWindowEnvironmentSettings {
  if (source === null) {
    return {
      region: "us",
      base: "",
      webVault: "",
      api: "",
      identity: "",
      icons: "",
      notifications: "",
      events: "",
    }
  }

  if (source === "us" || source === "eu") {
    return {
      region: source,
      base: "",
      webVault: "",
      api: "",
      identity: "",
      icons: "",
      notifications: "",
      events: "",
    }
  }

  if (typeof source === "string") {
    return {
      region: "selfHosted",
      base: source,
      webVault: "",
      api: "",
      identity: "",
      icons: "",
      notifications: "",
      events: "",
    }
  }

  const base = source.baseUrl ?? source.base ?? ""
  return {
    region: base === "" ? (source.region ?? "us") : "selfHosted",
    base,
    webVault: source.webVaultUrl ?? source.webVault ?? "",
    api: source.apiUrl ?? source.api ?? "",
    identity: source.identityUrl ?? source.identity ?? "",
    icons: source.iconsUrl ?? source.icons ?? "",
    notifications: source.notificationsUrl ?? source.notifications ?? "",
    events: source.eventsUrl ?? source.events ?? "",
  }
}

function extensionEnvironmentSourceCreate(request: unknown): Result<ExtensionEnvironmentSource> {
  const op = "extensionBackgroundRouter.environmentSave"
  const parsed = v.safeParse(extensionEnvironmentSettingsRequestSchema, request)
  if (!parsed.success) return invalid(op, "Environment settings are invalid.", v.summarize(parsed.issues))

  const settings = parsed.output
  const overrideEntries = {
    webVault: settings.webVault,
    api: settings.api,
    identity: settings.identity,
    icons: settings.icons,
    notifications: settings.notifications,
    events: settings.events,
  }
  const overrides = Object.fromEntries(
    Object.entries(overrideEntries).filter(([, value]) => value.trim() !== ""),
  ) as Partial<typeof overrideEntries>

  const source: unknown =
    settings.region === "selfHosted"
      ? { base: settings.base, ...overrides }
      : Object.keys(overrides).length === 0
        ? settings.region
        : { region: settings.region, ...overrides }
  const sourceResult = v.safeParse(extensionEnvironmentSourceSchema, source)
  if (!sourceResult.success) return invalid(op, "Environment settings are invalid.", v.summarize(sourceResult.issues))
  const environmentResult = extensionEnvironmentResolve(sourceResult.output)
  if (!environmentResult.success) return environmentResult
  return resultCreate(sourceResult.output)
}

function extensionLoginViewDataCreate(cipher: ExtensionPersonalLoginCipher): ExtensionLoginViewData {
  const uri = cipher.login.uri ?? cipher.login.uris.find((entry) => entry.uri !== null)?.uri ?? null
  const copyableFields: ExtensionLoginViewData["copyableFields"] = []
  if (cipher.login.username !== null) {
    copyableFields.push({ key: "username", label: "Username", value: cipher.login.username })
  }
  if (cipher.viewPassword !== false && cipher.login.password !== null) {
    copyableFields.push({ key: "password", label: "Password", value: cipher.login.password, sensitive: true })
  }
  const savedUris = cipher.login.uris.length === 0 && cipher.login.uri !== undefined ? [{ uri }] : cipher.login.uris
  for (const [index, savedUri] of savedUris.entries()) {
    if (savedUri.uri === null) continue
    copyableFields.push({ key: `uri:${index}`, label: `URI ${index + 1}`, value: savedUri.uri })
  }
  if (cipher.notes !== null) copyableFields.push({ key: "notes", label: "Notes", value: cipher.notes })
  for (const [index, field] of cipher.fields.entries()) {
    if (field.value === null) continue
    copyableFields.push({
      key: `custom:${index}`,
      label: field.name ?? `Custom field ${index + 1}`,
      value: field.value,
      ...(field.type === 1 ? { sensitive: true } : {}),
    })
  }
  return {
    id: cipher.id,
    name: cipher.name,
    username: cipher.login.username,
    uri,
    totpAvailable: cipher.login.totp !== null && cipher.login.totp.trim() !== "",
    copyableFields,
  }
}

function extensionLoginViewDataListCreate(
  ciphers: ExtensionPersonalLoginCipher[],
  activeUrl: string | null,
  surface: "popup" | "fullwindow",
): ExtensionLoginViewData[] {
  return ciphers
    .filter((cipher) => surface === "fullwindow" || extensionPersonalLoginSiteMatch(cipher, activeUrl))
    .map(extensionLoginViewDataCreate)
}

function syncCommandResultCreate<
  T extends { status: string; changed: boolean; revisionDate: number; lastSyncedAt: number },
>(data: T): Pick<T, "status" | "changed" | "revisionDate" | "lastSyncedAt"> {
  return {
    status: data.status,
    changed: data.changed,
    revisionDate: data.revisionDate,
    lastSyncedAt: data.lastSyncedAt,
  }
}

export function extensionBackgroundRouterCreate(options: ExtensionBackgroundRouterOptions) {
  const now = options.now ?? Date.now
  let initializePromise: Promise<Result<void>> | null = null

  const initialize = (): Promise<Result<void>> => {
    if (initializePromise !== null) return initializePromise
    initializePromise = (async () => {
      try {
        return await options.service.start()
      } catch {
        return internal("extensionBackgroundRouter.initialize", "Extension background state could not be initialized.")
      }
    })()
    return initializePromise
  }

  const activeTabContextLookup = async (): Promise<Result<ExtensionActiveTabContext>> => {
    const op = "extensionBackgroundRouter.activeTabContextLookup"
    let tabs: Awaited<ReturnType<ExtensionTabsAdapter["query"]>>
    try {
      tabs = await options.tabs.query({ active: true, lastFocusedWindow: true })
    } catch {
      return unavailable(op, "Active tab could not be read.")
    }
    const context = extensionActiveTabContextCreate(tabs[0] ?? { id: undefined, url: undefined })
    const parsed = v.safeParse(extensionActiveTabContextSchema, context)
    if (!parsed.success) return internal(op, "Active tab context is invalid.")
    return resultCreate(parsed.output)
  }

  const fullWindowOpen = async (): Promise<Result<{ created: boolean; url: string }>> => {
    const op = "extensionBackgroundRouter.fullWindowOpen"
    let url: string
    try {
      url = options.runtime.getURL(options.fullWindowPath ?? "fullwindow/index.html")
    } catch {
      return unavailable(op, "Full-window URL could not be resolved.")
    }

    let contexts: Awaited<ReturnType<ExtensionRuntimeAdapter["getContexts"]>>
    try {
      contexts = await options.runtime.getContexts({ documentUrls: [url] })
    } catch {
      return unavailable(op, "Full-window page could not be located.")
    }
    const existingContext = contexts.find(
      (context) => Number.isSafeInteger(context.tabId) && Number.isSafeInteger(context.windowId),
    )
    if (existingContext !== undefined) {
      try {
        await options.tabs.update(existingContext.tabId, { active: true })
        await options.windows.update(existingContext.windowId, { focused: true })
      } catch {
        return unavailable(op, "Full-window page could not be focused.")
      }
      return resultCreate({ created: false, url })
    }

    try {
      await options.windows.create({ focused: true, type: "normal", url })
    } catch {
      return unavailable(op, "Full-window page could not be opened.")
    }
    return resultCreate({ created: true, url })
  }

  const viewModelLoad = async (surface: "popup" | "fullwindow"): Promise<Result<ExtensionViewModel>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult

    const contextResult = await activeTabContextLookup()
    if (!contextResult.success) return contextResult
    const environmentResult = await options.storage.environmentSettingsLoad()
    if (!environmentResult.success) return environmentResult
    const authResult = await options.storage.authSessionLoad()
    if (!authResult.success) return authResult
    const stateResult = await options.storage.sessionStateLoad()
    if (!stateResult.success) return stateResult

    const environment = extensionEnvironmentSettingsCreate(environmentResult.data)
    const shared = {
      hostname: contextResult.data.hostname,
      errorMessage: null,
      busy: false,
      copiedFieldKey: null,
      fillAvailable: contextResult.data.fillAvailable,
    }
    if (authResult.data === null) {
      return resultCreate(
        surface === "popup"
          ? extensionPopupViewModelCreate({ ...shared, status: "loggedOut", logins: [] })
          : extensionFullWindowViewModelCreate({ ...shared, status: "loggedOut", logins: [], environment }),
      )
    }
    if (stateResult.data === null) {
      return resultCreate(
        surface === "popup"
          ? extensionPopupViewModelCreate({ ...shared, status: "locked", logins: [] })
          : extensionFullWindowViewModelCreate({ ...shared, status: "locked", logins: [], environment }),
      )
    }

    const snapshotResult = await options.service.syncSnapshotLoad()
    if (!snapshotResult.success) {
      if (snapshotResult.statusCode === 401) {
        const clearStateResult = await options.storage.sessionStateClear()
        if (!clearStateResult.success) return clearStateResult
        return resultCreate(
          surface === "popup"
            ? extensionPopupViewModelCreate({ ...shared, status: "locked", logins: [] })
            : extensionFullWindowViewModelCreate({ ...shared, status: "locked", logins: [], environment }),
        )
      }
      return snapshotResult
    }
    const ciphers = snapshotResult.data?.ciphers ?? []
    const logins = extensionLoginViewDataListCreate(ciphers, contextResult.data.url, surface)
    return resultCreate(
      surface === "popup"
        ? extensionPopupViewModelCreate({
            ...shared,
            status: "ready",
            logins: logins as ExtensionPopupLogin[],
          })
        : extensionFullWindowViewModelCreate({
            ...shared,
            status: "ready",
            logins,
            environment,
          }),
    )
  }

  const login = async (request: unknown): Promise<Result<void>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    const result = await options.service.passwordLogin(request)
    if (!result.success) return result
    return resultCreate(undefined)
  }

  const unlock = async (request: unknown): Promise<Result<void>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return options.service.unlock(request)
  }

  const conditionalSync = async (): Promise<Result<unknown>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    const result = await options.service.conditionalSync()
    if (!result.success) return result
    return resultCreate(syncCommandResultCreate(result.data))
  }

  const manualSync = async (): Promise<Result<unknown>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    const result = await options.service.manualSync()
    if (!result.success) return result
    return resultCreate(syncCommandResultCreate(result.data))
  }

  const createLogin = async (request: ExtensionCreateLoginRequest): Promise<Result<{ id: string }>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    const result = await options.service.createLogin(request)
    if (!result.success) return result
    return resultCreate({ id: result.data.cipher.id })
  }

  const draftSave = async (
    request: ExtensionCreateLoginRequest,
  ): Promise<Result<{ id: string; updatedAt: number }>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return options.service.createLoginDraftSave(request)
  }

  const draftDiscard = async (request: string): Promise<Result<void>> =>
    options.service.createLoginDraftDiscard(request)

  const environmentSave = async (request: unknown): Promise<Result<void>> => {
    const sourceResult = extensionEnvironmentSourceCreate(request)
    if (!sourceResult.success) return sourceResult
    return options.storage.environmentSettingsSave(sourceResult.data)
  }

  const lock = async (): Promise<Result<void>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return options.service.lock()
  }

  const logout = async (): Promise<Result<void>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return options.service.logout()
  }

  const loginFill = async (request: ExtensionLoginFillRequest): Promise<Result<ExtensionLoginFillData>> => {
    const op = "extensionBackgroundRouter.loginFill"
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult

    const contextResult = await activeTabContextLookup()
    if (!contextResult.success) return contextResult
    const tabId = contextResult.data.tabId
    if (tabId === null || !contextResult.data.fillAvailable) {
      return unavailable(op, "Active page is not available for filling.")
    }

    const snapshotResult = await options.service.syncSnapshotLoad()
    if (!snapshotResult.success) return snapshotResult
    const snapshot = snapshotResult.data
    if (snapshot === null) return unavailable(op, "Vault data is unavailable.")
    const cipher = snapshot.ciphers.find((entry) => entry.id === request.loginId)
    if (cipher === undefined) return invalid(op, "Selected login could not be found.")
    if (cipher.login.username === null && cipher.login.password === null) {
      return invalid(op, "Selected login has no fillable credentials.")
    }

    try {
      return await options.scripting.executeScript(
        { tabId, ...(request.frameId === undefined ? {} : { frameId: request.frameId }) },
        { username: cipher.login.username, password: cipher.viewPassword === false ? null : cipher.login.password },
      )
    } catch {
      return unavailable(op, "Active page could not be filled.")
    }
  }

  const totpCopy = async (request: { loginId: string }): Promise<Result<string>> => {
    const op = "extensionBackgroundRouter.totpCopy"
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    const snapshotResult = await options.service.syncSnapshotLoad()
    if (!snapshotResult.success) return snapshotResult
    const snapshot = snapshotResult.data
    if (snapshot === null) return unavailable(op, "Vault data is unavailable.")
    const cipher = snapshot.ciphers.find((entry) => entry.id === request.loginId)
    if (cipher === undefined) return invalid(op, "Selected login could not be found.")
    if (cipher.login.totp === null || cipher.login.totp.trim() === "") {
      return invalid(op, "Selected login has no TOTP code.")
    }
    const codeResult = await totpCodeCreate(cipher.login.totp, now() / 1_000)
    if (codeResult.success) return codeResult
    return resultErrorCreate(op, codeResult.errorMessage, {
      code: codeResult.code,
      errorData: codeResult.errorData,
      statusCode: codeResult.statusCode,
    })
  }

  const messageHandle = async (input: unknown): Promise<Result<unknown>> => {
    const parsed = v.safeParse(extensionRuntimeMessageSchema, input)
    if (!parsed.success)
      return invalid(
        "extensionBackgroundRouter.messageHandle",
        "Runtime message is invalid.",
        v.summarize(parsed.issues),
      )
    const message: ExtensionRuntimeMessage = parsed.output
    switch (message.type) {
      case "initialize":
        return initialize()
      case "login": {
        const requestResult = requestRead(message.request, "extensionBackgroundRouter.login")
        if (!requestResult.success) return requestResult
        return login(requestResult.data)
      }
      case "unlock": {
        const requestResult = requestRead(message.request, "extensionBackgroundRouter.unlock")
        if (!requestResult.success) return requestResult
        return unlock(requestResult.data)
      }
      case "viewModelLoad":
        return viewModelLoad(message.surface)
      case "conditionalSync":
        return conditionalSync()
      case "manualSync":
        return manualSync()
      case "createLogin":
        return createLogin(message.request)
      case "draftSave":
        return draftSave(message.request)
      case "draftDiscard":
        return draftDiscard(message.request)
      case "environmentSave": {
        const requestResult = requestRead(message.request, "extensionBackgroundRouter.environmentSave")
        if (!requestResult.success) return requestResult
        return environmentSave(requestResult.data)
      }
      case "lock":
        return lock()
      case "logout":
        return logout()
      case "activeTabContextLookup":
        return activeTabContextLookup()
      case "loginFill":
        return loginFill(message.request)
      case "totpCopy":
        return totpCopy(message.request)
      case "fullWindowOpen":
        return fullWindowOpen()
    }
  }

  const runtimeMessageReceive = (
    _message: unknown,
    _sender: unknown,
    sendResponse: (response: unknown) => void,
  ): boolean => {
    void messageHandle(_message).then(
      (response) => {
        const wireResponse = response.success && response.data === undefined ? { ...response, data: null } : response
        const parsed = v.safeParse(extensionRuntimeResponseSchema, wireResponse)
        sendResponse(
          parsed.success
            ? wireResponse
            : internal("extensionBackgroundRouter.messageHandle", "Runtime response is invalid."),
        )
      },
      () => sendResponse(internal("extensionBackgroundRouter.messageHandle", "Runtime message handling failed.")),
    )
    return true
  }

  options.runtime.onMessageAddListener(runtimeMessageReceive)

  return {
    initialize,
    activeTabContextLookup,
    fullWindowOpen,
    viewModelLoad,
    messageHandle,
  }
}
