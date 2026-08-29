export type WebAppRouteName =
  | "root"
  | "auth-login"
  | "auth-register"
  | "auth-verify"
  | "auth-unlock"
  | "auth-two-factor-setup"
  | "auth-two-factor-challenge"
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
  const normalized = pathname.replace(/\/+$/, "").toLowerCase()

  if (normalized === "" || normalized === "/") {
    return "root"
  }
  if (normalized === "/login") {
    return "auth-login"
  }
  if (normalized === "/register" || normalized === "/signup") {
    return "auth-register"
  }
  if (normalized === "/verify" || normalized === "/verify-email" || normalized === "/verify-token") {
    return "auth-verify"
  }
  if (normalized === "/lock" || normalized === "/unlock") {
    return "auth-unlock"
  }
  if (
    normalized === "/two-factor" ||
    normalized === "/settings/two-factor" ||
    normalized === "/2fa" ||
    normalized === "/two-factor-setup"
  ) {
    return "auth-two-factor-setup"
  }
  if (normalized === "/two-factor-challenge" || normalized === "/2fa-challenge") {
    return "auth-two-factor-challenge"
  }
  if (normalized === "/demo") {
    return "directory"
  }
  if (normalized === "/demo/admin") {
    return "admin"
  }
  if (normalized === "/demo/all" || normalized === "/demo/all-items" || normalized === "/demo/vault") {
    return "all-items"
  }
  if (normalized === "/demo/login" || normalized === "/demo/selected-login") {
    return "login"
  }
  if (
    normalized === "/demo/secure-note" ||
    normalized === "/demo/selected-secure-note" ||
    normalized === "/demo/note"
  ) {
    return "secure-note"
  }
  if (
    normalized === "/demo/credit-card" ||
    normalized === "/demo/selected-credit-card" ||
    normalized === "/demo/card"
  ) {
    return "credit-card"
  }
  if (normalized === "/demo/identity" || normalized === "/demo/selected-identity") {
    return "identity"
  }
  if (normalized === "/demo/ssh-key" || normalized === "/demo/selected-ssh-key") {
    return "ssh-key"
  }
  if (normalized === "/demo/empty" || normalized === "/demo/empty-state") {
    return "empty-state"
  }
  if (normalized === "/demo/trash" || normalized === "/demo/deleted") {
    return "trash"
  }
  if (normalized === "/demo/locked" || normalized === "/demo/lock") {
    return "locked"
  }

  return "root"
}
