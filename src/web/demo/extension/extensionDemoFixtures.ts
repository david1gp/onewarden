import type { Result } from "#result"
import type { ExtensionLogin } from "../../../extension/ExtensionLogin.js"
import type { ExtensionCipher } from "../../../extension/crypto/extensionCipherSchema.js"
import type { ExtensionFullWindowCommands } from "../../../extension/fullwindow/ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowInitialState } from "../../../extension/fullwindow/ExtensionFullWindowInitialState.js"
import type { ExtensionFullWindowViewModel } from "../../../extension/fullwindow/ExtensionFullWindowViewModel.js"
import { extensionFullWindowEnvironmentSettingsCreate } from "../../../extension/fullwindow/extensionFullWindowEnvironmentSettingsCreate.js"
import { extensionFullWindowViewModelCreate } from "../../../extension/fullwindow/extensionFullWindowViewModelCreate.js"
import type { ExtensionRuntimeMessage } from "../../../extension/messaging/extensionRuntimeMessageSchema.js"
import type { ExtensionPasskeyConsentUiModel } from "../../../extension/passkey/extensionPasskeyConsentUiModelSchema.js"
import type { ExtensionPopupCommands } from "../../../extension/popup/ExtensionPopupCommands.js"
import type { ExtensionPopupViewModel } from "../../../extension/popup/ExtensionPopupViewModel.js"
import { extensionPopupViewModelCreate } from "../../../extension/popup/extensionPopupViewModelCreate.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

const fixtureLogins: ExtensionLogin[] = [
  {
    id: "demo-mail",
    name: "Northstar Mail",
    username: "ada@northstar.test",
    uri: "https://mail.northstar.test/login",
    totpAvailable: true,
    copyableFields: [
      { key: "username", label: "Username", value: "ada@northstar.test" },
      { key: "password", label: "Password", value: "demo-password", sensitive: true },
      { key: "uri", label: "Website", value: "https://mail.northstar.test/login" },
      { key: "custom:0", label: "Account number", value: "NS-2048" },
      { key: "custom:1", label: "Recovery phrase", value: "northstar-demo-recovery", sensitive: true },
    ],
  },
  {
    id: "demo-admin",
    name: "Northstar Admin",
    username: "ada.admin@northstar.test",
    uri: "https://admin.northstar.test",
    copyableFields: [
      { key: "username", label: "Username", value: "ada.admin@northstar.test" },
      { key: "password", label: "Password", value: "another-demo-password", sensitive: true },
    ],
  },
]

const fixtureRevisionDate = "2026-09-01T00:00:00.000Z"

const fixtureLoginCipher = {
  object: "cipherDetails",
  id: "demo-mail",
  type: 1,
  creationDate: fixtureRevisionDate,
  revisionDate: fixtureRevisionDate,
  deletedDate: null,
  organizationId: null,
  folderId: null,
  name: "Northstar Mail",
  notes: "Primary account used for deterministic extension previews.",
  favorite: true,
  edit: true,
  viewPassword: true,
  fields: [
    { name: "Account number", value: "NS-2048", type: 0, linkedId: null },
    { name: "Recovery phrase", value: "northstar-demo-recovery", type: 1, linkedId: null },
  ],
  attachments: [
    { id: "demo-attachment", fileName: "recovery-codes.txt", size: "2048", sizeName: "2 KB", object: "attachment" },
  ],
  passwordHistory: [{ password: "Northstar!Previous-2025", lastUsedDate: "2026-08-15T10:30:00.000Z" }],
  login: {
    username: "ada@northstar.test",
    password: "demo-password",
    uris: [{ uri: "https://mail.northstar.test/login", match: null }],
    totp: null,
  },
} satisfies Extract<ExtensionCipher, { type: 1 }>

const fixtureSecureNote = {
  ...cipherDetailCommonCreate("demo-note", 2, "Recovery plan"),
  type: 2,
  notes: "Store the offline recovery kit in the secure archive.",
  secureNote: { type: 0 },
} satisfies Extract<ExtensionCipher, { type: 2 }>

const fixtureCard = {
  ...cipherDetailCommonCreate("demo-card", 3, "Northstar travel card"),
  type: 3,
  notes: "Travel expenses only.",
  card: {
    cardholderName: "Ada Lovelace",
    brand: "Visa",
    number: "4111111111111111",
    expMonth: "09",
    expYear: "2030",
    code: "123",
  },
} satisfies Extract<ExtensionCipher, { type: 3 }>

