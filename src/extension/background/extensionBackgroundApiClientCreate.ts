import type { Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { extensionBitwardenApiClientCreate } from "../api/extensionBitwardenApiClientCreate.js"
import { extensionEnvironmentResolve } from "../api/extensionEnvironmentResolve.js"
import type { extensionStorageCreate } from "../storage/extensionStorageCreate.js"

type ExtensionApiClient = ReturnType<typeof extensionBitwardenApiClientCreate>
type ExtensionApiClientMethods = Pick<
  ExtensionApiClient,
  | "prelogin"
  | "passwordToken"
  | "refreshToken"
  | "accountRegister"
  | "accountVerificationEmailSend"
  | "accountVerify"
  | "accountPasswordSetup"
  | "revisionDate"
  | "sync"
  | "cipherList"
  | "cipherRead"
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

  const accountRegister = async (
    request: Parameters<ExtensionApiClient["accountRegister"]>[0],
  ): ReturnType<ExtensionApiClient["accountRegister"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.accountRegister(request)
  }

  const accountVerificationEmailSend = async (
    request: Parameters<ExtensionApiClient["accountVerificationEmailSend"]>[0],
  ): ReturnType<ExtensionApiClient["accountVerificationEmailSend"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.accountVerificationEmailSend(request)
  }

  const accountVerify = async (
    request: Parameters<ExtensionApiClient["accountVerify"]>[0],
  ): ReturnType<ExtensionApiClient["accountVerify"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.accountVerify(request)
  }

  const accountPasswordSetup = async (
    request: Parameters<ExtensionApiClient["accountPasswordSetup"]>[0],
  ): ReturnType<ExtensionApiClient["accountPasswordSetup"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.accountPasswordSetup(request)
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

  const cipherList = async (
    request: Parameters<ExtensionApiClient["cipherList"]>[0],
  ): ReturnType<ExtensionApiClient["cipherList"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.cipherList(request)
  }

  const cipherRead = async (
    cipherId: Parameters<ExtensionApiClient["cipherRead"]>[0],
    request: Parameters<ExtensionApiClient["cipherRead"]>[1],
  ): ReturnType<ExtensionApiClient["cipherRead"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.cipherRead(cipherId, request)
  }

  /** Background-only mutation seam retained for passkey registration; normal creation uses a web handoff. */
  const cipherCreate = async (
    request: Parameters<ExtensionApiClient["cipherCreate"]>[0],
    protectedRequest: Parameters<ExtensionApiClient["cipherCreate"]>[1],
  ): ReturnType<ExtensionApiClient["cipherCreate"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.cipherCreate(request, protectedRequest)
  }

  const cipherUpdate = async (
    cipherId: Parameters<ExtensionApiClient["cipherUpdate"]>[0],
    request: Parameters<ExtensionApiClient["cipherUpdate"]>[1],
    protectedRequest: Parameters<ExtensionApiClient["cipherUpdate"]>[2],
  ): ReturnType<ExtensionApiClient["cipherUpdate"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.cipherUpdate(cipherId, request, protectedRequest)
  }

  const cipherPartial = async (
    cipherId: Parameters<ExtensionApiClient["cipherPartial"]>[0],
    request: Parameters<ExtensionApiClient["cipherPartial"]>[1],
    protectedRequest: Parameters<ExtensionApiClient["cipherPartial"]>[2],
  ): ReturnType<ExtensionApiClient["cipherPartial"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.cipherPartial(cipherId, request, protectedRequest)
  }

  const cipherDelete = async (
    cipherId: Parameters<ExtensionApiClient["cipherDelete"]>[0],
    hard: Parameters<ExtensionApiClient["cipherDelete"]>[1],
    protectedRequest: Parameters<ExtensionApiClient["cipherDelete"]>[2],
  ): ReturnType<ExtensionApiClient["cipherDelete"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.cipherDelete(cipherId, hard, protectedRequest)
  }

  const cipherRestore = async (
    cipherId: Parameters<ExtensionApiClient["cipherRestore"]>[0],
    protectedRequest: Parameters<ExtensionApiClient["cipherRestore"]>[1],
  ): ReturnType<ExtensionApiClient["cipherRestore"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.cipherRestore(cipherId, protectedRequest)
  }

  const cipherArchive = async (
    cipherId: Parameters<ExtensionApiClient["cipherArchive"]>[0],
    archived: Parameters<ExtensionApiClient["cipherArchive"]>[1],
    protectedRequest: Parameters<ExtensionApiClient["cipherArchive"]>[2],
  ): ReturnType<ExtensionApiClient["cipherArchive"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.cipherArchive(cipherId, archived, protectedRequest)
  }

  const cipherMove = async (
    ids: Parameters<ExtensionApiClient["cipherMove"]>[0],
    folderId: Parameters<ExtensionApiClient["cipherMove"]>[1],
    protectedRequest: Parameters<ExtensionApiClient["cipherMove"]>[2],
  ): ReturnType<ExtensionApiClient["cipherMove"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.cipherMove(ids, folderId, protectedRequest)
  }

  const cipherCollectionsUpdate = async (
    cipherId: Parameters<ExtensionApiClient["cipherCollectionsUpdate"]>[0],
    collectionIds: Parameters<ExtensionApiClient["cipherCollectionsUpdate"]>[1],
    protectedRequest: Parameters<ExtensionApiClient["cipherCollectionsUpdate"]>[2],
  ): ReturnType<ExtensionApiClient["cipherCollectionsUpdate"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.cipherCollectionsUpdate(cipherId, collectionIds, protectedRequest)
  }

  const attachmentUpload = async (
    cipherId: Parameters<ExtensionApiClient["attachmentUpload"]>[0],
    data: Parameters<ExtensionApiClient["attachmentUpload"]>[1],
    fileName: Parameters<ExtensionApiClient["attachmentUpload"]>[2],
    key: Parameters<ExtensionApiClient["attachmentUpload"]>[3],
    request: Parameters<ExtensionApiClient["attachmentUpload"]>[4],
  ): ReturnType<ExtensionApiClient["attachmentUpload"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.attachmentUpload(cipherId, data, fileName, key, request)
  }

  const attachmentDownload = async (
    cipherId: Parameters<ExtensionApiClient["attachmentDownload"]>[0],
    attachmentId: Parameters<ExtensionApiClient["attachmentDownload"]>[1],
    request: Parameters<ExtensionApiClient["attachmentDownload"]>[2],
  ): ReturnType<ExtensionApiClient["attachmentDownload"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.attachmentDownload(cipherId, attachmentId, request)
  }

  const attachmentDelete = async (
    cipherId: Parameters<ExtensionApiClient["attachmentDelete"]>[0],
    attachmentId: Parameters<ExtensionApiClient["attachmentDelete"]>[1],
    request: Parameters<ExtensionApiClient["attachmentDelete"]>[2],
  ): ReturnType<ExtensionApiClient["attachmentDelete"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.attachmentDelete(cipherId, attachmentId, request)
  }

  const folderList = async (
    request: Parameters<ExtensionApiClient["folderList"]>[0],
  ): ReturnType<ExtensionApiClient["folderList"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.folderList(request)
  }

  const folderRead = async (
    folderId: Parameters<ExtensionApiClient["folderRead"]>[0],
    request: Parameters<ExtensionApiClient["folderRead"]>[1],
  ): ReturnType<ExtensionApiClient["folderRead"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.folderRead(folderId, request)
  }

  const folderCreate = async (
    folder: Parameters<ExtensionApiClient["folderCreate"]>[0],
    request: Parameters<ExtensionApiClient["folderCreate"]>[1],
  ): ReturnType<ExtensionApiClient["folderCreate"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.folderCreate(folder, request)
  }

  const folderUpdate = async (
    folderId: Parameters<ExtensionApiClient["folderUpdate"]>[0],
    folder: Parameters<ExtensionApiClient["folderUpdate"]>[1],
    request: Parameters<ExtensionApiClient["folderUpdate"]>[2],
  ): ReturnType<ExtensionApiClient["folderUpdate"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.folderUpdate(folderId, folder, request)
  }

  const folderDelete = async (
    folderId: Parameters<ExtensionApiClient["folderDelete"]>[0],
    request: Parameters<ExtensionApiClient["folderDelete"]>[1],
  ): ReturnType<ExtensionApiClient["folderDelete"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.folderDelete(folderId, request)
  }

  const collectionList = async (
    request: Parameters<ExtensionApiClient["collectionList"]>[0],
  ): ReturnType<ExtensionApiClient["collectionList"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.collectionList(request)
  }

  const collectionRead = async (
    organizationId: Parameters<ExtensionApiClient["collectionRead"]>[0],
    collectionId: Parameters<ExtensionApiClient["collectionRead"]>[1],
    request: Parameters<ExtensionApiClient["collectionRead"]>[2],
  ): ReturnType<ExtensionApiClient["collectionRead"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.collectionRead(organizationId, collectionId, request)
  }

  const collectionCreate = async (
    organizationId: Parameters<ExtensionApiClient["collectionCreate"]>[0],
    collection: Parameters<ExtensionApiClient["collectionCreate"]>[1],
    request: Parameters<ExtensionApiClient["collectionCreate"]>[2],
  ): ReturnType<ExtensionApiClient["collectionCreate"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.collectionCreate(organizationId, collection, request)
  }

  const collectionUpdate = async (
    organizationId: Parameters<ExtensionApiClient["collectionUpdate"]>[0],
    collectionId: Parameters<ExtensionApiClient["collectionUpdate"]>[1],
    collection: Parameters<ExtensionApiClient["collectionUpdate"]>[2],
    request: Parameters<ExtensionApiClient["collectionUpdate"]>[3],
  ): ReturnType<ExtensionApiClient["collectionUpdate"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.collectionUpdate(organizationId, collectionId, collection, request)
  }

  const collectionDelete = async (
    organizationId: Parameters<ExtensionApiClient["collectionDelete"]>[0],
    collectionId: Parameters<ExtensionApiClient["collectionDelete"]>[1],
    request: Parameters<ExtensionApiClient["collectionDelete"]>[2],
  ): ReturnType<ExtensionApiClient["collectionDelete"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.collectionDelete(organizationId, collectionId, request)
  }

  const sessionHandoffCreate = async (
    request: Parameters<ExtensionApiClient["sessionHandoffCreate"]>[0],
  ): ReturnType<ExtensionApiClient["sessionHandoffCreate"]> => {
    const clientResult = await clientLoad()
    if (!clientResult.success) return clientResult
    return clientResult.data.sessionHandoffCreate(request)
  }

  return {
    prelogin,
    passwordToken,
    refreshToken,
    accountRegister,
    accountVerificationEmailSend,
    accountVerify,
    accountPasswordSetup,
    revisionDate,
    sync,
    cipherList,
    cipherRead,
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
    sessionHandoffCreate,
  }
}
