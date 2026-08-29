import { expect, test } from "bun:test"
import { webAppRouteResolve } from "../../../src/web/ui/webAppRouteResolve.js"

const demoRouteAliases = [
  { paths: ["/demo"], route: "directory" },
  { paths: ["/demo/admin"], route: "admin" },
  { paths: ["/demo/all", "/demo/all-items", "/demo/vault"], route: "all-items" },
  { paths: ["/demo/login", "/demo/selected-login"], route: "login" },
  { paths: ["/demo/secure-note", "/demo/selected-secure-note", "/demo/note"], route: "secure-note" },
  { paths: ["/demo/credit-card", "/demo/selected-credit-card", "/demo/card"], route: "credit-card" },
  { paths: ["/demo/identity", "/demo/selected-identity"], route: "identity" },
  { paths: ["/demo/ssh-key", "/demo/selected-ssh-key"], route: "ssh-key" },
  { paths: ["/demo/empty", "/demo/empty-state"], route: "empty-state" },
  { paths: ["/demo/trash", "/demo/deleted"], route: "trash" },
  { paths: ["/demo/locked", "/demo/lock"], route: "locked" },
]

test("demo route aliases resolve to their canonical vault experiences", () => {
  for (const { paths, route } of demoRouteAliases) {
    for (const path of paths) {
      expect(webAppRouteResolve(path) as string).toBe(route)
      expect(webAppRouteResolve(`${path}/`) as string).toBe(route)
      expect(webAppRouteResolve(path.toUpperCase()) as string).toBe(route)
    }
  }
})
