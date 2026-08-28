import * as v from "valibot"
import { type Result } from "#result"
import type { ExtensionEnvironmentSource } from "../api/extensionEnvironmentSourceSchema.js"
import { type ExtensionAuthSession, extensionAuthSessionStorageSchema } from "./extensionAuthSessionStorageSchema.js"
import { type ExtensionCreateDraft, extensionCreateDraftStorageSchema } from "./extensionCreateDraftStorageSchema.js"
import {
  type ExtensionEnvironmentStorage,
  extensionEnvironmentStorageSchema,
} from "./extensionEnvironmentStorageSchema.js"
import { extensionLockPolicySchema, type ExtensionLockPolicy } from "./extensionLockPolicySchema.js"
import { extensionSessionStateStorageSchema, type ExtensionSessionState } from "./extensionSessionStateStorageSchema.js"
import type { ExtensionStorageAdapter } from "./extensionStorageAdapter.js"
import { extensionStorageKeys } from "./extensionStorageKeys.js"
import { extensionStorageSchemaVersion } from "./extensionStorageSchemaVersion.js"
import { type ExtensionSyncStorage, extensionSyncStorageSchema } from "./extensionSyncStorageSchema.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"

type StorageSchema<T> = v.GenericSchema<T, T>

async function storageRead<TSchema extends StorageSchema<unknown>>(
  area: ExtensionStorageAdapter["local"],
  key: string,
  schema: TSchema,
  op: string,
): Promise<Result<v.InferOutput<TSchema> | null>> {
  let values: Record<string, unknown>
  try {
    values = await area.get<Record<string, unknown>>(key)
  } catch {
    return resultErrorCreate(op, "Extension storage could not be read.", {
      code: "platform.unavailable",
      statusCode: 503,
    })
  }

  if (typeof values !== "object" || values === null || Array.isArray(values)) {
    return resultErrorCreate(op, "Extension storage returned an invalid record.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }

  const value = values[key]
  if (value === undefined) return resultCreate(null)

  const parsed = v.safeParse(schema, value)
  if (parsed.success) return resultCreate(parsed.output)
  return resultErrorCreate(op, "Extension storage contains an invalid record.", {
    code: "platform.internal",
    errorData: v.summarize(parsed.issues),
    statusCode: 500,
  })
}

async function storageWrite<TSchema extends StorageSchema<unknown>>(
  area: ExtensionStorageAdapter["local"],
  key: string,
  schema: TSchema,
  value: unknown,
  op: string,
): Promise<Result<void>> {
  const parsed = v.safeParse(schema, value)
  if (!parsed.success) {
    return resultErrorCreate(op, "Extension storage record is invalid.", {
      code: "platform.invalid-request",
      errorData: v.summarize(parsed.issues),
      statusCode: 400,
    })
  }

  try {
    await area.set({ [key]: parsed.output })
  } catch {
    return resultErrorCreate(op, "Extension storage could not be written.", {
      code: "platform.unavailable",
      statusCode: 503,
    })
  }
  return resultCreate(undefined)
}

async function storageRemove(
  area: ExtensionStorageAdapter["local"],
  keys: string | string[],
  op: string,
): Promise<Result<void>> {
  try {
    await area.remove(keys)
  } catch {
    return resultErrorCreate(op, "Extension storage could not be cleared.", {
      code: "platform.unavailable",
      statusCode: 503,
    })
  }
  return resultCreate(undefined)
}

function storageVersionedCreate<T extends Record<string, unknown>>(data: T): T & { schemaVersion: number } {
  return { schemaVersion: extensionStorageSchemaVersion, ...data }
}

export function extensionStorageCreate(adapter: ExtensionStorageAdapter) {
  const environmentSettingsLoad = async (): Promise<Result<ExtensionEnvironmentSource | null>> => {
    const op = "extensionStorage.environmentSettingsLoad"
    const result = await storageRead(
      adapter.local,
      extensionStorageKeys.environmentSettings,
      extensionEnvironmentStorageSchema,
      op,
    )
    if (!result.success) return result
    return resultCreate(result.data?.source ?? null)
  }

  const environmentSettingsSave = (source: ExtensionEnvironmentSource): Promise<Result<void>> =>
    storageWrite(
      adapter.local,
      extensionStorageKeys.environmentSettings,
      extensionEnvironmentStorageSchema,
      storageVersionedCreate<ExtensionEnvironmentStorage>({ source }),
      "extensionStorage.environmentSettingsSave",
    )

  const environmentSettingsClear = (): Promise<Result<void>> =>
    storageRemove(adapter.local, extensionStorageKeys.environmentSettings, "extensionStorage.environmentSettingsClear")

  const authSessionLoad = async (): Promise<Result<ExtensionAuthSession | null>> => {
    const op = "extensionStorage.authSessionLoad"
    const result = await storageRead(
      adapter.session,
      extensionStorageKeys.authSession,
      extensionAuthSessionStorageSchema,
      op,
    )
    if (!result.success) return result
    if (result.data === null) return resultCreate(null)
    const { schemaVersion: _schemaVersion, ...authSession } = result.data
    return resultCreate(authSession)
  }

  const authSessionSave = (authSession: ExtensionAuthSession): Promise<Result<void>> =>
    storageWrite(
      adapter.session,
      extensionStorageKeys.authSession,
      extensionAuthSessionStorageSchema,
      storageVersionedCreate<ExtensionAuthSession>(authSession),
      "extensionStorage.authSessionSave",
    )

  const authSessionClear = (): Promise<Result<void>> =>
    storageRemove(adapter.session, extensionStorageKeys.authSession, "extensionStorage.authSessionClear")

  const sessionStateLoad = async (): Promise<Result<ExtensionSessionState | null>> => {
    const op = "extensionStorage.sessionStateLoad"
    const result = await storageRead(
      adapter.session,
      extensionStorageKeys.sessionState,
      extensionSessionStateStorageSchema,
      op,
    )
    if (!result.success) return result
    if (result.data === null) return resultCreate(null)
    const { schemaVersion: _schemaVersion, ...sessionState } = result.data
    return resultCreate(sessionState)
  }

  const sessionStateSave = (sessionState: ExtensionSessionState): Promise<Result<void>> =>
    storageWrite(
      adapter.session,
      extensionStorageKeys.sessionState,
      extensionSessionStateStorageSchema,
      storageVersionedCreate<ExtensionSessionState>(sessionState),
      "extensionStorage.sessionStateSave",
    )

  const sessionStateClear = (): Promise<Result<void>> =>
    storageRemove(adapter.session, extensionStorageKeys.sessionState, "extensionStorage.sessionStateClear")

  const syncCacheLoad = async (): Promise<Result<ExtensionSyncStorage | null>> => {
    const op = "extensionStorage.syncCacheLoad"
    const result = await storageRead(adapter.local, extensionStorageKeys.syncCache, extensionSyncStorageSchema, op)
    if (!result.success) return result
    if (result.data === null) return resultCreate(null)
    const { schemaVersion: _schemaVersion, ...syncCache } = result.data
    return resultCreate(syncCache)
  }

  const syncCacheSave = (syncCache: ExtensionSyncStorage): Promise<Result<void>> =>
    storageWrite(
      adapter.local,
      extensionStorageKeys.syncCache,
      extensionSyncStorageSchema,
      storageVersionedCreate<ExtensionSyncStorage>(syncCache),
      "extensionStorage.syncCacheSave",
    )

  const syncCacheClear = (): Promise<Result<void>> =>
    storageRemove(adapter.local, extensionStorageKeys.syncCache, "extensionStorage.syncCacheClear")

  const lockPolicyLoad = async (): Promise<Result<ExtensionLockPolicy | null>> => {
    const op = "extensionStorage.lockPolicyLoad"
    const result = await storageRead(adapter.local, extensionStorageKeys.lockPolicy, extensionLockPolicySchema, op)
    if (!result.success) return result
    if (result.data === null) return resultCreate(null)
    const { schemaVersion: _schemaVersion, ...lockPolicy } = result.data
    return resultCreate(lockPolicy)
  }

  const lockPolicySave = (lockPolicy: ExtensionLockPolicy): Promise<Result<void>> =>
    storageWrite(
      adapter.local,
      extensionStorageKeys.lockPolicy,
      extensionLockPolicySchema,
      storageVersionedCreate<ExtensionLockPolicy>(lockPolicy),
      "extensionStorage.lockPolicySave",
    )

  const lockPolicyClear = (): Promise<Result<void>> =>
    storageRemove(adapter.local, extensionStorageKeys.lockPolicy, "extensionStorage.lockPolicyClear")

  const createDraftsLoad = async (): Promise<Result<ExtensionCreateDraft[]>> => {
    const op = "extensionStorage.createDraftsLoad"
    const result = await storageRead(
      adapter.local,
      extensionStorageKeys.createDrafts,
      extensionCreateDraftStorageSchema,
      op,
    )
    if (!result.success) return result
    return resultCreate(result.data?.drafts ?? [])
  }

  const createDraftSave = async (draft: ExtensionCreateDraft): Promise<Result<void>> => {
    const draftsResult = await createDraftsLoad()
    if (!draftsResult.success) return draftsResult
    const drafts = draftsResult.data.filter((currentDraft) => currentDraft.id !== draft.id)
    drafts.push(draft)
    return storageWrite(
      adapter.local,
      extensionStorageKeys.createDrafts,
      extensionCreateDraftStorageSchema,
      storageVersionedCreate({ drafts }),
      "extensionStorage.createDraftSave",
    )
  }

  const createDraftDelete = async (id: string): Promise<Result<void>> => {
    const idResult = v.safeParse(v.pipe(v.string(), v.minLength(1)), id)
    if (!idResult.success) {
      return resultErrorCreate("extensionStorage.createDraftDelete", "Create draft id is invalid.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    }
    const draftsResult = await createDraftsLoad()
    if (!draftsResult.success) return draftsResult
    return storageWrite(
      adapter.local,
      extensionStorageKeys.createDrafts,
      extensionCreateDraftStorageSchema,
      storageVersionedCreate({ drafts: draftsResult.data.filter((draft) => draft.id !== idResult.output) }),
      "extensionStorage.createDraftDelete",
    )
  }

  const createDraftsClear = (): Promise<Result<void>> =>
    storageRemove(adapter.local, extensionStorageKeys.createDrafts, "extensionStorage.createDraftsClear")

  const lock = (): Promise<Result<void>> =>
    storageRemove(adapter.session, extensionStorageKeys.sessionState, "extensionStorage.lock")

  const logout = async (): Promise<Result<void>> => {
    const sessionResult = await storageRemove(
      adapter.session,
      [extensionStorageKeys.authSession, extensionStorageKeys.sessionState],
      "extensionStorage.logout",
    )
    const localResult = await storageRemove(
      adapter.local,
      [extensionStorageKeys.syncCache, extensionStorageKeys.createDrafts],
      "extensionStorage.logout",
    )
    if (!sessionResult.success) return sessionResult
    if (!localResult.success) return localResult
    return resultCreate(undefined)
  }

  return {
    environmentSettingsLoad,
    environmentSettingsSave,
    environmentSettingsClear,
    authSessionLoad,
    authSessionSave,
    authSessionClear,
    sessionStateLoad,
    sessionStateSave,
    sessionStateClear,
    syncCacheLoad,
    syncCacheSave,
    syncCacheClear,
    lockPolicyLoad,
    lockPolicySave,
    lockPolicyClear,
    createDraftsLoad,
    createDraftSave,
    createDraftDelete,
    createDraftsClear,
    lock,
    logout,
  }
}
