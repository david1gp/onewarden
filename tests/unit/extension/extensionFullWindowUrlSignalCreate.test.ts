import { afterEach, expect, test } from "bun:test"
import { extensionFullWindowLoginIdSchema } from "../../../src/extension/fullwindow/extensionFullWindowLoginIdSchema.js"
import { extensionFullWindowPaneSchema } from "../../../src/extension/fullwindow/extensionFullWindowPaneSchema.js"
import { extensionFullWindowSiteFilterSchema } from "../../../src/extension/fullwindow/extensionFullWindowSiteFilterSchema.js"
import { extensionFullWindowUrlSignalCreate } from "../../../src/extension/fullwindow/extensionFullWindowUrlSignalCreate.js"

window.location.href = "http://localhost/"
const initialUrl = window.location.href

afterEach(() => {
  window.history.replaceState(null, "", initialUrl)
})

test("extensionFullWindowUrlSignalCreate accepts supported URL modes and identifiers", () => {
  window.history.replaceState(null, "", "http://localhost/?pane=generator&login=login-1&site=1")

  expect(extensionFullWindowUrlSignalCreate("pane", "vault", extensionFullWindowPaneSchema).get()).toBe("generator")
  expect(extensionFullWindowUrlSignalCreate("login", "", extensionFullWindowLoginIdSchema).get()).toBe("login-1")
  expect(extensionFullWindowUrlSignalCreate("site", "", extensionFullWindowSiteFilterSchema).get()).toBe("1")
})

test("extensionFullWindowUrlSignalCreate falls back for absent and malformed URL values", () => {
  window.history.replaceState(null, "", "http://localhost/?pane=unknown&login=%20%20&site=0")

  expect(extensionFullWindowUrlSignalCreate("q", "fallback").get()).toBe("fallback")
  expect(extensionFullWindowUrlSignalCreate("pane", "vault", extensionFullWindowPaneSchema).get()).toBe("vault")
  expect(extensionFullWindowUrlSignalCreate("login", "", extensionFullWindowLoginIdSchema).get()).toBe("")
  expect(extensionFullWindowUrlSignalCreate("site", "", extensionFullWindowSiteFilterSchema).get()).toBe("")
})
