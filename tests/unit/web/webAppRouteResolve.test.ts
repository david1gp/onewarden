import { expect, test } from "bun:test"
import { demoRouteAliases } from "../../../src/web/demo/demo_url/demoRouteAliases.js"
import { webAppRouteResolve } from "../../../src/web/ui/webAppRouteResolve.js"

test("demo route aliases resolve to their canonical vault experiences", () => {
  for (const { paths, pageName } of demoRouteAliases) {
    for (const path of paths) {
      expect(webAppRouteResolve(path)).toBe(pageName)
      expect(webAppRouteResolve(`${path}/`)).toBe(pageName)
      expect(webAppRouteResolve(path.toUpperCase())).toBe(pageName)
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
