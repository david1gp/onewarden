import { expect, test } from "bun:test"
import { extensionLoginFillInjected } from "../../../src/extension/fill/extensionLoginFillInjected.js"

function domReset(): void {
  document.body.innerHTML = ""
}

test("extensionLoginFillInjected selects visible username and password inputs and dispatches input/change", () => {
  domReset()
  document.body.innerHTML = `
    <form id="login-form">
      <input type="text" name="search" value="keep" />
      <input type="hidden" name="username" value="hidden" />
      <input type="email" name="email" autocomplete="username" />
      <input type="password" name="password" />
      <button type="submit">Sign in</button>
    </form>
  `
  const form = document.getElementById("login-form") as HTMLFormElement
  const username = form.querySelector("input[autocomplete='username']") as HTMLInputElement
  const password = form.querySelector("input[type='password']") as HTMLInputElement
  const events: string[] = []
  const nativeValueGetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.get
  if (nativeValueGetter === undefined) throw new Error("The DOM test environment has no native input getter")
  let controlledSetterCalls = 0
  Object.defineProperty(username, "value", {
    configurable: true,
    get: () => nativeValueGetter.call(username),
    set: () => {
      controlledSetterCalls += 1
    },
  })
  let submitted = false
  username.addEventListener("input", () => events.push("username:input"))
  username.addEventListener("change", () => events.push("username:change"))
  password.addEventListener("input", () => events.push("password:input"))
  password.addEventListener("change", () => events.push("password:change"))
  form.addEventListener("submit", () => {
    submitted = true
  })

  const result = extensionLoginFillInjected({ username: "ada@example.com", password: "correct horse" })

  expect(result).toEqual({
    success: true,
    data: { status: "filled", usernameFilled: true, passwordFilled: true },
  })
  expect(username.value).toBe("ada@example.com")
  expect(password.value).toBe("correct horse")
  expect(controlledSetterCalls).toBe(0)
  expect(events).toEqual(["username:input", "username:change", "password:input", "password:change"])
  expect(submitted).toBe(false)
  expect((form.querySelector("input[type='hidden']") as HTMLInputElement).value).toBe("hidden")
})

test("extensionLoginFillInjected skips hidden, disabled, read-only, and new-password fields", () => {
  domReset()
  document.body.innerHTML = `
    <input type="text" name="username" disabled value="disabled" />
    <input type="text" name="username" readonly value="readonly" />
    <input type="text" name="username" style="display: none" value="hidden" />
    <input type="password" name="password" autocomplete="new-password" value="new" />
    <input type="password" name="password" disabled value="disabled" />
  `

  const result = extensionLoginFillInjected({ username: "user", password: "secret" })

  expect(result).toEqual({
    success: true,
    data: { status: "noFields", usernameFilled: false, passwordFilled: false },
  })
})

test("extensionLoginFillInjected reports a partial fill when only one safe field exists", () => {
  domReset()
  document.body.innerHTML = `<input type="email" autocomplete="username" />`

  const result = extensionLoginFillInjected({ username: "user@example.test", password: "secret" })

  expect(result).toEqual({
    success: true,
    data: { status: "partiallyFilled", usernameFilled: true, passwordFilled: false },
  })
})
