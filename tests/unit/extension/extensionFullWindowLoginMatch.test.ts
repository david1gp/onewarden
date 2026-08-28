import { expect, test } from "bun:test"
import type { ExtensionFullWindowLogin } from "../../../src/extension/fullwindow/ExtensionFullWindowLogin.js"
import { extensionFullWindowLoginSearchMatch } from "../../../src/extension/fullwindow/extensionFullWindowLoginSearchMatch.js"
import { extensionFullWindowLoginUriMatch } from "../../../src/extension/fullwindow/extensionFullWindowLoginUriMatch.js"

const login: ExtensionFullWindowLogin = {
  id: "login-1",
  name: "Example Mail",
  username: "ada@example.com",
  uri: "https://mail.example.com/login",
  copyableFields: [{ key: "custom:API key", label: "API key", value: "abc123" }],
}

test("extensionFullWindowLoginSearchMatch matches every login for an empty query", () => {
  expect(extensionFullWindowLoginSearchMatch(login, "   ")).toBe(true)
})

test("extensionFullWindowLoginSearchMatch matches name, username, uri and custom field labels", () => {
  expect(extensionFullWindowLoginSearchMatch(login, "example mail")).toBe(true)
  expect(extensionFullWindowLoginSearchMatch(login, "ADA@")).toBe(true)
  expect(extensionFullWindowLoginSearchMatch(login, "mail.example.com")).toBe(true)
  expect(extensionFullWindowLoginSearchMatch(login, "api key")).toBe(true)
  expect(extensionFullWindowLoginSearchMatch(login, "unrelated")).toBe(false)
})

test("extensionFullWindowLoginUriMatch keeps every login when no site is active", () => {
  expect(extensionFullWindowLoginUriMatch(login, null)).toBe(true)
})

test("extensionFullWindowLoginUriMatch accepts the hostname and its subdomains", () => {
  expect(extensionFullWindowLoginUriMatch(login, "mail.example.com")).toBe(true)
  expect(extensionFullWindowLoginUriMatch(login, "example.com")).toBe(true)
  expect(extensionFullWindowLoginUriMatch(login, "notexample.com")).toBe(false)
})

test("extensionFullWindowLoginUriMatch rejects logins without a parsable uri", () => {
  expect(extensionFullWindowLoginUriMatch({ ...login, uri: null }, "example.com")).toBe(false)
  expect(extensionFullWindowLoginUriMatch({ ...login, uri: "not a url" }, "example.com")).toBe(false)
})
