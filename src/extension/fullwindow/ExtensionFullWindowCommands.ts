import type { Result } from "#result"
import type { ExtensionAccountPasswordSetupRequest } from "../auth/extensionAccountPasswordSetupRequestSchema.js"
import type { ExtensionAccountRegisterRequest } from "../auth/extensionAccountRegisterRequestSchema.js"
import type { ExtensionAccountVerificationEmailSendRequest } from "../auth/extensionAccountVerificationEmailSendRequestSchema.js"
import type { ExtensionAccountVerifyRequest } from "../auth/extensionAccountVerifyRequestSchema.js"
import type { ExtensionLoginChallengeSubmitRequest } from "../auth/extensionLoginChallengeSubmitRequestSchema.js"
import type { ExtensionBackgroundCollectionDto } from "../background/extensionBackgroundCollectionDtoSchema.js"
import type { ExtensionBackgroundFolderDto } from "../background/extensionBackgroundFolderDtoSchema.js"
import type { ExtensionCipherAttachment } from "../crypto/extensionCipherAttachmentSchema.js"
import type { ExtensionCipherPasswordHistoryEntry } from "../crypto/extensionCipherPasswordHistoryEntrySchema.js"
import type { ExtensionCipher } from "../crypto/extensionCipherSchema.js"
import type { ExtensionPersonalLoginCipher } from "../crypto/extensionPersonalLoginCipherSchema.js"
import type { ExtensionCopyableField } from "../ExtensionCopyableField.js"
import type { ExtensionLogin } from "../ExtensionLogin.js"
import type { ExtensionAutofillPolicy } from "../storage/extensionAutofillPolicySchema.js"
import type { ExtensionLockPolicy } from "../storage/extensionLockPolicySchema.js"
import type { ExtensionFullWindowEnvironmentSettings } from "./ExtensionFullWindowEnvironmentSettings.js"

/** Every side effect the full-window vault may request; the background owns the implementations. */
export interface ExtensionFullWindowCommands {
  loginFill: (login: ExtensionLogin) => void
  fieldCopy: (login: ExtensionLogin, field: ExtensionCopyableField) => void
  /** Generate and copy the current TOTP code without exposing its seed. */
  totpCopy: (login: ExtensionLogin) => void
  /** Open the normal web create page through a secure session handoff. */
  loginAdd: () => void
  /** Open the normal web edit page through a secure session handoff. */
  loginEdit: (login: ExtensionLogin) => void
  loginRead: (cipherId: string) => void
  attachmentUpload: (cipher: ExtensionCipher, file: File) => void
  attachmentDownload: (cipher: ExtensionCipher, attachment: ExtensionCipherAttachment) => void
  attachmentDelete: (cipher: ExtensionCipher, attachment: ExtensionCipherAttachment) => void
  passwordHistoryRestore: (cipher: ExtensionPersonalLoginCipher, entry: ExtensionCipherPasswordHistoryEntry) => void
  secureNotesLoad: () => void
  secureNoteRead: (cipherId: string) => void
  secureNoteCreate: (cipher: ExtensionCipher) => void
  secureNoteUpdate: (cipherId: string, cipher: ExtensionCipher) => void
  secureNoteDelete: (cipherId: string) => void
  secureNoteCopy: (note: string) => void
  cardsLoad: () => void
  cardRead: (cipherId: string) => void
  cardCreate: (cipher: ExtensionCipher) => void
  cardUpdate: (cipherId: string, cipher: ExtensionCipher) => void
  cardDelete: (cipherId: string) => void
  cipherFill?: (cipherId: string, cipherType: 3 | 4) => void
  identitiesLoad: () => void
  identityRead: (cipherId: string) => void
  identityCreate: (cipher: ExtensionCipher) => void
  identityUpdate: (cipherId: string, cipher: ExtensionCipher) => void
  identityDelete: (cipherId: string) => void
  sshKeysLoad: () => void
  sshKeyRead: (cipherId: string) => void
  sshKeyCreate: (cipher: ExtensionCipher) => void
  sshKeyUpdate: (cipherId: string, cipher: ExtensionCipher) => void
  sshKeyDelete: (cipherId: string) => void
  cipherFieldCopy: (key: string, value: string) => void
  resourcesLoad: () => void
  folderCreate: (folder: ExtensionBackgroundFolderDto) => void
  folderUpdate: (folder: ExtensionBackgroundFolderDto) => void
  folderDelete: (folderId: string) => void
  collectionCreate: (collection: ExtensionBackgroundCollectionDto) => void
  collectionUpdate: (collection: ExtensionBackgroundCollectionDto) => void
  collectionDelete: (collection: ExtensionBackgroundCollectionDto) => void
  cipherMove: (cipherId: string, folderId: string | null) => void
  cipherCollectionsUpdate: (cipherId: string, collectionIds: string[]) => void
  vaultSync: () => void
  vaultLock: () => void
  vaultLogout: () => void
  vaultUnlock: (masterPassword: string) => void
  accountLogin: (
    credentials?: { email: string; password: string },
    environment?: ExtensionFullWindowEnvironmentSettings,
  ) => void
  loginChallengeSubmit: (request: ExtensionLoginChallengeSubmitRequest) => void
  loginChallengeEmailSend: (challengeId: string) => void
  loginChallengeCancel: (challengeId: string) => void
  accountRegister: (
    request: ExtensionAccountRegisterRequest,
    environment: ExtensionFullWindowEnvironmentSettings,
  ) => Promise<Result<void>>
  accountVerificationEmailSend: (
    request: ExtensionAccountVerificationEmailSendRequest,
    environment: ExtensionFullWindowEnvironmentSettings,
  ) => Promise<Result<{ token?: string; userId?: string }>>
  accountVerify: (
    request: ExtensionAccountVerifyRequest,
    environment: ExtensionFullWindowEnvironmentSettings,
  ) => Promise<Result<void>>
  accountPasswordSetup: (
    request: ExtensionAccountPasswordSetupRequest,
    environment: ExtensionFullWindowEnvironmentSettings,
  ) => Promise<Result<void>>
  environmentSave: (environment: ExtensionFullWindowEnvironmentSettings) => void
  lockPolicySave: (policy: ExtensionLockPolicy) => void
  autofillPolicySave?: (policy: ExtensionAutofillPolicy) => void
}
