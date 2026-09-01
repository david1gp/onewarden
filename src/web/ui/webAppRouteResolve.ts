export type WebAppRouteName =
  | "root"
  | "auth-login"
  | "auth-register"
  | "auth-verify"
  | "auth-unlock"
  | "auth-two-factor-setup"
  | "auth-two-factor-challenge"
  | "sso-connector"
  | "cipher-create"
  | "cipher-edit"
  | "cipher-view"
  | "settings"
  | "sends"
  | "send-access"
  | "emergency-access"
  | "admin-login"
  | "directory"
  | "extension-demo"
  | "demo-settings"
  | "admin"
  | "all-items"
  | "login"
  | "secure-note"
  | "credit-card"
  | "identity"
  | "ssh-key"
  | "empty-state"
  | "trash"
  | "locked"
  | "organizations"

export function webAppRouteResolve(pathname: string): WebAppRouteName {
  const normalized = pathname.replace(/\/+$/, "")
  const routePath = normalized.toLowerCase()

  if (routePath === "" || routePath === "/") {
    return "root"
  }
  if (routePath === "/login") {
    return "auth-login"
  }
  if (routePath === "/register" || routePath === "/signup") {
    return "auth-register"
  }
  if (routePath === "/verify" || routePath === "/verify-email" || routePath === "/verify-token") {
    return "auth-verify"
  }
  if (routePath === "/lock" || routePath === "/unlock") {
    return "auth-unlock"
  }
  if (
    routePath === "/two-factor" ||
    routePath === "/settings/two-factor" ||
    routePath === "/2fa" ||
    routePath === "/two-factor-setup"
  ) {
    return "auth-two-factor-setup"
  }
  if (routePath === "/sso-connector.html" || routePath === "/sso-connector") {
    return "sso-connector"
  }
  if (
    routePath === "/settings" ||
    routePath === "/settings/account" ||
    routePath === "/settings/profile" ||
    routePath === "/settings/security" ||
    routePath === "/settings/email" ||
    routePath === "/settings/devices" ||
    routePath === "/settings/sessions" ||
    routePath === "/settings/tools" ||
    routePath === "/settings/import" ||
    routePath === "/settings/export" ||
    routePath === "/settings/danger" ||
    routePath === "/settings/delete-account"
  ) {
    return "settings"
  }
  if (routePath === "/settings/emergency" || routePath === "/emergency-access" || routePath === "/emergency") {
    return "emergency-access"
  }
  if (routePath === "/sends" || routePath === "/send") {
    return "sends"
  }
  if (routePath.startsWith("/send/") || routePath.startsWith("/sends/access/") || routePath === "/send-access") {
    return "send-access"
  }
  if (routePath === "/admin-ui/login") {
    return "admin-login"
  }
  if (
    routePath === "/admin-ui" ||
    routePath === "/admin-ui/dashboard" ||
    routePath === "/admin-ui/users" ||
    routePath === "/admin-ui/organizations" ||
    routePath === "/admin-ui/diagnostics" ||
    routePath === "/admin-ui/config" ||
    routePath === "/admin-ui/tools"
  ) {
    return "admin"
  }
  if (routePath === "/two-factor-challenge" || routePath === "/2fa-challenge") {
    return "auth-two-factor-challenge"
  }
  if (routePath === "/ciphers/new" || routePath === "/ciphers/create" || routePath === "/vault/new") {
    return "cipher-create"
  }
  if ((routePath.startsWith("/ciphers/") || routePath.startsWith("/vault/")) && routePath.endsWith("/edit")) {
    return "cipher-edit"
  }
  if (
    (routePath.startsWith("/ciphers/") && routePath !== "/ciphers") ||
    (routePath.startsWith("/vault/") && routePath !== "/vault")
  ) {
    return "cipher-view"
  }
  if (routePath === "/ciphers" || routePath === "/vault") {
    return "root"
  }
  if (routePath === "/demo") {
    return "directory"
  }
  if (routePath === "/demo/extension") {
    return "extension-demo"
  }
  if (
    routePath === "/demo/settings" ||
    routePath === "/demo/settings/account" ||
    routePath === "/demo/settings/profile" ||
    routePath === "/demo/settings/security" ||
    routePath === "/demo/settings/two-factor" ||
    routePath === "/demo/settings/2fa" ||
    routePath === "/demo/settings/two-factor-setup" ||
    routePath === "/demo/settings/email" ||
    routePath === "/demo/settings/devices" ||
    routePath === "/demo/settings/sessions" ||
    routePath === "/demo/settings/emergency" ||
    routePath === "/demo/settings/tools" ||
    routePath === "/demo/settings/import" ||
    routePath === "/demo/settings/export" ||
    routePath === "/demo/settings/appearance" ||
    routePath === "/demo/settings/theme" ||
    routePath === "/demo/settings/danger" ||
    routePath === "/demo/settings/delete-account"
  ) {
    return "demo-settings"
  }
  if (routePath === "/demo/admin" || routePath === "/demo/admin/login") {
    return "admin"
  }
  if (routePath === "/demo/all" || routePath === "/demo/all-items" || routePath === "/demo/vault") {
    return "all-items"
  }
  if (routePath === "/demo/login" || routePath === "/demo/selected-login") {
    return "login"
  }
  if (routePath === "/demo/secure-note" || routePath === "/demo/selected-secure-note" || routePath === "/demo/note") {
    return "secure-note"
  }
  if (routePath === "/demo/credit-card" || routePath === "/demo/selected-credit-card" || routePath === "/demo/card") {
    return "credit-card"
  }
  if (routePath === "/demo/identity" || routePath === "/demo/selected-identity") {
    return "identity"
  }
  if (routePath === "/demo/ssh-key" || routePath === "/demo/selected-ssh-key") {
    return "ssh-key"
  }
  if (routePath === "/demo/empty" || routePath === "/demo/empty-state") {
    return "empty-state"
  }
  if (routePath === "/demo/trash" || routePath === "/demo/deleted") {
    return "trash"
  }
  if (routePath === "/demo/locked" || routePath === "/demo/lock") {
    return "locked"
  }
  if (
    routePath === "/organizations" ||
    routePath === "/organization" ||
    routePath === "/org" ||
    routePath === "/demo/organizations" ||
    routePath === "/demo/organization" ||
    routePath === "/demo/org"
  ) {
    return "organizations"
  }

  return "root"
}
