import { extensionFullWindowEnvironmentSaveStatus } from "./ExtensionFullWindowEnvironmentSaveStatus.js"
import { extensionFullWindowSecuritySaveStatus } from "./ExtensionFullWindowSecuritySaveStatus.js"
import { extensionFullWindowStatus } from "./ExtensionFullWindowStatus.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionFullWindowEnvironmentSettingsCreate } from "./extensionFullWindowEnvironmentSettingsCreate.js"

/** Initial full-window read model used before background messaging is wired up. */
export function extensionFullWindowViewModelCreate(
  overrides: Partial<ExtensionFullWindowViewModel> = {},
): ExtensionFullWindowViewModel {
  return {
    status: extensionFullWindowStatus.loading,
    hostname: null,
    logins: [],
    selectedLoginCipher: null,
    loginDetailLoading: false,
    folders: [],
    collections: [],
    profile: null,
    resourcesLoading: false,
    secureNotes: [],
    selectedSecureNote: null,
    secureNotesLoading: false,
    secureNoteDetailLoading: false,
    cards: [],
    selectedCard: null,
    cardsLoading: false,
    cardDetailLoading: false,
    identities: [],
    selectedIdentity: null,
    identitiesLoading: false,
    identityDetailLoading: false,
    sshKeys: [],
    selectedSshKey: null,
    sshKeysLoading: false,
    sshKeyDetailLoading: false,
    errorMessage: null,
    authChallenge: null,
    authMessage: null,
    busy: false,
    copiedFieldKey: null,
    attachmentOperationId: null,
    attachmentProgress: null,
    fillAvailable: false,
    environment: extensionFullWindowEnvironmentSettingsCreate(),
    environmentSaveStatus: extensionFullWindowEnvironmentSaveStatus.idle,
    lockPolicy: null,
    securitySaveStatus: extensionFullWindowSecuritySaveStatus.idle,
    autofillPolicy: null,
    autofillSaveStatus: extensionFullWindowSecuritySaveStatus.idle,
    ...overrides,
  }
}
