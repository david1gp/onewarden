import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminConfirmation } from "../admin/adminConfirmationSchema.js"
import type { AdminDiagnostics } from "../admin/adminDiagnosticsSchema.js"
import { adminDiagnosticsSupportInformationCreate } from "../admin/adminDiagnosticsSupportInformationCreate.js"
import type { AdminDialog } from "../admin/adminDialogSchema.js"
import type { AdminFeedback } from "../admin/adminFeedbackSchema.js"
import type { AdminOrganization } from "../admin/adminOrganizationSchema.js"
import type { AdminSearch } from "../admin/adminSearchSchema.js"
import type { AdminSection } from "../admin/adminSectionSchema.js"
import type {
  AdminReadOnlySettings,
  AdminSettings,
  AdminSettingsBooleanKey,
  AdminSettingsNumberKey,
  AdminSettingsOverride,
  AdminSettingsTextKey,
} from "../admin/adminSettingsSchema.js"
import type { AdminUserOrganizationRole } from "../admin/adminUserOrganizationRoleSchema.js"
import type { AdminUser } from "../admin/adminUserSchema.js"
import { adminCollectionsStateCreate } from "./adminCollectionsStateCreate.js"
import { adminDiagnosticsDemoData } from "./adminDiagnosticsDemoData.js"
import { adminOrganizationsDemoData } from "./adminOrganizationsDemoData.js"
import { adminSettingsDemoData } from "./adminSettingsDemoData.js"
import { adminUsersDemoData } from "./adminUsersDemoData.js"

type AdminDemoStateProps = {
  settings?: AdminSettings
  users?: readonly AdminUser[]
  organizations?: readonly AdminOrganization[]
  diagnostics?: AdminDiagnostics
  clipboard?: Pick<Clipboard, "writeText">
}

const adminBooleanSettingKeys: readonly AdminSettingsBooleanKey[] = [
  "webVaultEnabled",
  "sendsAllowed",
  "signupsAllowed",
  "signupsVerify",
  "invitationsAllowed",
  "emergencyAccessAllowed",
  "emailChangeAllowed",
  "passwordHintsAllowed",
  "showPasswordHint",
  "twoFactorEnabled",
  "adminTokenDisabled",
  "disableIconDownload",
  "disable2faRemember",
  "requireDeviceEmail",
  "reloadTemplates",
  "increaseNoteSizeLimit",
  "ssoEnabled",
  "ssoOnly",
  "ssoSignupsMatchEmail",
  "ssoAllowUnknownEmailVerification",
  "ssoPkce",
  "ssoDebugTokens",
  "mailEnabled",
  "useSendmail",
  "smtpEmbedImages",
  "smtpAcceptInvalidCerts",
  "smtpAcceptInvalidHostnames",
  "email2faEnforceOnInvite",
  "email2faAutoFallback",
  "yubicoEnabled",
  "duoEnabled",
]

const adminTextSettingKeys: readonly AdminSettingsTextKey[] = [
  "domain",
  "invitationOrgName",
  "signupsDomainsWhitelist",
  "orgCreationUsers",
  "adminToken",
  "ipHeader",
  "ipHeaderTrustedProxies",
  "iconService",
  "httpRequestBlockRegex",
  "allowedIframeAncestors",
  "allowedConnectSrc",
  "logTimestampFormat",
  "logLevel",
  "ssoClientId",
  "ssoClientSecret",
  "ssoAuthority",
  "ssoScopes",
  "ssoAuthorizeExtraParams",
  "ssoAudienceTrusted",
  "smtpHost",
  "smtpFrom",
  "smtpFromName",
  "smtpUsername",
  "smtpPassword",
  "smtpAuthMechanism",
  "heloName",
  "yubicoClientId",
  "yubicoSecretKey",
  "yubicoServer",
  "duoIkey",
  "duoSkey",
  "duoHost",
]

const adminNumberSettingKeys: readonly AdminSettingsNumberKey[] = [
  "userAttachmentLimit",
  "orgAttachmentLimit",
  "userSendLimit",
  "trashAutoDeleteDays",
  "incomplete2faTimeLimit",
  "signupsVerifyResendTime",
  "signupsVerifyResendLimit",
  "invitationExpirationHours",
  "passwordIterations",
  "iconRedirectCode",
  "iconCacheTtl",
  "iconCacheNegttl",
  "iconDownloadTimeout",
  "loginRatelimitSeconds",
  "loginRatelimitMaxBurst",
  "adminSessionLifetime",
  "smtpTimeout",
  "emailTokenSize",
  "emailExpirationTime",
  "emailAttemptsLimit",
]

