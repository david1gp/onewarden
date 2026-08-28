import type { Result } from "#result"
import { extensionBitwardenApiClientCreate } from "../api/extensionBitwardenApiClientCreate.js"
import { extensionEnvironmentResolve } from "../api/extensionEnvironmentResolve.js"
import type { extensionStorageCreate } from "../storage/extensionStorageCreate.js"
import { resultCreate } from "../../shared/result/resultCreate.js"

type ExtensionApiClient = ReturnType<typeof extensionBitwardenApiClientCreate>
type ExtensionApiClientMethods = Pick<
  ExtensionApiClient,
  "prelogin" | "passwordToken" | "refreshToken" | "revisionDate" | "sync" | "cipherCreate"
>
type ExtensionStorage = ReturnType<typeof extensionStorageCreate>

export function extensionBackgroundApiClientCreate(storage: ExtensionStorage): ExtensionApiClientMethods {
  const clientLoad = async (): Promise<Result<ExtensionApiClient>> => {
    const sourceResult = await storage.environmentSettingsLoad()
    if (!sourceResult.success) return sourceResult
    const environmentResult = extensionEnvironmentResolve(sourceResult.data ?? "us")
    if (!environmentResult.success) return environmentResult
    return resultCreate(extensionBitwardenApiClientCreate(environmentResult.data))
  }

  const prelogin = async (
    request: Parameters<ExtensionApiClient["prelogin"]>[0],
  ): ReturnType<ExtensionApiClient["prelogin"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.prelogin(request)
  }

  const passwordToken = async (
    request: Parameters<ExtensionApiClient["passwordToken"]>[0],
  ): ReturnType<ExtensionApiClient["passwordToken"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.passwordToken(request)
  }

  const refreshToken = async (
    request: Parameters<ExtensionApiClient["refreshToken"]>[0],
  ): ReturnType<ExtensionApiClient["refreshToken"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.refreshToken(request)
  }

  const revisionDate = async (
    request: Parameters<ExtensionApiClient["revisionDate"]>[0],
  ): ReturnType<ExtensionApiClient["revisionDate"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.revisionDate(request)
  }

  const sync = async (request: Parameters<ExtensionApiClient["sync"]>[0]): ReturnType<ExtensionApiClient["sync"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.sync(request)
  }

  const cipherCreate = async (
    request: Parameters<ExtensionApiClient["cipherCreate"]>[0],
    protectedRequest: Parameters<ExtensionApiClient["cipherCreate"]>[1],
  ): ReturnType<ExtensionApiClient["cipherCreate"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.cipherCreate(request, protectedRequest)
  }

  return { prelogin, passwordToken, refreshToken, revisionDate, sync, cipherCreate }
}
