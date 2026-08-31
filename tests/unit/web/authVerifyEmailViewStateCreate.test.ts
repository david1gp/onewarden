import { afterEach, expect, test } from "bun:test"
import { base64UrlEncode } from "../../../src/shared/crypto/base64UrlEncode.js"
import { authVerifyEmailViewStateCreate } from "../../../src/web/auth/ui/authVerifyEmailViewStateCreate.js"

window.location.href = "http://localhost/"
const initialUrl = window.location.href

function tokenCreate(claims: unknown): string {
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)))
  return `header.${payload}.signature`
}

afterEach(() => {
  window.history.replaceState(null, "", initialUrl)
})

test("authVerifyEmailViewStateCreate reads URL aliases and keeps explicit props authoritative", () => {
  window.history.replaceState(
    null,
    "",
    "http://localhost/?user_id=query-user&token=query-token&email=query%40example.com",
  )

  const fromUrl = authVerifyEmailViewStateCreate()
  expect(fromUrl.userId()).toBe("query-user")
  expect(fromUrl.token()).toBe("query-token")
  expect(fromUrl.resendEmail()).toBe("query@example.com")

  const fromProps = authVerifyEmailViewStateCreate({
    initialEmail: "props@example.com",
    initialToken: "props-token",
    initialUserId: "props-user",
  })
  expect(fromProps.userId()).toBe("props-user")
  expect(fromProps.token()).toBe("props-token")
  expect(fromProps.resendEmail()).toBe("props@example.com")
})

test("authVerifyEmailViewStateCreate ignores malformed URL values and preserves empty defaults", () => {
  window.history.replaceState(null, "", `http://localhost/?userId=%20%20&token=${"x".repeat(8_193)}&email=%20`)

  const state = authVerifyEmailViewStateCreate()
  expect(state.userId()).toBe("")
  expect(state.token()).toBe("")
  expect(state.resendEmail()).toBe("")
})

test("authVerifyEmailViewStateCreate derives a user id from a valid URL token", () => {
  const userId = "123e4567-e89b-12d3-a456-426614174000"
  window.history.replaceState(null, "", `http://localhost/?token=${encodeURIComponent(tokenCreate({ sub: userId }))}`)

  expect(authVerifyEmailViewStateCreate().userId()).toBe(userId)
})
