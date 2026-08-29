import { expect, test } from "bun:test"
import type { ExtensionLogin } from "../../../src/extension/ExtensionLogin.js"
import { extensionLoginSearchMatch } from "../../../src/extension/extensionLoginSearchMatch.js"

const login: ExtensionLogin = {
  id: "login-1",
  name: "Example Mail",
  username: "ada@example.com",
  uri: "https://example.com/login",
  copyableFields: [],
}

test("extensionLoginSearchMatch keeps every login for an empty query", () => {
  expect(extensionLoginSearchMatch(login, "")).toBe(true)
  expect(extensionLoginSearchMatch(login, "   ")).toBe(true)
})

test("extensionLoginSearchMatch matches name, username and uri case-insensitively", () => {
  expect(extensionLoginSearchMatch(login, "MAIL")).toBe(true)
  expect(extensionLoginSearchMatch(login, "ADA@")).toBe(true)
  expect(extensionLoginSearchMatch(login, "/LOGIN")).toBe(true)
})

test("extensionLoginSearchMatch tolerates absent optional values", () => {
  const sparse: ExtensionLogin = { ...login, username: null, uri: null }

  expect(extensionLoginSearchMatch(sparse, "example mail")).toBe(true)
  expect(extensionLoginSearchMatch(sparse, "ada")).toBe(false)
  expect(extensionLoginSearchMatch(sparse, "example.com")).toBe(false)
})

test("extensionLoginSearchMatch rejects a query matching no standard field", () => {
  expect(extensionLoginSearchMatch(login, "unrelated")).toBe(false)
})
