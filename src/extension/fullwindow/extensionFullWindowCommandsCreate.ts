import type { Result } from "#result"
import { base64Decode } from "../../shared/crypto/base64Decode.js"
import { base64Encode } from "../../shared/crypto/base64Encode.js"
import type { ExtensionBackgroundCollectionDto } from "../background/extensionBackgroundCollectionDtoSchema.js"
import type { ExtensionBackgroundFolderDto } from "../background/extensionBackgroundFolderDtoSchema.js"
import type { ExtensionClipboardAdapter } from "../clipboard/extensionClipboardAdapter.js"
import { extensionClipboardAdapterCreate } from "../clipboard/extensionClipboardAdapterCreate.js"
import { extensionCommonCommandsCreate } from "../commands/extensionCommonCommandsCreate.js"
import type { ExtensionCipherAttachment } from "../crypto/extensionCipherAttachmentSchema.js"
import type { ExtensionCipherPasswordHistoryEntry } from "../crypto/extensionCipherPasswordHistoryEntrySchema.js"
import type { ExtensionCipher } from "../crypto/extensionCipherSchema.js"
import type { ExtensionPersonalLoginCipher } from "../crypto/extensionPersonalLoginCipherSchema.js"
import type { ExtensionCopyableField } from "../ExtensionCopyableField.js"
import type { ExtensionLogin } from "../ExtensionLogin.js"
import type { ExtensionRuntimeMessage } from "../messaging/extensionRuntimeMessageSchema.js"
import { extensionRuntimeMessageSend } from "../messaging/extensionRuntimeMessageSend.js"
import type { ExtensionLockPolicy } from "../storage/extensionLockPolicySchema.js"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import { extensionFullWindowEnvironmentSaveStatus } from "./ExtensionFullWindowEnvironmentSaveStatus.js"
import type { ExtensionFullWindowEnvironmentSettings } from "./ExtensionFullWindowEnvironmentSettings.js"
import { extensionFullWindowSecuritySaveStatus } from "./ExtensionFullWindowSecuritySaveStatus.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionAttachmentDownload } from "./extensionAttachmentDownload.js"
import { extensionFullWindowEnvironmentSettingsCreate } from "./extensionFullWindowEnvironmentSettingsCreate.js"
import { extensionHostPermissionRequest } from "./extensionHostPermissionRequest.js"

export type ExtensionFullWindowCommandsOptions = {
  messageSend?: (message: ExtensionRuntimeMessage) => Promise<Result<any>>
  clipboard?: ExtensionClipboardAdapter
  hostPermissionRequest?: (environment: ExtensionFullWindowEnvironmentSettings) => Promise<Result<void>>
  attachmentDownload?: (fileName: string, bytes: Uint8Array) => Promise<Result<void>>
  onModelUpdate?: (updater: (prev: ExtensionFullWindowViewModel) => ExtensionFullWindowViewModel) => void
  onRefresh?: () => Promise<void>
}

/**
 * Full-window commands dispatch typed runtime messages to the background worker
 * and manage copy feedback, busy states, create workflows, and view model refresh.
 */
