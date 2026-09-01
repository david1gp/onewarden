import * as v from "valibot"
import type { Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import { totpCodeCreate } from "../../shared/totp/totpCodeCreate.js"
import { extensionEnvironmentResolve } from "../api/extensionEnvironmentResolve.js"
import {
  type ExtensionEnvironmentSource,
  extensionEnvironmentSourceSchema,
} from "../api/extensionEnvironmentSourceSchema.js"
import { extensionAutofillFillValuesCreate } from "../autofill/extensionAutofillFillValuesCreate.js"
import type { ExtensionCipher } from "../crypto/extensionCipherSchema.js"
import type { ExtensionPersonalLoginCipher } from "../crypto/extensionPersonalLoginCipherSchema.js"
import type { ExtensionLogin } from "../ExtensionLogin.js"
import type { ExtensionCipherFillData } from "../fill/extensionCipherFillDataSchema.js"
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
import type { ExtensionPasskeyConsentContext } from "../passkey/extensionPasskeyConsentContextSchema.js"
import type { ExtensionPopupViewModel } from "../popup/ExtensionPopupViewModel.js"
import { extensionPopupViewModelCreate } from "../popup/extensionPopupViewModelCreate.js"
import type { ExtensionLockPolicy } from "../storage/extensionLockPolicySchema.js"
import type { extensionStorageCreate } from "../storage/extensionStorageCreate.js"
import { type ExtensionActiveTabContext, extensionActiveTabContextSchema } from "./extensionActiveTabContextSchema.js"
import type { ExtensionAttachmentDownloadResult } from "./extensionAttachmentDownloadResultSchema.js"
import type { ExtensionBackgroundCollectionDto } from "./extensionBackgroundCollectionDtoSchema.js"
import { extensionBackgroundCollectionDtoSchema } from "./extensionBackgroundCollectionDtoSchema.js"
import type { ExtensionBackgroundCollectionListResult } from "./extensionBackgroundCollectionListResultSchema.js"
import { extensionBackgroundCollectionListResultSchema } from "./extensionBackgroundCollectionListResultSchema.js"
import type { ExtensionBackgroundFolderDto } from "./extensionBackgroundFolderDtoSchema.js"
import { extensionBackgroundFolderDtoSchema } from "./extensionBackgroundFolderDtoSchema.js"
import type { ExtensionBackgroundFolderListResult } from "./extensionBackgroundFolderListResultSchema.js"
import { extensionBackgroundFolderListResultSchema } from "./extensionBackgroundFolderListResultSchema.js"
import type { extensionBackgroundServiceCreate } from "./extensionBackgroundServiceCreate.js"
import type { ExtensionCipherDetailReadResult } from "./extensionCipherDetailReadResultSchema.js"
import { extensionCipherDetailReadResultSchema } from "./extensionCipherDetailReadResultSchema.js"
import { extensionPersonalLoginSiteMatch } from "./extensionPersonalLoginSiteMatch.js"
import type { ExtensionRuntimeAdapter } from "./extensionRuntimeAdapter.js"
import type { ExtensionScriptingAdapter } from "./extensionScriptingAdapter.js"
import type { ExtensionTabsAdapter } from "./extensionTabsAdapter.js"
import type { ExtensionVaultSearchResult } from "./extensionVaultSearchResultSchema.js"
import type { ExtensionWindowsAdapter } from "./extensionWindowsAdapter.js"

type ExtensionBackgroundService = Pick<
  ReturnType<typeof extensionBackgroundServiceCreate>,
  | "start"
  | "passwordLogin"
  | "unlock"
  | "conditionalSync"
  | "manualSync"
  | "cipherCreate"
  | "cipherUpdate"
  | "cipherPartial"
  | "cipherDelete"
  | "cipherRestore"
  | "cipherArchive"
  | "cipherMove"
  | "cipherCollectionsUpdate"
  | "attachmentUpload"
  | "attachmentDownload"
  | "attachmentDelete"
  | "folderList"
  | "folderRead"
  | "folderCreate"
  | "folderUpdate"
  | "folderDelete"
  | "collectionList"
  | "collectionRead"
  | "collectionCreate"
  | "collectionUpdate"
  | "collectionDelete"
  | "sessionHandoffCreate"
  | "syncSnapshotLoad"
  | "cipherDetailRead"
  | "vaultSearch"
  | "lock"
  | "logout"
  | "lockPolicyLoad"
  | "lockPolicySave"
  | "passkeyConsentContextCreate"
  | "passkeyCredentialCreate"
  | "passkeyAssertion"
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
  autofill?: {
    stopAll: (reason: "locked" | "logout" | "accountChanged" | "background") => void
    startAll: () => void
  }
  now?: () => number
  fullWindowPath?: string
  passkeyConsentUi?: {
    load: (requestId: string) => Promise<Result<unknown>>
    verify: (requestId: string, password: string) => Promise<Result<unknown>>
    approve: (request: {
      requestId: string
      cipherId: string
      credentialId: string | null
      revisionDate: string
    }) => Promise<Result<void>>
    cancel: (requestId: string) => Result<void>
  }
}

