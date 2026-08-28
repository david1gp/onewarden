import { expect, test } from "bun:test"
import type { ExtensionPopupLogin } from "../../../src/extension/popup/ExtensionPopupLogin.js"
import { extensionPopupLoginSearchMatch } from "../../../src/extension/popup/extensionPopupLoginSearchMatch.js"

const login: ExtensionPopupLogin = {
  id: "login-1",
  name: "Example Mail",
  username: "ada@example.com",
  uri: "https://example.com/login",
  copyableFields: [],
}

test("extensionPopupLoginSearchMatch keeps every login for a blank query", () => {
  expect(extensionPopupLoginSearchMatch(login, "")).toBe(true)
  expect(extensionPopupLoginSearchMatch(login, "   ")).toBe(true)
})

test("extensionPopupLoginSearchMatch matches name, username and uri case-insensitively", () => {
  expect(extensionPopupLoginSearchMatch(login, "MAIL")).toBe(true)
  expect(extensionPopupLoginSearchMatch(login, "ada@")).toBe(true)
  expect(extensionPopupLoginSearchMatch(login, "/LOGIN")).toBe(true)
})

test("extensionPopupLoginSearchMatch rejects a query matching no searchable field", () => {
  expect(extensionPopupLoginSearchMatch(login, "unrelated")).toBe(false)
})

test("extensionPopupLoginSearchMatch tolerates missing username and uri", () => {
  const sparse: ExtensionPopupLogin = { ...login, username: null, uri: null }

  expect(extensionPopupLoginSearchMatch(sparse, "example mail")).toBe(true)
  expect(extensionPopupLoginSearchMatch(sparse, "ada")).toBe(false)
})
