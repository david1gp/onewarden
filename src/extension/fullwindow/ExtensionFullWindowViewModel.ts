import type { ExtensionBackgroundCipherSummary } from "../background/extensionBackgroundCipherSummarySchema.js"
import type { ExtensionBackgroundCollectionDto } from "../background/extensionBackgroundCollectionDtoSchema.js"
import type { ExtensionBackgroundFolderDto } from "../background/extensionBackgroundFolderDtoSchema.js"
import type { ExtensionCipherDetailReadResult } from "../background/extensionCipherDetailReadResultSchema.js"
import type { ExtensionPersonalLoginCipher } from "../crypto/extensionPersonalLoginCipherSchema.js"
import type { ExtensionProfile } from "../crypto/extensionProfileSchema.js"
import type { ExtensionLogin } from "../ExtensionLogin.js"
import type { ExtensionLockPolicy } from "../storage/extensionLockPolicySchema.js"
import type { ExtensionFullWindowEnvironmentSaveStatus } from "./ExtensionFullWindowEnvironmentSaveStatus.js"
import type { ExtensionFullWindowEnvironmentSettings } from "./ExtensionFullWindowEnvironmentSettings.js"
import type { ExtensionFullWindowSecuritySaveStatus } from "./ExtensionFullWindowSecuritySaveStatus.js"
import type { ExtensionFullWindowStatus } from "./ExtensionFullWindowStatus.js"

/** Read-only rendering model of the full-window vault; the view never touches browser APIs. */
export interface ExtensionFullWindowViewModel {
  status: ExtensionFullWindowStatus
  /** Hostname of the active tab, or null when no fillable tab exists. */
  hostname: string | null
  logins: ExtensionLogin[]
  selectedLoginCipher: ExtensionPersonalLoginCipher | null
  loginDetailLoading: boolean
  folders: ExtensionBackgroundFolderDto[]
  collections: ExtensionBackgroundCollectionDto[]
  profile: ExtensionProfile | null
  resourcesLoading: boolean
  secureNotes: ExtensionBackgroundCipherSummary[]
  selectedSecureNote: ExtensionCipherDetailReadResult | null
  secureNotesLoading: boolean
  secureNoteDetailLoading: boolean
  cards: ExtensionBackgroundCipherSummary[]
  selectedCard: ExtensionCipherDetailReadResult | null
  cardsLoading: boolean
  cardDetailLoading: boolean
  identities: ExtensionBackgroundCipherSummary[]
  selectedIdentity: ExtensionCipherDetailReadResult | null
  identitiesLoading: boolean
  identityDetailLoading: boolean
  sshKeys: ExtensionBackgroundCipherSummary[]
  selectedSshKey: ExtensionCipherDetailReadResult | null
  sshKeysLoading: boolean
  sshKeyDetailLoading: boolean
  errorMessage: string | null
  busy: boolean
  copiedFieldKey: string | null
  attachmentOperationId: string | null
  attachmentProgress: number | null
  /** True when an active tab can receive an explicit fill. */
  fillAvailable: boolean
  environment: ExtensionFullWindowEnvironmentSettings
  /** Lifecycle of the environment settings submission. */
  environmentSaveStatus: ExtensionFullWindowEnvironmentSaveStatus
  /** Persisted inactivity timeout policy, or null when no policy has been saved. */
  lockPolicy: ExtensionLockPolicy | null
  /** Lifecycle of the security settings submission. */
  securitySaveStatus: ExtensionFullWindowSecuritySaveStatus
}
