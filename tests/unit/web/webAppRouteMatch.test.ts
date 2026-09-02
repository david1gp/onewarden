import { expect, test } from "bun:test"
import { demoRouteAliases } from "../../../src/web/demo/demo_url/demoRouteAliases.js"
import { pageNameWebApp } from "../../../src/web/web_url/pageNameWebApp.js"
import { urlWebApp } from "../../../src/web/web_url/urlWebApp.js"
import { webAppRouteMatch } from "../../../src/web/web_url/webAppRouteMatch.js"
import { webAppRouteResolve } from "../../../src/web/web_url/webAppRouteResolve.js"

const webRouteAliases = [
  { pageName: pageNameWebApp.root, paths: ["", "/", "/ciphers", "/vault"] },
  { pageName: pageNameWebApp.authLogin, paths: ["/login"] },
  { pageName: pageNameWebApp.authRegister, paths: ["/register", "/signup"] },
  { pageName: pageNameWebApp.authVerify, paths: ["/verify", "/verify-email", "/verify-token"] },
  { pageName: pageNameWebApp.authUnlock, paths: ["/lock", "/unlock"] },
  {
    pageName: pageNameWebApp.authTwoFactorSetup,
    paths: ["/two-factor", "/settings/two-factor", "/2fa", "/two-factor-setup"],
  },
  { pageName: pageNameWebApp.authTwoFactorChallenge, paths: ["/two-factor-challenge", "/2fa-challenge"] },
  { pageName: pageNameWebApp.ssoConnector, paths: ["/sso-connector.html", "/sso-connector"] },
  {
    pageName: pageNameWebApp.settings,
    paths: [
      "/settings",
      "/settings/account",
      "/settings/profile",
      "/settings/security",
      "/settings/email",
      "/settings/devices",
      "/settings/sessions",
      "/settings/tools",
      "/settings/import",
      "/settings/export",
      "/settings/danger",
      "/settings/delete-account",
    ],
  },
  { pageName: pageNameWebApp.emergencyAccess, paths: ["/settings/emergency", "/emergency-access", "/emergency"] },
  { pageName: pageNameWebApp.sends, paths: ["/sends", "/send"] },
  { pageName: pageNameWebApp.sendAccess, paths: ["/send-access"] },
  { pageName: pageNameWebApp.adminLogin, paths: ["/admin-ui/login"] },
  {
    pageName: pageNameWebApp.admin,
    paths: [
      "/admin-ui",
      "/admin-ui/dashboard",
      "/admin-ui/users",
      "/admin-ui/organizations",
      "/admin-ui/diagnostics",
      "/admin-ui/config",
      "/admin-ui/tools",
    ],
  },
  { pageName: pageNameWebApp.organizations, paths: ["/organizations", "/organization", "/org"] },
]

test("webAppRouteMatch resolves every current static alias family", () => {
  for (const { pageName, paths } of [...webRouteAliases, ...demoRouteAliases]) {
    for (const path of paths) {
      for (const normalizedPath of [path, `${path}/`, path.toUpperCase()]) {
        expect(webAppRouteMatch(normalizedPath)).toEqual({ pageName, params: {} })
      }
    }
  }
})

test("webAppRouteMatch prefers static routes over dynamic cipher routes", () => {
  expect(webAppRouteMatch("/ciphers/new")).toEqual({ pageName: pageNameWebApp.cipherCreate, params: {} })
  expect(webAppRouteMatch("/ciphers/create/")).toEqual({ pageName: pageNameWebApp.cipherCreate, params: {} })
  expect(webAppRouteMatch("/vault/new")).toEqual({ pageName: pageNameWebApp.cipherCreate, params: {} })
  expect(webAppRouteMatch("/ciphers/new/edit")).toEqual({
    pageName: pageNameWebApp.cipherEdit,
    params: { cipherId: "new" },
  })
  expect(webAppRouteMatch("/admin-ui/login")).toEqual({ pageName: pageNameWebApp.adminLogin, params: {} })
  expect(webAppRouteMatch("/demo/admin/login")).toEqual({ pageName: pageNameWebApp.admin, params: {} })
})

test("webAppRouteMatch extracts normalized dynamic cipher and send parameters", () => {
  expect(webAppRouteMatch("/CIPHERS/Cipher%20One/EDIT/")).toEqual({
    pageName: pageNameWebApp.cipherEdit,
    params: { cipherId: "Cipher One" },
  })
  expect(webAppRouteMatch("/vault/Cipher-View")).toEqual({
    pageName: pageNameWebApp.cipherView,
    params: { cipherId: "Cipher-View" },
  })
  expect(webAppRouteMatch("/send/Send%2FOne/")).toEqual({
    pageName: pageNameWebApp.sendAccess,
    params: { sendAccessId: "Send/One" },
  })
  expect(webAppRouteMatch("/SENDS/ACCESS/send-two")).toEqual({
    pageName: pageNameWebApp.sendAccess,
    params: { sendAccessId: "send-two" },
  })
  expect(webAppRouteMatch("/ciphers//legacy-cipher/edit").pageName).toBe(pageNameWebApp.cipherEdit)
  expect(webAppRouteMatch("/send//legacy-send").pageName).toBe(pageNameWebApp.sendAccess)
})

test("urlWebApp builds canonical static and dynamic URLs", () => {
  expect(urlWebApp(pageNameWebApp.root)).toBe("/")
  expect(urlWebApp(pageNameWebApp.authVerify)).toBe("/verify-email")
  expect(urlWebApp(pageNameWebApp.ssoConnector)).toBe("/sso-connector.html")
  expect(urlWebApp(pageNameWebApp.cipherView, { cipherId: "cipher-one" })).toBe("/ciphers/cipher-one")
  expect(urlWebApp(pageNameWebApp.cipherEdit, { cipherId: "cipher-one" })).toBe("/ciphers/cipher-one/edit")
  expect(urlWebApp(pageNameWebApp.sendAccess, { sendAccessId: "send-one" })).toBe("/send/send-one")
  expect(urlWebApp(pageNameWebApp.sendAccess, { sendAccessId: "Send/One" })).toBe("/send/Send%2FOne")
})

test("webAppRouteMatch and webAppRouteResolve fall back to root for unknown paths", () => {
  expect(webAppRouteMatch("/not-a-current-route")).toEqual({ pageName: pageNameWebApp.root, params: {} })
  expect(webAppRouteMatch("/admin")).toEqual({ pageName: pageNameWebApp.root, params: {} })
  expect(webAppRouteMatch("/admin/users")).toEqual({ pageName: pageNameWebApp.root, params: {} })
  expect(webAppRouteMatch("/sends/access")).toEqual({ pageName: pageNameWebApp.root, params: {} })
  expect(webAppRouteResolve("/not-a-current-route")).toBe("root")
  expect(webAppRouteResolve("/demo/admin/login/")).toBe("admin")
})