export function extensionFullWindowCommandsCreate(
  overrides: Partial<ExtensionFullWindowCommands> = {},
  options: ExtensionFullWindowCommandsOptions = {},
): ExtensionFullWindowCommands {
  const sender = options.messageSend ?? extensionRuntimeMessageSend
  const clipboard = options.clipboard ?? extensionClipboardAdapterCreate()
  const hostPermissionRequest = options.hostPermissionRequest ?? extensionHostPermissionRequest
  const attachmentDownloadStart = options.attachmentDownload ?? extensionAttachmentDownload
  const onModelUpdate = options.onModelUpdate ?? (() => {})
  const onRefresh = options.onRefresh ?? (async () => {})

  const commonCommands = extensionCommonCommandsCreate<
    ExtensionLogin,
    ExtensionCopyableField,
    ExtensionFullWindowViewModel
  >({
    messageSend: sender,
    clipboard,
    onModelUpdate,
    onRefresh,
  })

  const handoffOpen = (request: Extract<ExtensionRuntimeMessage, { type: "sessionHandoffOpen" }>["request"]) => {
    onModelUpdate((prev) => ({ ...prev, busy: true, errorMessage: null }))
    void sender({ type: "sessionHandoffOpen", request }).then((res) => {
      if (!res.success) {
        onModelUpdate((prev) => ({
          ...prev,
          busy: false,
          errorMessage: res.errorMessage ?? "OneWarden could not be opened.",
        }))
        return
      }
      onModelUpdate((prev) => ({ ...prev, busy: false, errorMessage: null }))
    })
  }

  const loginAdd = () => handoffOpen({ operation: "create", cipherId: null })
  const loginEdit = (login: ExtensionLogin) => handoffOpen({ operation: "edit", cipherId: login.id })

  const loginRead = (cipherId: string) => {
    onModelUpdate((prev) => ({ ...prev, loginDetailLoading: true, selectedLoginCipher: null, errorMessage: null }))
    void sender({ type: "cipherDetailRead", request: { cipherId } }).then((result) => {
      if (!result.success) {
        onModelUpdate((prev) => ({ ...prev, loginDetailLoading: false, errorMessage: result.errorMessage }))
        return
      }
      if (result.data.type !== 1) {
        onModelUpdate((prev) => ({
          ...prev,
          loginDetailLoading: false,
          errorMessage: "Selected cipher is not a login.",
        }))
        return
      }
      onModelUpdate((prev) => ({ ...prev, loginDetailLoading: false, selectedLoginCipher: result.data }))
    })
  }

  const selectedCipherReplace = (prev: ExtensionFullWindowViewModel, cipher: ExtensionCipher) => ({
    ...prev,
    selectedLoginCipher: cipher.type === 1 ? cipher : prev.selectedLoginCipher,
    selectedSecureNote: cipher.type === 2 ? cipher : prev.selectedSecureNote,
    selectedCard: cipher.type === 3 ? cipher : prev.selectedCard,
    selectedIdentity: cipher.type === 4 ? cipher : prev.selectedIdentity,
    selectedSshKey: cipher.type === 5 ? cipher : prev.selectedSshKey,
  })

  const attachmentUpload = (cipher: ExtensionCipher, file: File) => {
    onModelUpdate((prev) => ({ ...prev, attachmentOperationId: "upload", attachmentProgress: 0, errorMessage: null }))
    void file.arrayBuffer().then(
      async (buffer) => {
        const bytes = new Uint8Array(buffer)
        onModelUpdate((prev) => ({ ...prev, attachmentProgress: 35 }))
        const dataBase64 = base64Encode(bytes)
        bytes.fill(0)
        onModelUpdate((prev) => ({ ...prev, attachmentProgress: 60 }))
        const result = await sender({
          type: "attachmentUpload",
          request: { cipherId: cipher.id, fileName: file.name, dataBase64 },
        })
        if (!result.success) {
          onModelUpdate((prev) => ({
            ...prev,
            attachmentOperationId: null,
            attachmentProgress: null,
            errorMessage: result.errorMessage,
          }))
          return
        }
        onModelUpdate((prev) => ({
          ...selectedCipherReplace(prev, result.data),
          attachmentOperationId: null,
          attachmentProgress: null,
          errorMessage: null,
        }))
      },
      () => {
        onModelUpdate((prev) => ({
          ...prev,
          attachmentOperationId: null,
          attachmentProgress: null,
          errorMessage: "Attachment file could not be read.",
        }))
      },
    )
  }

  const attachmentDownload = (cipher: ExtensionCipher, attachment: ExtensionCipherAttachment) => {
    onModelUpdate((prev) => ({
      ...prev,
      attachmentOperationId: attachment.id,
      attachmentProgress: 0,
      errorMessage: null,
    }))
    void sender({
      type: "attachmentDownload",
      request: { cipherId: cipher.id, attachmentId: attachment.id },
    }).then(async (result) => {
      if (!result.success) {
        onModelUpdate((prev) => ({
          ...prev,
          attachmentOperationId: null,
          attachmentProgress: null,
          errorMessage: result.errorMessage,
        }))
        return
      }
      const bytesResult = base64Decode(result.data.dataBase64)
      if (!bytesResult.success) {
        onModelUpdate((prev) => ({
          ...prev,
          attachmentOperationId: null,
          attachmentProgress: null,
          errorMessage: "Downloaded attachment data is invalid.",
        }))
        return
      }
      const bytes = bytesResult.data
      onModelUpdate((prev) => ({ ...prev, attachmentProgress: 80 }))
      const downloadResult = await attachmentDownloadStart(result.data.fileName, bytes)
      bytes.fill(0)
      onModelUpdate((prev) => ({
        ...prev,
        attachmentOperationId: null,
        attachmentProgress: null,
        errorMessage: downloadResult.success ? null : downloadResult.errorMessage,
      }))
    })
  }

  const attachmentDelete = (cipher: ExtensionCipher, attachment: ExtensionCipherAttachment) => {
    onModelUpdate((prev) => ({
      ...prev,
      attachmentOperationId: attachment.id,
      attachmentProgress: null,
      errorMessage: null,
    }))
    void sender({
      type: "attachmentDelete",
      request: { cipherId: cipher.id, attachmentId: attachment.id },
    }).then((result) => {
      if (!result.success) {
        onModelUpdate((prev) => ({ ...prev, attachmentOperationId: null, errorMessage: result.errorMessage }))
        return
      }
      onModelUpdate((prev) => ({
        ...selectedCipherReplace(prev, result.data),
        attachmentOperationId: null,
        errorMessage: null,
      }))
    })
  }

  const passwordHistoryRestore = (cipher: ExtensionPersonalLoginCipher, entry: ExtensionCipherPasswordHistoryEntry) => {
    const currentPassword = cipher.login.password
    const remaining = (cipher.passwordHistory ?? []).filter((candidate) => candidate !== entry)
    const passwordHistory =
      currentPassword === null
        ? remaining
        : [{ password: currentPassword, lastUsedDate: new Date().toISOString() }, ...remaining]
    const restored: ExtensionPersonalLoginCipher = {
      ...cipher,
      revisionDate: new Date().toISOString(),
      login: { ...cipher.login, password: entry.password },
      passwordHistory,
    }
    onModelUpdate((prev) => ({ ...prev, busy: true, errorMessage: null }))
    void sender({ type: "cipherUpdate", request: { cipherId: cipher.id, cipher: restored } }).then(async (result) => {
      if (!result.success) {
        onModelUpdate((prev) => ({ ...prev, busy: false, errorMessage: result.errorMessage }))
        return
      }
      await onRefresh()
      loginRead(cipher.id)
      onModelUpdate((prev) => ({ ...prev, busy: false, errorMessage: null }))
    })
  }

  const secureNotesLoad = () => {
    onModelUpdate((prev) => ({ ...prev, secureNotesLoading: true, errorMessage: null }))
    void sender({
      type: "vaultSearch",
      request: { query: "", type: 2, includeDeleted: false, includeArchived: false },
    }).then((res) => {
      if (!res.success) {
        onModelUpdate((prev) => ({ ...prev, secureNotesLoading: false, errorMessage: res.errorMessage }))
        return
      }
      onModelUpdate((prev) => ({
        ...prev,
        secureNotesLoading: false,
        secureNotes: res.data.ciphers,
        errorMessage: null,
      }))
    })
  }

  const secureNoteRead = (cipherId: string) => {
    onModelUpdate((prev) => ({ ...prev, secureNoteDetailLoading: true, selectedSecureNote: null, errorMessage: null }))
    void sender({ type: "cipherDetailRead", request: { cipherId } }).then((res) => {
      if (!res.success) {
        onModelUpdate((prev) => ({ ...prev, secureNoteDetailLoading: false, errorMessage: res.errorMessage }))
        return
      }
      onModelUpdate((prev) => ({
        ...prev,
        secureNoteDetailLoading: false,
        selectedSecureNote: res.data,
        errorMessage: null,
      }))
    })
  }

  const secureNoteMutate = (message: ExtensionRuntimeMessage) => {
    onModelUpdate((prev) => ({ ...prev, busy: true, errorMessage: null }))
    void sender(message).then(async (res) => {
      if (!res.success) {
        onModelUpdate((prev) => ({ ...prev, busy: false, errorMessage: res.errorMessage }))
        return
      }
      onModelUpdate((prev) => ({ ...prev, busy: false, selectedSecureNote: null }))
      secureNotesLoad()
    })
  }
  const secureNoteCreate = (cipher: ExtensionCipher) => secureNoteMutate({ type: "cipherCreate", request: { cipher } })
  const secureNoteUpdate = (cipherId: string, cipher: ExtensionCipher) =>
    secureNoteMutate({ type: "cipherUpdate", request: { cipherId, cipher } })
  const secureNoteDelete = (cipherId: string) =>
    secureNoteMutate({ type: "cipherDelete", request: { cipherId, hard: false } })
  const secureNoteCopy = (note: string) => {
    void clipboard.copyText(note).then((result) => {
      if (!result.success) onModelUpdate((prev) => ({ ...prev, errorMessage: result.errorMessage }))
    })
  }

  const cardsLoad = () => {
    onModelUpdate((prev) => ({ ...prev, cardsLoading: true, errorMessage: null }))
    void sender({
      type: "vaultSearch",
      request: { query: "", type: 3, includeDeleted: false, includeArchived: false },
    }).then((res) => {
      if (!res.success) {
        onModelUpdate((prev) => ({ ...prev, cardsLoading: false, errorMessage: res.errorMessage }))
        return
      }
      onModelUpdate((prev) => ({ ...prev, cardsLoading: false, cards: res.data.ciphers, errorMessage: null }))
    })
  }
  const cardRead = (cipherId: string) => {
    onModelUpdate((prev) => ({ ...prev, cardDetailLoading: true, selectedCard: null, errorMessage: null }))
    void sender({ type: "cipherDetailRead", request: { cipherId } }).then((res) => {
      if (!res.success) {
        onModelUpdate((prev) => ({ ...prev, cardDetailLoading: false, errorMessage: res.errorMessage }))
        return
      }
      onModelUpdate((prev) => ({ ...prev, cardDetailLoading: false, selectedCard: res.data, errorMessage: null }))
    })
  }
  const cardMutate = (message: ExtensionRuntimeMessage) => {
    onModelUpdate((prev) => ({ ...prev, busy: true, errorMessage: null }))
    void sender(message).then((res) => {
      if (!res.success) {
        onModelUpdate((prev) => ({ ...prev, busy: false, errorMessage: res.errorMessage }))
        return
      }
      onModelUpdate((prev) => ({ ...prev, busy: false, selectedCard: null }))
      cardsLoad()
    })
  }
  const cardCreate = (cipher: ExtensionCipher) => cardMutate({ type: "cipherCreate", request: { cipher } })
  const cardUpdate = (cipherId: string, cipher: ExtensionCipher) =>
    cardMutate({ type: "cipherUpdate", request: { cipherId, cipher } })
  const cardDelete = (cipherId: string) => cardMutate({ type: "cipherDelete", request: { cipherId, hard: false } })

  const identitiesLoad = () => {
    onModelUpdate((prev) => ({ ...prev, identitiesLoading: true, errorMessage: null }))
    void sender({
      type: "vaultSearch",
      request: { query: "", type: 4, includeDeleted: false, includeArchived: false },
    }).then((res) => {
      if (!res.success) {
        onModelUpdate((prev) => ({ ...prev, identitiesLoading: false, errorMessage: res.errorMessage }))
        return
      }
      onModelUpdate((prev) => ({ ...prev, identitiesLoading: false, identities: res.data.ciphers, errorMessage: null }))
    })
  }
  const identityRead = (cipherId: string) => {
    onModelUpdate((prev) => ({ ...prev, identityDetailLoading: true, selectedIdentity: null, errorMessage: null }))
    void sender({ type: "cipherDetailRead", request: { cipherId } }).then((res) => {
      if (!res.success) {
        onModelUpdate((prev) => ({ ...prev, identityDetailLoading: false, errorMessage: res.errorMessage }))
        return
      }
      onModelUpdate((prev) => ({
        ...prev,
        identityDetailLoading: false,
        selectedIdentity: res.data,
        errorMessage: null,
      }))
    })
  }
  const identityMutate = (message: ExtensionRuntimeMessage) => {
    onModelUpdate((prev) => ({ ...prev, busy: true, errorMessage: null }))
    void sender(message).then((res) => {
      if (!res.success) {
        onModelUpdate((prev) => ({ ...prev, busy: false, errorMessage: res.errorMessage }))
        return
      }
      onModelUpdate((prev) => ({ ...prev, busy: false, selectedIdentity: null }))
      identitiesLoad()
    })
  }
  const identityCreate = (cipher: ExtensionCipher) => identityMutate({ type: "cipherCreate", request: { cipher } })
  const identityUpdate = (cipherId: string, cipher: ExtensionCipher) =>
    identityMutate({ type: "cipherUpdate", request: { cipherId, cipher } })
  const identityDelete = (cipherId: string) =>
    identityMutate({ type: "cipherDelete", request: { cipherId, hard: false } })

  const sshKeysLoad = () => {
    onModelUpdate((prev) => ({ ...prev, sshKeysLoading: true, errorMessage: null }))
    void sender({
      type: "vaultSearch",
      request: { query: "", type: 5, includeDeleted: false, includeArchived: false },
    }).then((res) => {
      if (!res.success) {
        onModelUpdate((prev) => ({ ...prev, sshKeysLoading: false, errorMessage: res.errorMessage }))
        return
      }
      onModelUpdate((prev) => ({ ...prev, sshKeysLoading: false, sshKeys: res.data.ciphers, errorMessage: null }))
    })
  }
  const sshKeyRead = (cipherId: string) => {
    onModelUpdate((prev) => ({ ...prev, sshKeyDetailLoading: true, selectedSshKey: null, errorMessage: null }))
    void sender({ type: "cipherDetailRead", request: { cipherId } }).then((res) => {
      if (!res.success) {
        onModelUpdate((prev) => ({ ...prev, sshKeyDetailLoading: false, errorMessage: res.errorMessage }))
        return
      }
      onModelUpdate((prev) => ({ ...prev, sshKeyDetailLoading: false, selectedSshKey: res.data, errorMessage: null }))
    })
  }
  const sshKeyMutate = (message: ExtensionRuntimeMessage) => {
    onModelUpdate((prev) => ({ ...prev, busy: true, errorMessage: null }))
    void sender(message).then((res) => {
      if (!res.success) {
        onModelUpdate((prev) => ({ ...prev, busy: false, errorMessage: res.errorMessage }))
        return
      }
      onModelUpdate((prev) => ({ ...prev, busy: false, selectedSshKey: null }))
      sshKeysLoad()
    })
  }
  const sshKeyCreate = (cipher: ExtensionCipher) => sshKeyMutate({ type: "cipherCreate", request: { cipher } })
  const sshKeyUpdate = (cipherId: string, cipher: ExtensionCipher) =>
    sshKeyMutate({ type: "cipherUpdate", request: { cipherId, cipher } })
  const sshKeyDelete = (cipherId: string) => sshKeyMutate({ type: "cipherDelete", request: { cipherId, hard: false } })

  let cipherCopyTimeoutId: ReturnType<typeof setTimeout> | null = null
  const cipherFieldCopy = (key: string, value: string) => {
    void clipboard.copyText(value).then((result) => {
      if (!result.success) {
        onModelUpdate((prev) => ({ ...prev, errorMessage: result.errorMessage }))
        return
      }
      onModelUpdate((prev) => ({ ...prev, copiedFieldKey: key }))
      if (cipherCopyTimeoutId !== null) clearTimeout(cipherCopyTimeoutId)
      cipherCopyTimeoutId = setTimeout(() => {
        onModelUpdate((prev) => (prev.copiedFieldKey === key ? { ...prev, copiedFieldKey: null } : prev))
      }, 2000)
    })
  }

  const resourcesLoad = () => {
    let organizations: NonNullable<ExtensionFullWindowViewModel["profile"]>["organizations"] = []
    onModelUpdate((prev) => {
      organizations = (prev.profile?.organizations ?? []).filter((organization) => organization.status === 2)
      return { ...prev, resourcesLoading: true, errorMessage: null }
    })
    void Promise.all([
      sender({ type: "folderList", request: {} }),
      ...organizations.map((organization) =>
        sender({ type: "collectionList", request: { organizationId: organization.id } }),
      ),
    ]).then((results) => {
      const failure = results.find((result) => !result.success)
      if (failure !== undefined && !failure.success) {
        onModelUpdate((prev) => ({ ...prev, resourcesLoading: false, errorMessage: failure.errorMessage }))
        return
      }
      const folders = results[0]?.success ? results[0].data : []
      const collections = results.slice(1).flatMap((result) => (result.success ? result.data : []))
      onModelUpdate((prev) => ({ ...prev, resourcesLoading: false, folders, collections, errorMessage: null }))
    })
  }

  const resourceMutate = (message: ExtensionRuntimeMessage) => {
    onModelUpdate((prev) => ({ ...prev, busy: true, errorMessage: null }))
    void sender(message).then(async (result) => {
      if (!result.success) {
        onModelUpdate((prev) => ({ ...prev, busy: false, errorMessage: result.errorMessage }))
        return
      }
      await onRefresh()
      onModelUpdate((prev) => ({ ...prev, busy: false, errorMessage: null }))
    })
  }
  const folderCreate = (folder: ExtensionBackgroundFolderDto) =>
    resourceMutate({ type: "folderCreate", request: { folder } })
  const folderUpdate = (folder: ExtensionBackgroundFolderDto) =>
    resourceMutate({ type: "folderUpdate", request: { folderId: folder.id, folder } })
  const folderDelete = (folderId: string) => resourceMutate({ type: "folderDelete", request: { folderId } })
  const collectionCreate = (collection: ExtensionBackgroundCollectionDto) =>
    resourceMutate({
      type: "collectionCreate",
      request: { organizationId: collection.organizationId, collection, groups: [], users: [] },
    })
  const collectionUpdate = (collection: ExtensionBackgroundCollectionDto) =>
    resourceMutate({
      type: "collectionUpdate",
      request: {
        collectionId: collection.id,
        organizationId: collection.organizationId,
        collection,
        groups: [],
        users: [],
      },
    })
  const collectionDelete = (collection: ExtensionBackgroundCollectionDto) =>
    resourceMutate({
      type: "collectionDelete",
      request: { collectionId: collection.id, organizationId: collection.organizationId },
    })
  const cipherMove = (cipherId: string, folderId: string | null) =>
    resourceMutate({ type: "cipherMove", request: { ids: [cipherId], folderId } })
  const cipherCollectionsUpdate = (cipherId: string, collectionIds: string[]) =>
    resourceMutate({ type: "cipherCollectionsUpdate", request: { cipherId, collectionIds } })

  const accountLogin = (
    credentials?: { email: string; password: string },
    environment: ExtensionFullWindowEnvironmentSettings = extensionFullWindowEnvironmentSettingsCreate(),
  ) => {
    if (credentials === undefined) return
    onModelUpdate((prev) => ({ ...prev, busy: true, errorMessage: null }))
    void hostPermissionRequest(environment).then(async (permissionResult) => {
      if (!permissionResult.success) {
        onModelUpdate((prev) => ({
          ...prev,
          busy: false,
          errorMessage: permissionResult.errorMessage ?? "Server access permission was not granted.",
        }))
        return
      }
      const res = await sender({ type: "login", request: credentials })
      if (!res.success) {
        onModelUpdate((prev) => ({ ...prev, busy: false, errorMessage: res.errorMessage ?? "Login failed." }))
        return
      }
      await onRefresh()
    })
  }

  const environmentSave = (environment: ExtensionFullWindowEnvironmentSettings) => {
    onModelUpdate((prev) => ({
      ...prev,
      busy: true,
      errorMessage: null,
      environmentSaveStatus: extensionFullWindowEnvironmentSaveStatus.saving,
    }))
    void hostPermissionRequest(environment).then(async (permissionResult) => {
      if (!permissionResult.success) {
        onModelUpdate((prev) => ({
          ...prev,
          busy: false,
          environmentSaveStatus: extensionFullWindowEnvironmentSaveStatus.error,
          errorMessage: permissionResult.errorMessage ?? "Server access permission was not granted.",
        }))
        return
      }
      const res = await sender({ type: "environmentSave", request: environment })
      if (!res.success) {
        onModelUpdate((prev) => ({
          ...prev,
          busy: false,
          environmentSaveStatus: extensionFullWindowEnvironmentSaveStatus.error,
          errorMessage: res.errorMessage ?? "Settings save failed.",
        }))
        return
      }
      await onRefresh()
      onModelUpdate((prev) => ({
        ...prev,
        busy: false,
        environmentSaveStatus: extensionFullWindowEnvironmentSaveStatus.saved,
        errorMessage: null,
      }))
    })
  }

  const lockPolicySave = (policy: ExtensionLockPolicy) => {
    onModelUpdate((prev) => ({
      ...prev,
      busy: true,
      errorMessage: null,
      securitySaveStatus: extensionFullWindowSecuritySaveStatus.saving,
    }))
    void sender({ type: "lockPolicySave", request: policy }).then(async (res) => {
      if (!res.success) {
        onModelUpdate((prev) => ({
          ...prev,
          busy: false,
          securitySaveStatus: extensionFullWindowSecuritySaveStatus.error,
          errorMessage: res.errorMessage ?? "Security settings save failed.",
        }))
        return
      }
      await onRefresh()
      onModelUpdate((prev) => {
        if (prev.status === "error") {
          return {
            ...prev,
            busy: false,
            securitySaveStatus: extensionFullWindowSecuritySaveStatus.error,
            errorMessage: prev.errorMessage ?? "Security settings could not be refreshed.",
          }
        }
        return {
          ...prev,
          busy: false,
          securitySaveStatus: extensionFullWindowSecuritySaveStatus.saved,
          errorMessage: null,
        }
      })
    })
  }

  return {
    loginFill: commonCommands.loginFill,
    fieldCopy: commonCommands.fieldCopy,
    totpCopy: commonCommands.totpCopy,
    loginAdd,
    loginEdit,
    loginRead,
    attachmentUpload,
    attachmentDownload,
    attachmentDelete,
    passwordHistoryRestore,
    secureNotesLoad,
    secureNoteRead,
    secureNoteCreate,
    secureNoteUpdate,
    secureNoteDelete,
    secureNoteCopy,
    cardsLoad,
    cardRead,
    cardCreate,
    cardUpdate,
    cardDelete,
    identitiesLoad,
    identityRead,
    identityCreate,
    identityUpdate,
    identityDelete,
    sshKeysLoad,
    sshKeyRead,
    sshKeyCreate,
    sshKeyUpdate,
    sshKeyDelete,
    cipherFieldCopy,
    resourcesLoad,
    folderCreate,
    folderUpdate,
    folderDelete,
    collectionCreate,
    collectionUpdate,
    collectionDelete,
    cipherMove,
    cipherCollectionsUpdate,
    vaultSync: commonCommands.vaultSync,
    vaultLock: commonCommands.vaultLock,
    vaultLogout: commonCommands.vaultLogout,
    vaultUnlock: commonCommands.vaultUnlock,
    accountLogin,
    environmentSave,
    lockPolicySave,
    ...overrides,
  }
}
