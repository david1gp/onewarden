export type DemoRouteName =
  | "root"
  | "directory"
  | "all-items"
  | "login"
  | "secure-note"
  | "credit-card"
  | "identity"
  | "empty-state"
  | "trash"
  | "locked"

export function webAppRouteResolve(pathname: string): DemoRouteName {
  const normalized = pathname.replace(/\/+$/, "").toLowerCase()

  if (normalized === "" || normalized === "/") {
    return "root"
  }
  if (normalized === "/demo") {
    return "directory"
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