const fixtureIdentity = {
  ...cipherDetailCommonCreate("demo-identity", 4, "Ada Lovelace"),
  type: 4,
  notes: null,
  identity: {
    firstName: "Ada",
    lastName: "Lovelace",
    company: "Northstar",
    email: "ada@northstar.test",
    passportNumber: "NORTHSTAR-2048",
  },
} satisfies Extract<ExtensionCipher, { type: 4 }>

const fixtureSshKey = {
  ...cipherDetailCommonCreate("demo-ssh", 5, "Production deploy key"),
  type: 5,
  notes: "Restricted production key.",
  sshKey: {
    privateKey: "-----BEGIN OPENSSH PRIVATE KEY-----\ndemo\n-----END OPENSSH PRIVATE KEY-----",
    publicKey: "ssh-ed25519 AAAADEMO northstar",
    keyFingerprint: "SHA256:northstar-demo",
  },
} satisfies Extract<ExtensionCipher, { type: 5 }>

const popupCommands: ExtensionPopupCommands = {
  loginFill: actionIgnore,
  fieldCopy: actionIgnore,
  totpCopy: actionIgnore,
  loginAdd: actionIgnore,
  vaultSync: actionIgnore,
  vaultLock: actionIgnore,
  vaultLogout: actionIgnore,
  fullVaultOpen: actionIgnore,
  generatorOpen: actionIgnore,
  settingsOpen: actionIgnore,
  vaultUnlock: actionIgnore,
  biometricUnlock: actionIgnore,
  accountLogin: actionIgnore,
  accountRegister: actionIgnore,
}

const fullWindowCommands: ExtensionFullWindowCommands = {
  loginFill: actionIgnore,
  fieldCopy: actionIgnore,
  totpCopy: actionIgnore,
  loginAdd: actionIgnore,
  loginEdit: actionIgnore,
  loginRead: actionIgnore,
  attachmentUpload: actionIgnore,
  attachmentDownload: actionIgnore,
  attachmentDelete: actionIgnore,
  passwordHistoryRestore: actionIgnore,
  secureNotesLoad: actionIgnore,
  secureNoteRead: actionIgnore,
  secureNoteCreate: actionIgnore,
  secureNoteUpdate: actionIgnore,
  secureNoteDelete: actionIgnore,
  secureNoteCopy: actionIgnore,
  cardsLoad: actionIgnore,
  cardRead: actionIgnore,
  cardCreate: actionIgnore,
  cardUpdate: actionIgnore,
  cardDelete: actionIgnore,
  identitiesLoad: actionIgnore,
  identityRead: actionIgnore,
  identityCreate: actionIgnore,
  identityUpdate: actionIgnore,
  identityDelete: actionIgnore,
  sshKeysLoad: actionIgnore,
  sshKeyRead: actionIgnore,
  sshKeyCreate: actionIgnore,
  sshKeyUpdate: actionIgnore,
  sshKeyDelete: actionIgnore,
  cipherFieldCopy: actionIgnore,
  resourcesLoad: actionIgnore,
  folderCreate: actionIgnore,
  folderUpdate: actionIgnore,
  folderDelete: actionIgnore,
  collectionCreate: actionIgnore,
  collectionUpdate: actionIgnore,
  collectionDelete: actionIgnore,
  cipherMove: actionIgnore,
  cipherCollectionsUpdate: actionIgnore,
  vaultSync: actionIgnore,
  vaultLock: actionIgnore,
  vaultLogout: actionIgnore,
  vaultUnlock: actionIgnore,
  biometricUnlock: actionIgnore,
  biometricEnroll: actionIgnore,
  biometricRevoke: actionIgnore,
  accountLogin: actionIgnore,
  loginChallengeSubmit: actionIgnore,
  loginChallengeEmailSend: actionIgnore,
  loginChallengeCancel: actionIgnore,
  accountRegister: () => Promise.resolve(resultCreate(undefined)),
  accountVerificationEmailSend: () => Promise.resolve(resultCreate({})),
  accountVerify: () => Promise.resolve(resultCreate(undefined)),
  accountPasswordSetup: () => Promise.resolve(resultCreate(undefined)),
  environmentSave: actionIgnore,
  lockPolicySave: actionIgnore,
}

