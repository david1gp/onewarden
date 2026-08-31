import { expect, test } from "bun:test"
import type { ExtensionLogin } from "../../../src/extension/ExtensionLogin.js"
import { extensionFullWindowLoginSearchMatch } from "../../../src/extension/fullwindow/extensionFullWindowLoginSearchMatch.js"
import { extensionFullWindowLoginUriMatch } from "../../../src/extension/fullwindow/extensionFullWindowLoginUriMatch.js"
import { extensionLoginSearchMatch } from "../../../src/extension/extensionLoginSearchMatch.js"

const login: ExtensionLogin = {
  id: "login-1",
  name: "Example Mail",
  username: "ada@example.com",
  uri: "https://mail.example.com/login",
  copyableFields: [{ key: "custom:API key", label: "API key", value: "abc123" }],
}

test("extensionFullWindowLoginSearchMatch matches every login for an empty query", () => {
  expect(extensionFullWindowLoginSearchMatch(login, "   ")).toBe(true)
})

test("extensionFullWindowLoginSearchMatch matches name, username and uri", () => {
  expect(extensionFullWindowLoginSearchMatch(login, "example mail")).toBe(true)
  expect(extensionFullWindowLoginSearchMatch(login, "ADA@")).toBe(true)
  expect(extensionFullWindowLoginSearchMatch(login, "mail.example.com")).toBe(true)
  expect(extensionFullWindowLoginSearchMatch(login, "unrelated")).toBe(false)
})

test("extensionFullWindowLoginSearchMatch keeps custom field label matching local", () => {
  expect(extensionLoginSearchMatch(login, "api key")).toBe(false)
  expect(extensionFullWindowLoginSearchMatch(login, "api key")).toBe(true)
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
