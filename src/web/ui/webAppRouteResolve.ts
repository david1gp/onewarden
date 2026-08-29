export type WebAppRouteName =
  | "root"
  | "auth-login"
  | "auth-register"
  | "auth-verify"
  | "auth-unlock"
  | "auth-two-factor-setup"
  | "auth-two-factor-challenge"
  | "cipher-create"
  | "cipher-edit"
  | "cipher-view"
  | "directory"
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
  if (routePath === "/demo/admin") {
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

  return "root"
}