const popupModels = [
  {
    idPrefix: "popup-ready-",
    label: "Ready · copied feedback",
    model: popupModelCreate({ copiedFieldKey: "password" }),
  },
  {
    idPrefix: "popup-loading-",
    label: "Loading",
    model: extensionPopupViewModelCreate({ status: "loading", hostname: "mail.northstar.test" }),
  },
  {
    idPrefix: "popup-signed-out-",
    label: "Signed out",
    model: extensionPopupViewModelCreate({ status: "loggedOut", hostname: "mail.northstar.test" }),
  },
  {
    idPrefix: "popup-locked-",
    label: "Locked",
    model: extensionPopupViewModelCreate({ status: "locked", hostname: "mail.northstar.test" }),
  },
  {
    idPrefix: "popup-error-",
    label: "Error · retry available",
    model: extensionPopupViewModelCreate({
      status: "error",
      hostname: "mail.northstar.test",
      errorMessage: "The vault could not be synchronized.",
    }),
  },
  {
    idPrefix: "popup-empty-",
    label: "Ready · empty and busy",
    model: popupModelCreate({ logins: [], busy: true, fillAvailable: false }),
  },
] satisfies { idPrefix: string; label: string; model: ExtensionPopupViewModel }[]

const fullWindowModels = [
  {
    idPrefix: "full-window-vault-selected-",
    label: "Vault · cipher extras and custom fields",
    model: fullWindowModelCreate({ copiedFieldKey: "password", selectedLoginCipher: fixtureLoginCipher }),
    initialState: { pane: "vault", selectedLoginId: "demo-mail" },
  },
  {
    idPrefix: "full-window-attachment-delete-",
    label: "Vault · attachment delete confirmation",
    model: fullWindowModelCreate({ selectedLoginCipher: fixtureLoginCipher }),
    initialState: {
      pane: "vault",
      selectedLoginId: "demo-mail",
      deleteAttachmentId: "demo-attachment",
    },
  },
  {
    idPrefix: "full-window-password-restore-",
    label: "Vault · password restore confirmation",
    model: fullWindowModelCreate({ selectedLoginCipher: fixtureLoginCipher }),
    initialState: {
      pane: "vault",
      selectedLoginId: "demo-mail",
      restorePasswordHistoryIndex: 0,
    },
  },
  {
    idPrefix: "full-window-auth-",
    label: "Authentication · account registration",
    model: extensionFullWindowViewModelCreate({ status: "loggedOut", hostname: "mail.northstar.test" }),
    initialState: { pane: "auth" },
  },
  {
    idPrefix: "full-window-challenge-",
    label: "Authentication · two-step challenge",
    model: extensionFullWindowViewModelCreate({
      status: "loggedOut",
      hostname: "mail.northstar.test",
      authChallenge: {
        challengeId: "demo-challenge",
        providers: [0, 1, 7, 8],
        emailHint: "a••@northstar.test",
        webAuthn: null,
        errorMessage: null,
      },
      authMessage: "Enter the current code to continue.",
    }),
    initialState: { pane: "vault" },
  },
  {
    idPrefix: "full-window-notes-",
    label: "Vault pane · secure note delete confirmation",
    model: fullWindowModelCreate({
      secureNotes: [cipherSummaryCreate("demo-note", 2, "Recovery plan")],
      selectedSecureNote: fixtureSecureNote,
    }),
    initialState: {
      pane: "vault",
      category: "notes",
      selectedCipherId: "demo-note",
      deleteCipherConfirmation: true,
    },
  },
  {
    idPrefix: "full-window-cards-",
    label: "Vault pane · card delete confirmation",
    model: fullWindowModelCreate({
      cards: [cipherSummaryCreate("demo-card", 3, "Northstar travel card")],
      selectedCard: fixtureCard,
    }),
    initialState: {
      pane: "vault",
      category: "cards",
      selectedCipherId: "demo-card",
      deleteCipherConfirmation: true,
    },
  },
  {
    idPrefix: "full-window-identities-",
    label: "Vault pane · identity delete confirmation",
    model: fullWindowModelCreate({
      identities: [cipherSummaryCreate("demo-identity", 4, "Ada Lovelace")],
      selectedIdentity: fixtureIdentity,
    }),
    initialState: {
      pane: "vault",
      category: "identities",
      selectedCipherId: "demo-identity",
      deleteCipherConfirmation: true,
    },
  },
  {
    idPrefix: "full-window-ssh-keys-",
    label: "Vault pane · SSH key delete confirmation",
    model: fullWindowModelCreate({
      sshKeys: [cipherSummaryCreate("demo-ssh", 5, "Production deploy key")],
      selectedSshKey: fixtureSshKey,
    }),
    initialState: {
      pane: "vault",
      category: "ssh-keys",
      selectedCipherId: "demo-ssh",
      deleteCipherConfirmation: true,
    },
  },
  {
    idPrefix: "full-window-folder-delete-",
    label: "Vault resources · folder delete confirmation",
    model: fullWindowModelCreate({ folders: [{ id: "demo-folder", name: "Archive", object: "folder" }] }),
    initialState: { pane: "vault", folderId: "demo-folder", resourceAction: "folder-delete" },
  },
  {
    idPrefix: "full-window-collection-delete-",
    label: "Vault resources · collection delete confirmation",
    model: fullWindowModelCreate({
      profile: {
        organizations: [{ id: "demo-organization", name: "Northstar", status: 2, accessAll: true }],
      },
      collections: [
        {
          id: "demo-collection",
          organizationId: "demo-organization",
          name: "Operations",
          object: "collection",
          assigned: true,
          manage: true,
        },
      ],
    }),
    initialState: {
      pane: "vault",
      organizationId: "demo-organization",
      collectionId: "demo-collection",
      resourceAction: "collection-delete",
    },
  },
  {
    idPrefix: "full-window-generator-",
    label: "Generator · deterministic local fixture",
    model: fullWindowModelCreate(),
    initialState: { pane: "generator" },
  },
  {
    idPrefix: "full-window-settings-saved-",
    label: "Settings · self-hosted, saved and Never warning",
    model: fullWindowModelCreate({
      environment: extensionFullWindowEnvironmentSettingsCreate({
        region: "selfHosted",
        base: "https://vault.northstar.test",
        identity: "https://identity.northstar.test",
      }),
      environmentSaveStatus: "saved",
      lockPolicy: { timeoutMinutes: null, action: "lock" },
      securitySaveStatus: "saved",
    }),
    initialState: { pane: "settings" },
  },
  {
    idPrefix: "full-window-settings-loading-",
    label: "Settings · loading security and disabled controls",
    model: extensionFullWindowViewModelCreate({ status: "loading", busy: true }),
    initialState: { pane: "settings" },
  },
  {
    idPrefix: "full-window-settings-errors-",
    label: "Settings · save errors",
    model: fullWindowModelCreate({
      errorMessage: "Settings could not be stored on this device.",
      environmentSaveStatus: "error",
      securitySaveStatus: "error",
    }),
    initialState: { pane: "settings" },
  },
  {
    idPrefix: "full-window-vault-loading-",
    label: "Vault · loading",
    model: extensionFullWindowViewModelCreate({ status: "loading", hostname: "mail.northstar.test" }),
    initialState: { pane: "vault" },
  },
  {
    idPrefix: "full-window-vault-signed-out-",
    label: "Vault · signed out",
    model: extensionFullWindowViewModelCreate({ status: "loggedOut", hostname: "mail.northstar.test" }),
    initialState: { pane: "vault" },
  },
  {
    idPrefix: "full-window-vault-locked-",
    label: "Vault · locked",
    model: extensionFullWindowViewModelCreate({ status: "locked", hostname: "mail.northstar.test" }),
    initialState: { pane: "vault" },
  },
  {
    idPrefix: "full-window-vault-error-",
    label: "Vault · error",
    model: extensionFullWindowViewModelCreate({
      status: "error",
      hostname: "mail.northstar.test",
      errorMessage: "The encrypted vault is temporarily unavailable.",
    }),
    initialState: { pane: "vault" },
  },
] satisfies {
  idPrefix: string
  label: string
  model: ExtensionFullWindowViewModel
  initialState: ExtensionFullWindowInitialState
}[]

