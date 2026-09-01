import { expect, test } from "bun:test"
import { webAppRouteResolve } from "../../../src/web/ui/webAppRouteResolve.js"

const demoRouteAliases = [
  { paths: ["/demo"], route: "directory" },
  { paths: ["/demo/extension"], route: "extension-demo" },
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

const demoSettingsPaths = [
  "/demo/settings",
  "/demo/settings/account",
  "/demo/settings/profile",
  "/demo/settings/security",
  "/demo/settings/two-factor",
  "/demo/settings/2fa",
  "/demo/settings/two-factor-setup",
  "/demo/settings/email",
  "/demo/settings/devices",
  "/demo/settings/sessions",
  "/demo/settings/emergency",
  "/demo/settings/tools",
  "/demo/settings/import",
  "/demo/settings/export",
  "/demo/settings/appearance",
  "/demo/settings/theme",
  "/demo/settings/danger",
  "/demo/settings/delete-account",
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

test("session handoff target routes resolve to cipher create and edit pages", () => {
  expect(webAppRouteResolve("/ciphers/new")).toBe("cipher-create")
  expect(webAppRouteResolve("/ciphers/cipher-one/edit")).toBe("cipher-edit")
})

test("sso connector routes resolve to sso-connector route", () => {
  expect(webAppRouteResolve("/sso-connector.html")).toBe("sso-connector")
  expect(webAppRouteResolve("/sso-connector")).toBe("sso-connector")
  expect(webAppRouteResolve("/SSO-CONNECTOR.HTML")).toBe("sso-connector")
})

test("demo settings section routes resolve to the demo settings experience", () => {
  for (const path of demoSettingsPaths) {
    expect(webAppRouteResolve(path)).toBe("demo-settings")
    expect(webAppRouteResolve(`${path}/`)).toBe("demo-settings")
    expect(webAppRouteResolve(path.toUpperCase())).toBe("demo-settings")
  }
})
