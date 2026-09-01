import { expect, test } from "bun:test"
import { extensionAutofillFieldClassify } from "../../../src/extension/autofill/extensionAutofillFieldClassify.js"
import { extensionAutofillFieldsDiscover } from "../../../src/extension/autofill/extensionAutofillFieldsDiscover.js"

function domReset(): void {
  document.documentElement.innerHTML = "<head></head><body></body>"
}

test("ordinary autofill classification covers credential, TOTP, card, and identity semantics", () => {
  domReset()
  document.body.innerHTML = `
    <form><input id="login-email" type="email"><input type="password" autocomplete="current-password"></form>
    <input id="confirm" type="password" aria-label="Confirm password">
    <input id="otp" autocomplete="one-time-code">
    <input id="card" autocomplete="cc-number">
    <input id="expiry" aria-label="Expiration date">
    <input id="given" autocomplete="given-name">
    <input id="phone" type="tel">
    <input id="address" autocomplete="address-line1">
  `

  expect(extensionAutofillFieldClassify(document.querySelector("#login-email") as HTMLInputElement)).toBe("username")
  expect(
    extensionAutofillFieldClassify(document.querySelector("[autocomplete='current-password']") as HTMLInputElement),
  ).toBe("currentPassword")
  expect(extensionAutofillFieldClassify(document.querySelector("#confirm") as HTMLInputElement)).toBe(
    "confirmationPassword",
  )
  expect(extensionAutofillFieldClassify(document.querySelector("#otp") as HTMLInputElement)).toBe("totp")
  expect(extensionAutofillFieldClassify(document.querySelector("#card") as HTMLInputElement)).toBe("cardNumber")
  expect(extensionAutofillFieldClassify(document.querySelector("#expiry") as HTMLInputElement)).toBe(
    "cardExpirationDate",
  )
  expect(extensionAutofillFieldClassify(document.querySelector("#given") as HTMLInputElement)).toBe("identityGivenName")
  expect(extensionAutofillFieldClassify(document.querySelector("#phone") as HTMLInputElement)).toBe("identityPhone")
  expect(extensionAutofillFieldClassify(document.querySelector("#address") as HTMLInputElement)).toBe(
    "identityAddressLine1",
  )
})

test("field discovery traverses open shadow roots, rejects unsafe controls, and never includes page values", () => {
  domReset()
  document.body.innerHTML = `
    <input name="username" value="private-page-value">
    <input type="password" value="page-secret" disabled>
    <input autocomplete="cc-csc" style="display:none" value="123">
    <iframe></iframe>
    <div id="shadow-host"></div>
  `
  const shadow = (document.querySelector("#shadow-host") as HTMLElement).attachShadow({ mode: "open" })
  shadow.innerHTML = `<input autocomplete="postal-code" value="90210"><div contenteditable="true">editor</div>`
  let sequence = 0

  const fields = extensionAutofillFieldsDiscover(document, () => `field-${++sequence}`)

  expect(fields.map((field) => field.descriptor.kind)).toEqual(["username", "identityPostalCode"])
  expect(JSON.stringify(fields.map((field) => field.descriptor))).not.toContain("private-page-value")
  expect(JSON.stringify(fields.map((field) => field.descriptor))).not.toContain("90210")
})

test("field discovery follows composed visibility through shadow hosts", () => {
  domReset()
  const host = document.createElement("div")
  host.setAttribute("inert", "")
  document.body.append(host)
  host.attachShadow({ mode: "open" }).innerHTML = `<input autocomplete="cc-number">`

  expect(extensionAutofillFieldsDiscover(document, () => "field-1")).toHaveLength(0)
})