const passkeyModels = {
  verification: passkeyModelCreate({ verificationRequired: true, verified: false }),
  locked: passkeyModelCreate({ operation: "get", verificationRequired: false, locked: true }),
  candidates: passkeyModelCreate({ operation: "get" }),
  empty: passkeyModelCreate({ operation: "get", candidates: [] }),
}

export const extensionDemoFixtures = {
  popupCommands,
  popupModels,
  fullWindowCommands,
  fullWindowModels,
  generatorOptions: {
    initialPassword: "Northstar!Demo-2026",
    initialPasswordVisible: true,
    initialCopyStatus: "copied",
    passwordGenerate: () => resultCreate("Northstar!Demo-2026"),
    clipboardWrite: async () => {},
  },
  passkey: [
    {
      label: "Loading request",
      options: { requestId: "demo-loading", messageSend: passkeyLoadingSend, close: actionIgnore },
    },
    { label: "Load error", options: { requestId: "demo-error", messageSend: passkeyErrorSend, close: actionIgnore } },
    {
      label: "Fresh verification required",
      options: {
        requestId: "demo-verification",
        messageSend: passkeyModelSend(passkeyModels.verification),
        close: actionIgnore,
      },
    },
    {
      label: "Locked vault",
      options: { requestId: "demo-locked", messageSend: passkeyModelSend(passkeyModels.locked), close: actionIgnore },
    },
    {
      label: "Candidate selection · personal and read-only organization",
      options: {
        requestId: "demo-candidates",
        messageSend: passkeyModelSend(passkeyModels.candidates),
        close: actionIgnore,
      },
    },
    {
      label: "No matching candidate",
      options: { requestId: "demo-empty", messageSend: passkeyModelSend(passkeyModels.empty), close: actionIgnore },
    },
  ],
} as const

