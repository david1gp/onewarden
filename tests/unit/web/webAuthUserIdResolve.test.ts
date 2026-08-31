import { expect, test } from "bun:test"
import { base64UrlEncode } from "../../../src/shared/crypto/base64UrlEncode.js"
import { webAuthUserIdResolve } from "../../../src/web/auth/model/webAuthUserIdResolve.js"
import { webAuthVerificationUserIdResolve } from "../../../src/web/auth/model/webAuthVerificationUserIdResolve.js"

function tokenCreate(claims: unknown): string {
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)))
  return `header.${payload}.signature`
}

test("web auth token user id resolvers validate decoded claims", () => {
  expect(webAuthUserIdResolve(tokenCreate({ sub: "user-123", issuer: "onewarden" }))).toBe("user-123")
  expect(webAuthUserIdResolve(tokenCreate({ sub: 123 }))).toBe("anonymous")
  expect(webAuthUserIdResolve(tokenCreate(["not", "claims"]))).toBe("anonymous")

  const userId = "123e4567-e89b-12d3-a456-426614174000"
  expect(webAuthVerificationUserIdResolve(tokenCreate({ sub: userId }))).toBe(userId)
  expect(webAuthVerificationUserIdResolve(tokenCreate({ sub: "not-a-uuid" }))).toBeNull()
})