function extensionLoginCiphersRead(ciphers: readonly ExtensionCipher[]): ExtensionPersonalLoginCipher[] {
  return ciphers.filter(
    (cipher): cipher is ExtensionPersonalLoginCipher => cipher.type === 1 || cipher.type === undefined,
  )
}

type ExtensionLoginViewData = ExtensionLogin

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
    if (cipher.viewPassword === false && field.type === 1) continue
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
    ...(cipher.creationDate === undefined ? {} : { creationDate: cipher.creationDate }),
    ...(cipher.revisionDate === undefined ? {} : { revisionDate: cipher.revisionDate }),
    organizationId: cipher.organizationId ?? null,
    folderId: cipher.folderId ?? null,
    collectionIds: cipher.collectionIds ?? [],
    ...(cipher.edit === undefined ? {} : { edit: cipher.edit }),
    ...(cipher.viewPassword === undefined ? {} : { viewPassword: cipher.viewPassword }),
    username: cipher.login.username,
    uri,
    totpAvailable: cipher.viewPassword !== false && cipher.login.totp !== null && cipher.login.totp.trim() !== "",
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
    let context = extensionActiveTabContextCreate(tabs[0] ?? { id: undefined, url: undefined })
    if (!context.fillAvailable) {
      try {
        const activeTabs = await options.tabs.query({ active: true })
        context =
          activeTabs.map(extensionActiveTabContextCreate).find((candidate) => candidate.fillAvailable) ?? context
      } catch {
        return unavailable(op, "Active tab could not be read.")
      }
    }
    const parsed = v.safeParse(extensionActiveTabContextSchema, context)
    if (!parsed.success) return internal(op, "Active tab context is invalid.")
    return resultCreate(parsed.output)
  }

  const fullWindowOpen = async (
    pane?: "vault" | "generator" | "settings",
  ): Promise<Result<{ created: boolean; url: string }>> => {
    const op = "extensionBackgroundRouter.fullWindowOpen"
    let url: string
    try {
      const baseUrl = options.runtime.getURL(options.fullWindowPath ?? "fullwindow/index.html")
      url = pane === undefined ? baseUrl : `${baseUrl}?pane=${pane}`
    } catch {
      return unavailable(op, "Full-window URL could not be resolved.")
    }

    let contexts: Awaited<ReturnType<ExtensionRuntimeAdapter["getContexts"]>>
    try {
      const baseUrl = options.runtime.getURL(options.fullWindowPath ?? "fullwindow/index.html")
      contexts = await options.runtime.getContexts({
        documentUrls: [`${baseUrl}*`],
      })
    } catch {
      return unavailable(op, "Full-window page could not be located.")
    }
    const existingContext = contexts.find(
      (context) => Number.isSafeInteger(context.tabId) && Number.isSafeInteger(context.windowId),
    )
    if (existingContext !== undefined) {
      try {
        await options.tabs.update(existingContext.tabId, { active: true, ...(pane === undefined ? {} : { url }) })
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
    const lockPolicyResult = surface === "fullwindow" ? await options.service.lockPolicyLoad() : resultCreate(null)
    if (!lockPolicyResult.success) return lockPolicyResult
    const autofillPolicyResult =
      surface === "fullwindow" ? await options.storage.autofillPolicyLoad() : resultCreate(null)
    if (!autofillPolicyResult.success) return autofillPolicyResult
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
          : extensionFullWindowViewModelCreate({
              ...shared,
              status: "loggedOut",
              logins: [],
              environment,
              lockPolicy: lockPolicyResult.data,
              autofillPolicy: autofillPolicyResult.data,
            }),
      )
    }
    if (stateResult.data === null) {
      return resultCreate(
        surface === "popup"
          ? extensionPopupViewModelCreate({ ...shared, status: "locked", logins: [] })
          : extensionFullWindowViewModelCreate({
              ...shared,
              status: "locked",
              logins: [],
              environment,
              lockPolicy: lockPolicyResult.data,
              autofillPolicy: autofillPolicyResult.data,
            }),
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
            : extensionFullWindowViewModelCreate({
                ...shared,
                status: "locked",
                logins: [],
                environment,
                lockPolicy: lockPolicyResult.data,
                autofillPolicy: autofillPolicyResult.data,
              }),
        )
      }
      return snapshotResult
    }
    const ciphers = snapshotResult.data?.ciphers ?? []
    const logins = extensionLoginViewDataListCreate(extensionLoginCiphersRead(ciphers), contextResult.data.url, surface)
    return resultCreate(
      surface === "popup"
        ? extensionPopupViewModelCreate({
            ...shared,
            status: "ready",
            logins,
          })
        : extensionFullWindowViewModelCreate({
            ...shared,
            status: "ready",
            logins,
            environment,
            lockPolicy: lockPolicyResult.data,
            autofillPolicy: autofillPolicyResult.data,
            profile: snapshotResult.data?.profile ?? null,
          }),
    )
  }

  const login = async (request: unknown): Promise<Result<void>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    const result = await options.service.passwordLogin(request)
    if (!result.success) return result
    options.autofill?.startAll()
    return resultCreate(undefined)
  }

  const unlock = async (request: unknown): Promise<Result<void>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    const result = await options.service.unlock(request)
    if (result.success) options.autofill?.startAll()
    return result
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

  const vaultSearch = async (
    request: Extract<ExtensionRuntimeMessage, { type: "vaultSearch" }>["request"],
  ): Promise<Result<ExtensionVaultSearchResult>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return options.service.vaultSearch(request)
  }

  const cipherDetailRead = async (
    request: Extract<ExtensionRuntimeMessage, { type: "cipherDetailRead" }>["request"],
  ): Promise<Result<ExtensionCipherDetailReadResult>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    const result = await options.service.cipherDetailRead(request)
    if (!result.success) return result
    const parsed = v.safeParse(extensionCipherDetailReadResultSchema, result.data)
    if (!parsed.success)
      return internal("extensionBackgroundRouter.cipherDetailRead", "Cipher detail response is invalid.")
    return resultCreate(parsed.output)
  }

  const cipherMutationResultValidate = (result: Result<ExtensionCipher>, op: string): Result<ExtensionCipher> => {
    if (!result.success) return result
    const parsed = v.safeParse(extensionCipherDetailReadResultSchema, result.data)
    if (!parsed.success) return internal(op, "Cipher mutation response is invalid.")
    return resultCreate(parsed.output)
  }

  const cipherCreate = async (
    request: Extract<ExtensionRuntimeMessage, { type: "cipherCreate" }>["request"],
  ): Promise<Result<ExtensionCipher>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return cipherMutationResultValidate(
      await options.service.cipherCreate(request),
      "extensionBackgroundRouter.cipherCreate",
    )
  }

  const cipherUpdate = async (
    request: Extract<ExtensionRuntimeMessage, { type: "cipherUpdate" }>["request"],
  ): Promise<Result<ExtensionCipher>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return cipherMutationResultValidate(
      await options.service.cipherUpdate(request),
      "extensionBackgroundRouter.cipherUpdate",
    )
  }

  const cipherPartial = async (
    request: Extract<ExtensionRuntimeMessage, { type: "cipherPartial" }>["request"],
  ): Promise<Result<ExtensionCipher>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return cipherMutationResultValidate(
      await options.service.cipherPartial(request),
      "extensionBackgroundRouter.cipherPartial",
    )
  }

  const cipherDelete = async (
    request: Extract<ExtensionRuntimeMessage, { type: "cipherDelete" }>["request"],
  ): Promise<Result<void>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return options.service.cipherDelete(request)
  }

  const cipherRestore = async (
    request: Extract<ExtensionRuntimeMessage, { type: "cipherRestore" }>["request"],
  ): Promise<Result<ExtensionCipher>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return cipherMutationResultValidate(
      await options.service.cipherRestore(request),
      "extensionBackgroundRouter.cipherRestore",
    )
  }

  const cipherArchive = async (
    request: Extract<ExtensionRuntimeMessage, { type: "cipherArchive" }>["request"],
  ): Promise<Result<ExtensionCipher>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return cipherMutationResultValidate(
      await options.service.cipherArchive(request),
      "extensionBackgroundRouter.cipherArchive",
    )
  }

  const cipherMove = async (
    request: Extract<ExtensionRuntimeMessage, { type: "cipherMove" }>["request"],
  ): Promise<Result<void>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return options.service.cipherMove(request)
  }

  const cipherCollectionsUpdate = async (
    request: Extract<ExtensionRuntimeMessage, { type: "cipherCollectionsUpdate" }>["request"],
  ): Promise<Result<ExtensionCipher>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return cipherMutationResultValidate(
      await options.service.cipherCollectionsUpdate(request),
      "extensionBackgroundRouter.cipherCollectionsUpdate",
    )
  }

  const attachmentUpload = async (
    request: Extract<ExtensionRuntimeMessage, { type: "attachmentUpload" }>["request"],
  ): Promise<Result<ExtensionCipher>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return cipherMutationResultValidate(
      await options.service.attachmentUpload(request),
      "extensionBackgroundRouter.attachmentUpload",
    )
  }

  const attachmentDownload = async (
    request: Extract<ExtensionRuntimeMessage, { type: "attachmentDownload" }>["request"],
  ): Promise<Result<ExtensionAttachmentDownloadResult>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return options.service.attachmentDownload(request)
  }

  const attachmentDelete = async (
    request: Extract<ExtensionRuntimeMessage, { type: "attachmentDelete" }>["request"],
  ): Promise<Result<ExtensionCipher>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return cipherMutationResultValidate(
      await options.service.attachmentDelete(request),
      "extensionBackgroundRouter.attachmentDelete",
    )
  }

  const folderList = async (
    request: Extract<ExtensionRuntimeMessage, { type: "folderList" }>["request"],
  ): Promise<Result<ExtensionBackgroundFolderListResult>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    const result = await options.service.folderList(request)
    if (!result.success) return result
    const parsed = v.safeParse(extensionBackgroundFolderListResultSchema, result.data)
    if (!parsed.success) return internal("extensionBackgroundRouter.folderList", "Folder list response is invalid.")
    return resultCreate(parsed.output)
  }

  const folderResultValidate = (
    result: Result<ExtensionBackgroundFolderDto>,
    op: string,
  ): Result<ExtensionBackgroundFolderDto> => {
    if (!result.success) return result
    const parsed = v.safeParse(extensionBackgroundFolderDtoSchema, result.data)
    if (!parsed.success) return internal(op, "Folder response is invalid.")
    return resultCreate(parsed.output)
  }

  const folderRead = async (
    request: Extract<ExtensionRuntimeMessage, { type: "folderRead" }>["request"],
  ): Promise<Result<ExtensionBackgroundFolderDto>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return folderResultValidate(await options.service.folderRead(request), "extensionBackgroundRouter.folderRead")
  }

  const folderCreate = async (
    request: Extract<ExtensionRuntimeMessage, { type: "folderCreate" }>["request"],
  ): Promise<Result<ExtensionBackgroundFolderDto>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return folderResultValidate(await options.service.folderCreate(request), "extensionBackgroundRouter.folderCreate")
  }

  const folderUpdate = async (
    request: Extract<ExtensionRuntimeMessage, { type: "folderUpdate" }>["request"],
  ): Promise<Result<ExtensionBackgroundFolderDto>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return folderResultValidate(await options.service.folderUpdate(request), "extensionBackgroundRouter.folderUpdate")
  }

  const folderDelete = async (
    request: Extract<ExtensionRuntimeMessage, { type: "folderDelete" }>["request"],
  ): Promise<Result<void>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return options.service.folderDelete(request)
  }

  const collectionList = async (
    request: Extract<ExtensionRuntimeMessage, { type: "collectionList" }>["request"],
  ): Promise<Result<ExtensionBackgroundCollectionListResult>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    const result = await options.service.collectionList(request)
    if (!result.success) return result
    const parsed = v.safeParse(extensionBackgroundCollectionListResultSchema, result.data)
    if (!parsed.success)
      return internal("extensionBackgroundRouter.collectionList", "Collection list response is invalid.")
    return resultCreate(parsed.output)
  }

  const collectionResultValidate = (
    result: Result<ExtensionBackgroundCollectionDto>,
    op: string,
  ): Result<ExtensionBackgroundCollectionDto> => {
    if (!result.success) return result
    const parsed = v.safeParse(extensionBackgroundCollectionDtoSchema, result.data)
    if (!parsed.success) return internal(op, "Collection response is invalid.")
    return resultCreate(parsed.output)
  }

  const collectionRead = async (
    request: Extract<ExtensionRuntimeMessage, { type: "collectionRead" }>["request"],
  ): Promise<Result<ExtensionBackgroundCollectionDto>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return collectionResultValidate(
      await options.service.collectionRead(request),
      "extensionBackgroundRouter.collectionRead",
    )
  }

  const collectionCreate = async (
    request: Extract<ExtensionRuntimeMessage, { type: "collectionCreate" }>["request"],
  ): Promise<Result<ExtensionBackgroundCollectionDto>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return collectionResultValidate(
      await options.service.collectionCreate(request),
      "extensionBackgroundRouter.collectionCreate",
    )
  }

  const collectionUpdate = async (
    request: Extract<ExtensionRuntimeMessage, { type: "collectionUpdate" }>["request"],
  ): Promise<Result<ExtensionBackgroundCollectionDto>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return collectionResultValidate(
      await options.service.collectionUpdate(request),
      "extensionBackgroundRouter.collectionUpdate",
    )
  }

  const collectionDelete = async (
    request: Extract<ExtensionRuntimeMessage, { type: "collectionDelete" }>["request"],
  ): Promise<Result<void>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return options.service.collectionDelete(request)
  }

  const sessionHandoffOpen = async (
    request: Extract<ExtensionRuntimeMessage, { type: "sessionHandoffOpen" }>["request"],
  ): Promise<Result<{ url: string }>> => {
    const op = "extensionBackgroundRouter.sessionHandoffOpen"
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    const environmentSourceResult = await options.storage.environmentSettingsLoad()
    if (!environmentSourceResult.success) return environmentSourceResult
    const environmentResult = extensionEnvironmentResolve(environmentSourceResult.data ?? "us")
    if (!environmentResult.success) return environmentResult
    const contextResult = request.operation === "create" ? await activeTabContextLookup() : null
    if (contextResult !== null && !contextResult.success) return contextResult
    const prefillUrl =
      request.operation === "create" && contextResult?.success === true && contextResult.data.fillAvailable
        ? contextResult.data.url
        : null
    const handoffResult = await options.service.sessionHandoffCreate(
      request.operation,
      request.cipherId,
      environmentResult.data.webVault,
      prefillUrl,
    )
    if (!handoffResult.success) return handoffResult
    try {
      await options.windows.create({ focused: true, type: "normal", url: handoffResult.data })
    } catch {
      return unavailable(op, "OneWarden could not be opened.")
    }
    return resultCreate({ url: handoffResult.data })
  }

  const environmentSave = async (request: unknown): Promise<Result<void>> => {
    const sourceResult = extensionEnvironmentSourceCreate(request)
    if (!sourceResult.success) return sourceResult
    return options.storage.environmentSettingsSave(sourceResult.data)
  }

  const lockPolicyLoad = (): Promise<Result<ExtensionLockPolicy | null>> => options.service.lockPolicyLoad()

  const lockPolicySave = (
    request: Extract<ExtensionRuntimeMessage, { type: "lockPolicySave" }>["request"],
  ): Promise<Result<void>> => options.service.lockPolicySave(request)

  const autofillPolicyLoad = () => options.storage.autofillPolicyLoad()
  const autofillPolicySave = (
    request: Extract<ExtensionRuntimeMessage, { type: "autofillPolicySave" }>["request"],
  ): Promise<Result<void>> =>
    options.storage.autofillPolicySave({
      pageLoadEnabled: request.pageLoadEnabled,
      disabledSites: [
        ...new Set(
          request.disabledSites.map((site) =>
            site
              .trim()
              .toLowerCase()
              .replace(/^www\./, ""),
          ),
        ),
      ].filter(Boolean),
    })

  const lock = async (): Promise<Result<void>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    const result = await options.service.lock()
    if (result.success) options.autofill?.stopAll("locked")
    return result
  }

  const logout = async (): Promise<Result<void>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    const result = await options.service.logout()
    if (result.success) options.autofill?.stopAll("logout")
    return result
  }

  const passkeyConsentContextCreate = async (request: unknown): Promise<Result<ExtensionPasskeyConsentContext>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return options.service.passkeyConsentContextCreate(request)
  }

  const passkeyCredentialCreate = async (request: unknown): Promise<Result<unknown>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return options.service.passkeyCredentialCreate(request)
  }

  const passkeyAssertion = async (request: unknown): Promise<Result<unknown>> => {
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    return options.service.passkeyAssertion(request)
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

    const detailResult = await options.service.cipherDetailRead({ cipherId: request.loginId })
    if (!detailResult.success) return detailResult
    const cipher = detailResult.data
    if (cipher.type !== 1) return invalid(op, "Selected item is not a login.")
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

  const cipherFill = async (
    request: Extract<ExtensionRuntimeMessage, { type: "cipherFill" }>["request"],
  ): Promise<Result<ExtensionCipherFillData>> => {
    const op = "extensionBackgroundRouter.cipherFill"
    const initializeResult = await initialize()
    if (!initializeResult.success) return initializeResult
    const contextResult = await activeTabContextLookup()
    if (!contextResult.success) return contextResult
    const tabId = contextResult.data.tabId
    if (tabId === null || !contextResult.data.fillAvailable) {
      return unavailable(op, "Active page is not available for filling.")
    }
    if (options.scripting.cipherExecuteScript === undefined) {
      return unavailable(op, "Type-specific filling is unavailable.")
    }
    const detailResult = await options.service.cipherDetailRead({ cipherId: request.cipherId })
    if (!detailResult.success) return detailResult
    if (detailResult.data.type !== request.cipherType) {
      return invalid(op, "Selected item type does not match the fill request.")
    }
    const values = extensionAutofillFillValuesCreate(detailResult.data)
    if (values.length === 0) return invalid(op, "Selected item has no permitted fillable values.")
    try {
      return await options.scripting.cipherExecuteScript(
        { tabId, ...(request.frameId === undefined ? {} : { frameId: request.frameId }) },
        values,
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
    const cipher = extensionLoginCiphersRead(snapshot.ciphers).find((entry) => entry.id === request.loginId)
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
      case "vaultSearch":
        return vaultSearch(message.request)
      case "cipherDetailRead":
        return cipherDetailRead(message.request)
      case "cipherCreate":
        return cipherCreate(message.request)
      case "cipherUpdate":
        return cipherUpdate(message.request)
      case "cipherPartial":
        return cipherPartial(message.request)
      case "cipherDelete":
        return cipherDelete(message.request)
      case "cipherRestore":
        return cipherRestore(message.request)
      case "cipherArchive":
        return cipherArchive(message.request)
      case "cipherMove":
        return cipherMove(message.request)
      case "cipherCollectionsUpdate":
        return cipherCollectionsUpdate(message.request)
      case "attachmentUpload":
        return attachmentUpload(message.request)
      case "attachmentDownload":
        return attachmentDownload(message.request)
      case "attachmentDelete":
        return attachmentDelete(message.request)
      case "folderList":
        return folderList(message.request)
      case "folderRead":
        return folderRead(message.request)
      case "folderCreate":
        return folderCreate(message.request)
      case "folderUpdate":
        return folderUpdate(message.request)
      case "folderDelete":
        return folderDelete(message.request)
      case "collectionList":
        return collectionList(message.request)
      case "collectionRead":
        return collectionRead(message.request)
      case "collectionCreate":
        return collectionCreate(message.request)
      case "collectionUpdate":
        return collectionUpdate(message.request)
      case "collectionDelete":
        return collectionDelete(message.request)
      case "sessionHandoffOpen":
        return sessionHandoffOpen(message.request)
      case "environmentSave": {
        const requestResult = requestRead(message.request, "extensionBackgroundRouter.environmentSave")
        if (!requestResult.success) return requestResult
        return environmentSave(requestResult.data)
      }
      case "lockPolicyLoad":
        return lockPolicyLoad()
      case "lockPolicySave":
        return lockPolicySave(message.request)
      case "autofillPolicyLoad":
        return autofillPolicyLoad()
      case "autofillPolicySave":
        return autofillPolicySave(message.request)
      case "lock":
        return lock()
      case "logout":
        return logout()
      case "activeTabContextLookup":
        return activeTabContextLookup()
      case "loginFill":
        return loginFill(message.request)
      case "cipherFill":
        return cipherFill(message.request)
      case "totpCopy":
        return totpCopy(message.request)
      case "fullWindowOpen":
        return fullWindowOpen(message.pane)
      case "passkeyConsentContext":
        return passkeyConsentContextCreate(message.request)
      case "passkeyCredentialCreate":
        return passkeyCredentialCreate(message.request)
      case "passkeyAssertion":
        return passkeyAssertion(message.request)
      case "passkeyConsentUiLoad":
        return (
          options.passkeyConsentUi?.load(message.request.requestId) ??
          unavailable("extensionBackgroundRouter.passkeyConsentUiLoad", "Passkey confirmation is unavailable.")
        )
      case "passkeyConsentUiVerify":
        return (
          options.passkeyConsentUi?.verify(message.request.requestId, message.request.password) ??
          unavailable("extensionBackgroundRouter.passkeyConsentUiVerify", "Passkey confirmation is unavailable.")
        )
      case "passkeyConsentUiApprove":
        return (
          options.passkeyConsentUi?.approve(message.request) ??
          unavailable("extensionBackgroundRouter.passkeyConsentUiApprove", "Passkey confirmation is unavailable.")
        )
      case "passkeyConsentUiCancel":
        return (
          options.passkeyConsentUi?.cancel(message.request.requestId) ??
          unavailable("extensionBackgroundRouter.passkeyConsentUiCancel", "Passkey confirmation is unavailable.")
        )
      default:
        return internal("extensionBackgroundRouter.messageHandle", "Runtime message type is invalid.")
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
    vaultSearch,
    cipherDetailRead,
    cipherCreate,
    cipherUpdate,
    cipherPartial,
    cipherDelete,
    cipherRestore,
    cipherArchive,
    cipherMove,
    cipherCollectionsUpdate,
    attachmentUpload,
    attachmentDownload,
    attachmentDelete,
    folderList,
    folderRead,
    folderCreate,
    folderUpdate,
    folderDelete,
    collectionList,
    collectionRead,
    collectionCreate,
    collectionUpdate,
    collectionDelete,
    messageHandle,
    lockPolicyLoad,
    lockPolicySave,
    autofillPolicyLoad,
    autofillPolicySave,
    passkeyConsentContextCreate,
    passkeyCredentialCreate,
    passkeyAssertion,
  }
}