const ssoDependentKeys: readonly AdminSettingsOverride[] = [
  "ssoOnly",
  "ssoSignupsMatchEmail",
  "ssoAllowUnknownEmailVerification",
  "ssoClientId",
  "ssoClientSecret",
  "ssoAuthority",
  "ssoScopes",
  "ssoAuthorizeExtraParams",
  "ssoAudienceTrusted",
  "ssoPkce",
  "ssoDebugTokens",
]
const smtpDependentKeys: readonly AdminSettingsOverride[] = [
  "useSendmail",
  "smtpHost",
  "smtpFrom",
  "smtpFromName",
  "smtpUsername",
  "smtpPassword",
  "smtpAuthMechanism",
  "smtpTimeout",
  "heloName",
  "smtpEmbedImages",
  "smtpAcceptInvalidCerts",
  "smtpAcceptInvalidHostnames",
]
const email2faDependentKeys: readonly AdminSettingsOverride[] = [
  "emailTokenSize",
  "emailExpirationTime",
  "emailAttemptsLimit",
  "email2faEnforceOnInvite",
  "email2faAutoFallback",
]
const yubicoDependentKeys: readonly AdminSettingsOverride[] = ["yubicoClientId", "yubicoSecretKey", "yubicoServer"]
const duoDependentKeys: readonly AdminSettingsOverride[] = ["duoIkey", "duoSkey", "duoHost"]

const organizationRoleOptions: string[] = ["user", "manager", "admin", "owner"]
const organizationRoleLabels: Record<AdminUserOrganizationRole, string> = {
  user: "User",
  manager: "Manager",
  admin: "Admin",
  owner: "Owner",
}
const dateTimeFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" })

function demoTimestampCreate() {
  return new Date().toISOString()
}

function adminDateTimeFormat(value: string | null | undefined) {
  if (!value) return "Never"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return dateTimeFormatter.format(date)
}

