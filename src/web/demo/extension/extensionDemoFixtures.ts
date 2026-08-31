import type { Result } from "#result"
import type { ExtensionLogin } from "../../../extension/ExtensionLogin.js"
import type { ExtensionFullWindowCommands } from "../../../extension/fullwindow/ExtensionFullWindowCommands.js"
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
  accountLogin: actionIgnore,
}

const fullWindowCommands: ExtensionFullWindowCommands = {
  loginFill: actionIgnore,
  fieldCopy: actionIgnore,
  totpCopy: actionIgnore,
  loginAdd: actionIgnore,
  loginEdit: actionIgnore,
  vaultSync: actionIgnore,
  vaultLock: actionIgnore,
  vaultLogout: actionIgnore,
  vaultUnlock: actionIgnore,
  accountLogin: actionIgnore,
  environmentSave: actionIgnore,
  lockPolicySave: actionIgnore,
}

const popupModels = [
  { label: "Ready · copied feedback", model: popupModelCreate({ copiedFieldKey: "password" }) },
  { label: "Loading", model: extensionPopupViewModelCreate({ status: "loading", hostname: "mail.northstar.test" }) },
  {
    label: "Signed out",
    model: extensionPopupViewModelCreate({ status: "loggedOut", hostname: "mail.northstar.test" }),
  },
  { label: "Locked", model: extensionPopupViewModelCreate({ status: "locked", hostname: "mail.northstar.test" }) },
  {
    label: "Error · retry available",
    model: extensionPopupViewModelCreate({
      status: "error",
      hostname: "mail.northstar.test",
      errorMessage: "The vault could not be synchronized.",
    }),
  },
  { label: "Ready · empty and busy", model: popupModelCreate({ logins: [], busy: true, fillAvailable: false }) },
] satisfies { label: string; model: ExtensionPopupViewModel }[]

const fullWindowModels = [
  {
    idPrefix: "full-window-vault-selected-",
    label: "Vault · selected login and copied field",
    model: fullWindowModelCreate({ copiedFieldKey: "password" }),
    initialState: { pane: "vault", selectedLoginId: "demo-mail" },
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
  initialState: { pane: string; selectedLoginId?: string }
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

function passkeyModelSend(model: ExtensionPasskeyConsentUiModel) {
  return async <T = unknown>(_message: ExtensionRuntimeMessage): Promise<Result<T>> => resultCreate(model) as Result<T>
}

async function passkeyErrorSend<T = unknown>(_message: ExtensionRuntimeMessage): Promise<Result<T>> {
  return resultErrorCreate("extensionDemo.passkeyLoad", "This passkey request has expired.")
}

function passkeyLoadingSend<T = unknown>(_message: ExtensionRuntimeMessage): Promise<Result<T>> {
  return new Promise(() => {})
}