function actionIgnore(): void {}

function popupModelCreate(overrides: Partial<ExtensionPopupViewModel> = {}): ExtensionPopupViewModel {
  return extensionPopupViewModelCreate({
    status: "ready",
    hostname: "mail.northstar.test",
    logins: fixtureLogins,
    fillAvailable: true,
    ...overrides,
  })
}

function fullWindowModelCreate(overrides: Partial<ExtensionFullWindowViewModel> = {}): ExtensionFullWindowViewModel {
  return extensionFullWindowViewModelCreate({
    status: "ready",
    hostname: "mail.northstar.test",
    logins: fixtureLogins,
    fillAvailable: true,
    lockPolicy: { timeoutMinutes: 15, action: "lock" },
    ...overrides,
  })
}

function passkeyModelCreate(overrides: Partial<ExtensionPasskeyConsentUiModel> = {}): ExtensionPasskeyConsentUiModel {
  return {
    requestId: "demo-passkey-request",
    operation: "create",
    rpId: "northstar.test",
    rpName: "Northstar",
    userName: "ada@northstar.test",
    verificationRequired: false,
    verified: true,
    locked: false,
    expiresAt: 1_788_134_400_000,
    candidates: [
      {
        cipherId: "demo-mail",
        credentialId: "demo-credential",
        revisionDate: "2026-08-31T00:00:00.000Z",
        name: "Northstar Mail",
        userName: "ada@northstar.test",
        organization: false,
        readOnly: false,
      },
      {
        cipherId: "demo-organization",
        credentialId: "demo-organization-credential",
        revisionDate: "2026-08-30T00:00:00.000Z",
        name: "Northstar Operations",
        userName: "ops@northstar.test",
        organization: true,
        readOnly: true,
      },
    ],
    ...overrides,
  }
}

function cipherSummaryCreate(id: string, type: 2 | 3 | 4 | 5, name: string) {
  return {
    object: "cipherMini" as const,
    id,
    type,
    revisionDate: "2026-09-01T00:00:00.000Z",
    deletedDate: null,
    name,
  }
}

function cipherDetailCommonCreate(id: string, type: 2 | 3 | 4 | 5, name: string) {
  return {
    object: "cipherDetails" as const,
    id,
    type,
    creationDate: fixtureRevisionDate,
    revisionDate: fixtureRevisionDate,
    deletedDate: null,
    organizationId: null,
    folderId: null,
    name,
    notes: null,
    favorite: false,
    edit: true,
    permissions: { delete: true },
    fields: [],
  }
}

function passkeyModelSend(model: ExtensionPasskeyConsentUiModel) {
  return async <T = unknown>(_message: ExtensionRuntimeMessage): Promise<Result<T>> => resultCreate(model) as Result<T>
}

async function passkeyErrorSend<T = unknown>(_message: ExtensionRuntimeMessage): Promise<Result<T>> {
  return resultErrorCreate("extensionDemo.passkeyLoad", "This passkey request has expired.")
}

function passkeyLoadingSend<T = unknown>(_message: ExtensionRuntimeMessage): Promise<Result<T>> {
  return new Promise(() => {})
}