function adminAttachmentSizeFormat(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

function adminDomainParts(domain: string) {
  const protocolEnd = domain.indexOf("://")
  if (protocolEnd < 0) return { origin: "", path: "" }
  const pathStart = domain.indexOf("/", protocolEnd + 3)
  if (pathStart < 0) return { origin: domain.replace(/\/+$/, ""), path: "" }
  return {
    origin: domain.slice(0, pathStart).replace(/\/+$/, ""),
    path: domain.slice(pathStart).replace(/\/+$/, ""),
  }
}

function adminIconServiceUrl(iconService: string) {
  if (iconService === "internal") return ""
  if (iconService === "bitwarden") return "https://icons.bitwarden.net/{}/icon.png"
  if (iconService === "duckduckgo") return "https://icons.duckduckgo.com/ip3/{}.ico"
  if (iconService === "google") return "https://www.google.com/s2/favicons?domain={}&sz=32"
  return iconService
}

function adminSettingsReadOnlyDerive(settings: AdminSettings): AdminSettings {
  const domainParts = adminDomainParts(settings.domain)
  const domainBase = settings.domain.replace(/\/+$/, "")
  const smtpPort =
    settings.readOnly.smtpSecurity === "force_tls" ? 465 : settings.readOnly.smtpSecurity === "off" ? 25 : 587
  const readOnly: AdminReadOnlySettings = {
    ...settings.readOnly,
    domainOrigin: domainParts.origin,
    domainPath: domainParts.path,
    iconServiceUrl: adminIconServiceUrl(settings.iconService),
    ssoCallbackPath: domainBase.length > 0 ? `${domainBase}/identity/connect/oidc-signin` : "",
    smtpPort,
    smtpImageSource: settings.smtpEmbedImages ? "cid:" : `${domainBase}/vw_static/`,
    email2faEnabled: settings.mailEnabled && (settings.smtpHost.trim().length > 0 || settings.useSendmail),
  }
  return { ...settings, readOnly }
}

export function adminDemoStateCreate(props: AdminDemoStateProps = {}) {
  const initialSettings = adminSettingsReadOnlyDerive(props.settings ?? adminSettingsDemoData)
  const settings = createSignalObject(initialSettings)
  const defaultSettings: AdminSettings = adminSettingsReadOnlyDerive({
    ...adminSettingsDemoData,
    overrides: [],
  })
  const savedSettings = createSignalObject(initialSettings)
  const users = createSignalObject<readonly AdminUser[]>(props.users ?? adminUsersDemoData)
  const organizations = createSignalObject<readonly AdminOrganization[]>(
    props.organizations ?? adminOrganizationsDemoData,
  )
  const collectionState = adminCollectionsStateCreate({ organizations })
  const diagnostics = createSignalObject(props.diagnostics ?? adminDiagnosticsDemoData)
  const supportInformation = createSignalObject<string | null>(null)
  const clipboard = props.clipboard ?? (typeof navigator !== "undefined" ? navigator.clipboard : undefined)
  const activeSection = createSignalObject<AdminSection>("settings")
  const search = createSignalObject<AdminSearch>({ query: "", scope: "users" })
  const selectedUserId = createSignalObject<string | null>(null)
  const selectedUserOrganizationId = createSignalObject<string | null>(null)
  const organizationRole = createSignalObject<string>("user")
  const selectedOrganizationId = createSignalObject<string | null>(null)
  const dialog = createSignalObject<AdminDialog | null>(null)
  const confirmation = createSignalObject<AdminConfirmation | null>(null)
  const confirmationInput = createSignalObject("")
  const feedback = createSignalObject<AdminFeedback | null>(null)
  const lastUsersReloadedAt = createSignalObject<string | null>(null)
  const lastClientResyncAt = createSignalObject<string | null>(null)
  const lastOrganizationsReloadedAt = createSignalObject<string | null>(null)
  const settingsDirty = createMemo(() => JSON.stringify(settings.get()) !== JSON.stringify(savedSettings.get()))
  const adminTokenWarning = createMemo(
    () =>
      !settings.get().adminTokenDisabled &&
      !settings.get().readOnly.adminPageSecurityBypass &&
      !settings.get().adminToken.startsWith("$argon2"),
  )

  const filteredUsers = createMemo(() => {
    const query = search.get().query.trim().toLowerCase()
    if (query.length === 0) return users.get()
    return users.get().filter((user) => {
      const organizations = (user.organizations ?? []).map((organization) => organization.name).join(" ")
      return `${user.name} ${user.email} ${user.status} ${user.role} ${user.ssoIdentifier ?? ""} ${organizations}`
        .toLowerCase()
        .includes(query)
    })
  })

  const filteredOrganizations = createMemo(() => {
    const query = search.get().query.trim().toLowerCase()
    if (query.length === 0) return organizations.get()
    return organizations
      .get()
      .filter((organization) =>
        `${organization.name} ${organization.billingEmail} ${organization.uuid} ${organization.ownerName} ${organization.plan}`
          .toLowerCase()
          .includes(query),
      )
  })

  const selectedUser = createMemo(() => {
    const id = selectedUserId.get()
    return id === null ? null : (users.get().find((user) => user.id === id) ?? null)
  })

  const selectedUserOrganization = createMemo(() => {
    const organizationId = selectedUserOrganizationId.get()
    if (organizationId === null) return null
    return selectedUser()?.organizations?.find((organization) => organization.id === organizationId) ?? null
  })

  const selectedOrganization = createMemo(() => {
    const id = selectedOrganizationId.get()
    return id === null ? null : (organizations.get().find((organization) => organization.id === id) ?? null)
  })

  const selectSection = (section: AdminSection) => {
    activeSection.set(section)
    search.set({ query: "", scope: section === "organizations" ? "organizations" : "users" })
  }

  const setSearchQuery = (query: string) => {
    search.set({ ...search.get(), query })
  }

  const selectUser = (id: string | null) => {
    selectedUserId.set(id)
    selectedUserOrganizationId.set(null)
  }

  const selectUserOrganization = (id: string | null) => {
    selectedUserOrganizationId.set(id)
    if (id === null) return
    const organization = selectedUser()?.organizations?.find((membership) => membership.id === id)
    if (organization) organizationRole.set(organization.role)
  }

  const openUserOrganizationRole = (userId: string, organizationId: string) => {
    selectUser(userId)
    selectUserOrganization(organizationId)
    if (!selectedUserOrganization()) return
    dialog.set({ kind: "organizationRole", entityId: organizationId })
  }

  const selectOrganization = (id: string | null) => {
    selectedOrganizationId.set(id)
  }

  const openDialog = (value: AdminDialog) => {
    dialog.set(value)
  }

  const closeDialog = () => {
    dialog.set(null)
  }

  const requestConfirmation = (value: AdminConfirmation) => {
    confirmationInput.set("")
    confirmation.set(value)
  }

  const setConfirmationInput = (value: string) => {
    confirmationInput.set(value)
  }

  const closeConfirmation = () => {
    confirmationInput.set("")
    confirmation.set(null)
  }

  const showFeedback = (value: AdminFeedback) => {
    feedback.set(value)
  }

  const clearFeedback = () => {
    feedback.set(null)
  }

  const generateSupportInformation = () => {
    supportInformation.set(adminDiagnosticsSupportInformationCreate(diagnostics.get(), settings.get()))
  }

  const copySupportInformation = async () => {
    const value = supportInformation.get()
    if (!value) {
      showFeedback({ kind: "warning", message: "Generate support information before copying." })
      return
    }
    if (!clipboard) {
      showFeedback({ kind: "error", message: "Clipboard access is unavailable." })
      return
    }

    try {
      await clipboard.writeText(value)
      showFeedback({ kind: "success", message: "Support information copied to clipboard." })
    } catch {
      showFeedback({ kind: "error", message: "Support information could not be copied." })
    }
  }

  const settingOverrideAdd = (settingsValue: AdminSettings, key: AdminSettingsOverride) => {
    if (settingsValue.overrides.includes(key)) return settingsValue.overrides
    return [...settingsValue.overrides, key]
  }

  const toggleSetting = (key: AdminSettingsBooleanKey) => {
    if (!adminBooleanSettingKeys.includes(key)) return
    const currentSettings = settings.get()
    const nextSettings = { ...currentSettings, [key]: !currentSettings[key] }
    settings.set(
      adminSettingsReadOnlyDerive({
        ...nextSettings,
        overrides: settingOverrideAdd(currentSettings, key),
      }),
    )
  }

  const updateTextSetting = (key: AdminSettingsTextKey, value: string) => {
    if (!adminTextSettingKeys.includes(key)) return
    const currentSettings = settings.get()
    settings.set(
      adminSettingsReadOnlyDerive({
        ...currentSettings,
        [key]: value,
        overrides: settingOverrideAdd(currentSettings, key),
      }),
    )
  }

  const updateNumberSetting = (key: AdminSettingsNumberKey, value: number) => {
    if (!adminNumberSettingKeys.includes(key) || !Number.isInteger(value) || value < 0) return
    if (key === "invitationExpirationHours" && value < 1) return
    if (key === "passwordIterations" && value < 100_000) return
    if (key === "emailTokenSize" && value < 6) return
    const currentSettings = settings.get()
    settings.set(
      adminSettingsReadOnlyDerive({
        ...currentSettings,
        [key]: value,
        overrides: settingOverrideAdd(currentSettings, key),
      }),
    )
  }

  const settingDisabled = (key: AdminSettingsOverride) => {
    if (ssoDependentKeys.includes(key)) return !settings.get().ssoEnabled
    if (smtpDependentKeys.includes(key)) {
      const currentSettings = settings.get()
      if (!currentSettings.mailEnabled) return true
      return (
        currentSettings.useSendmail && ["smtpHost", "smtpUsername", "smtpPassword", "smtpAuthMechanism"].includes(key)
      )
    }
    if (email2faDependentKeys.includes(key)) return !settings.get().readOnly.email2faEnabled
    if (yubicoDependentKeys.includes(key)) return !settings.get().yubicoEnabled
    if (duoDependentKeys.includes(key)) return !settings.get().duoEnabled
    return false
  }

  const settingConfigOverridden = (key: AdminSettingsOverride) => settings.get().overrides.includes(key)
  const settingEnvironmentOverridden = (key: AdminSettingsOverride) => settings.get().environmentOverrides.includes(key)

  const resetSettings = () => {
    settings.set({ ...defaultSettings, readOnly: { ...defaultSettings.readOnly } })
    savedSettings.set({ ...defaultSettings, readOnly: { ...defaultSettings.readOnly } })
  }

  const saveSettings = () => {
    const currentSettings = settings.get()
    savedSettings.set({ ...currentSettings, readOnly: { ...currentSettings.readOnly } })
    showFeedback({ kind: "success", message: "Configuration saved in demo state." })
  }

  const updateUser = (id: string, update: (user: AdminUser) => AdminUser) => {
    users.set(users.get().map((user) => (user.id === id ? update(user) : user)))
  }

  const userRemove2fa = (userId: string) => {
    updateUser(userId, (user) => ({ ...user, twoFactorEnabled: false }))
  }

  const userDeauthorizeSessions = (userId: string) => {
    const timestamp = demoTimestampCreate()
    updateUser(userId, (user) => ({ ...user, sessionsDeauthorizedAt: timestamp }))
  }

  const userRemoveSsoAssociation = (userId: string) => {
    updateUser(userId, (user) => ({ ...user, ssoIdentifier: null }))
  }

  const userSetStatus = (userId: string, status: AdminUser["status"]) => {
    updateUser(userId, (user) => ({ ...user, status }))
  }

  const userResendInvitation = (userId: string) => {
    const timestamp = demoTimestampCreate()
    updateUser(userId, (user) => ({ ...user, invitationSentAt: timestamp }))
  }

  const userDelete = (userId: string) => {
    users.set(users.get().filter((user) => user.id !== userId))
    if (selectedUserId.get() !== userId) return
    selectedUserId.set(null)
    selectedUserOrganizationId.set(null)
    dialog.set(null)
  }

  const userOrganizationRoleSet = (userId: string, organizationId: string, role: AdminUserOrganizationRole) => {
    updateUser(userId, (user) => {
      const organizations = user.organizations ?? []
      if (!organizations.some((organization) => organization.id === organizationId)) return user
      return {
        ...user,
        organizations: organizations.map((organization) =>
          organization.id === organizationId ? { ...organization, role } : organization,
        ),
      }
    })
    organizationRole.set(role)
  }

  const usersReload = () => {
    users.set([...users.get()])
    lastUsersReloadedAt.set(demoTimestampCreate())
  }

  const clientsForceResync = () => {
    lastClientResyncAt.set(demoTimestampCreate())
  }

  const organizationSetStatus = (organizationId: string, status: AdminOrganization["status"]) => {
    organizations.set(
      organizations
        .get()
        .map((organization) => (organization.id === organizationId ? { ...organization, status } : organization)),
    )
  }

  const organizationDelete = (organizationId: string) => {
    organizations.set(organizations.get().filter((organization) => organization.id !== organizationId))
    users.set(
      users.get().map((user) => {
        const memberships = user.organizations ?? []
        const nextMemberships = memberships.filter((organization) => organization.id !== organizationId)
        if (nextMemberships.length === memberships.length) return user
        return { ...user, organizationCount: nextMemberships.length, organizations: nextMemberships }
      }),
    )
    if (selectedOrganizationId.get() !== organizationId) return
    selectedOrganizationId.set(null)
    dialog.set(null)
  }

  const organizationsReload = () => {
    organizations.set([...organizations.get()])
    lastOrganizationsReloadedAt.set(demoTimestampCreate())
  }

  return {
    settings: settings.get,
    users: users.get,
    organizations: organizations.get,
    collectionState,
    diagnostics: diagnostics.get,
    supportInformation: supportInformation.get,
    activeSection: activeSection.get,
    search: search.get,
    filteredUsers,
    filteredOrganizations,
    selectedUser,
    selectedUserOrganization,
    selectedOrganization,
    selectedUserId: selectedUserId.get,
    selectedOrganizationId: selectedOrganizationId.get,
    confirmationInput,
    organizationRole,
    organizationRoleOptions,
    organizationRoleLabel: (role: string) => organizationRoleLabels[role as AdminUserOrganizationRole] ?? role,
    lastUsersReloadedAt: lastUsersReloadedAt.get,
    lastClientResyncAt: lastClientResyncAt.get,
    lastOrganizationsReloadedAt: lastOrganizationsReloadedAt.get,
    settingsDirty,
    adminTokenWarning,
    dialog: dialog.get,
    confirmation: confirmation.get,
    feedback: feedback.get,
    selectSection,
    setSearchQuery,
    selectUser,
    selectUserOrganization,
    openUserOrganizationRole,
    selectOrganization,
    openDialog,
    closeDialog,
    requestConfirmation,
    setConfirmationInput,
    closeConfirmation,
    showFeedback,
    clearFeedback,
    toggleSetting,
    updateTextSetting,
    updateNumberSetting,
    settingDisabled,
    settingConfigOverridden,
    settingEnvironmentOverridden,
    resetSettings,
    saveSettings,
    userRemove2fa,
    userDeauthorizeSessions,
    userRemoveSsoAssociation,
    userSetStatus,
    userResendInvitation,
    userDelete,
    userOrganizationRoleSet,
    usersReload,
    clientsForceResync,
    organizationSetStatus,
    organizationDelete,
    organizationsReload,
    generateSupportInformation,
    copySupportInformation,
    formatDateTime: adminDateTimeFormat,
    formatAttachmentSize: adminAttachmentSizeFormat,
  }
}
