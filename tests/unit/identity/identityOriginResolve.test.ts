import { expect, test } from "bun:test"
import { identityOriginResolve } from "../../../src/server/contexts/identity/identityOriginResolve.js"

test("identityOriginResolve uses the configured origin and discards path components", () => {
  expect(identityOriginResolve("https://vault.example/base/path/", "http://request.example/identity")).toBe(
    "https://vault.example",
  )
})

test("identityOriginResolve infers the origin from the request when it is not configured", () => {
  expect(identityOriginResolve(undefined, "https://request.example:8443/identity/accounts/register")).toBe(
    "https://request.example:8443",
  )
})
