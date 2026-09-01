import { expect, test } from "bun:test"
import { extensionAutofillCandidatesCreate } from "../../../src/extension/autofill/extensionAutofillCandidatesCreate.js"
import { extensionAutofillControlsFill } from "../../../src/extension/autofill/extensionAutofillControlsFill.js"
import { extensionCredentialCaptureRead } from "../../../src/extension/autofill/extensionCredentialCaptureRead.js"
import { extensionCredentialPromptMount } from "../../../src/extension/autofill/extensionCredentialPromptMount.js"
import type { ExtensionPersonalLoginCipher } from "../../../src/extension/crypto/extensionPersonalLoginCipherSchema.js"
import { totpCodeFreshCreate } from "../../../src/shared/totp/totpCodeFreshCreate.js"

const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"

function loginCreate(totp: string | null): ExtensionPersonalLoginCipher {
  return {
    object: "cipher",
    id: `login-${totp ?? "none"}`,
    type: 1,
    revisionDate: "2026-09-01T00:00:00.000Z",
    deletedDate: null,
    name: "Example",
    notes: null,
    fields: [],
    login: { username: "person@example.test", password: "secret", uris: [{ uri: "https://example.test" }], totp },
  }
}

test("fresh TOTP generation retries when Web Crypto crosses a time step", async () => {
  const times = [29.9, 30.1, 30.1, 30.1]
  const result = await totpCodeFreshCreate(secret, () => times.shift() ?? 30.1)
  expect(result).toEqual({ success: true, data: "287082" })
})

test("TOTP candidates require a matching login with a readable seed", () => {
  const candidates = extensionAutofillCandidatesCreate(
    [loginCreate(null), loginCreate(secret), { ...loginCreate(secret), id: "hidden", viewPassword: false }],
    "https://example.test/two-factor",
    "totp",
  )
  expect(candidates.map((candidate) => candidate.id)).toEqual([`login-${secret}`])
})

test("TOTP fill is form-bounded and reports no-field fallback", () => {
  document.body.innerHTML = `<form id="one"><input autocomplete="one-time-code"></form><form id="two"><input autocomplete="one-time-code"></form>`
  const one = document.querySelector("#one input") as HTMLInputElement
  const two = document.querySelector("#two input") as HTMLInputElement
  const fields = new Map([
    ["one", one],
    ["two", two],
  ])
  const kinds = new Map([
    ["one", "totp" as const],
    ["two", "totp" as const],
  ])
  expect(extensionAutofillControlsFill(fields, kinds, "one", [{ kind: "totp", value: "123456" }])).toBe(1)
  expect(one.value).toBe("123456")
  expect(two.value).toBe("")
  one.remove()
  expect(extensionAutofillControlsFill(fields, kinds, "one", [{ kind: "totp", value: "654321" }])).toBe(0)
})

test("submitted OTP values are never captured as authenticator seeds", () => {
  document.body.innerHTML = `<form><input autocomplete="username" value="person@example.test"><input type="password" value="secret"><input autocomplete="one-time-code" value="123456"></form>`
  const controls = [...document.querySelectorAll("input")]
  const captured = extensionCredentialCaptureRead({
    fields: new Map(controls.map((control, index) => [`field-${index}`, control])),
    fieldKinds: new Map([
      ["field-0", "username"],
      ["field-1", "currentPassword"],
      ["field-2", "totp"],
    ]),
    fieldFormIds: new Map(controls.map((_control, index) => [`field-${index}`, "form"])),
    formId: "form",
  })
  expect(captured).toEqual({ username: "person@example.test", password: "secret" })
  expect(JSON.stringify(captured)).not.toContain("123456")
})

test("credential prompt accepts a seed only through explicit manual entry", () => {
  const attachShadow = HTMLElement.prototype.attachShadow
  HTMLElement.prototype.attachShadow = function () {
    return attachShadow.call(this, { mode: "open" })
  }
  let submitted: { decision: string; totp: string | null } | null = null
  try {
    extensionCredentialPromptMount({
      document,
      prompt: { id: "prompt", kind: "add", site: "example.test", risk: null },
      onDecision: (decision, totp) => (submitted = { decision, totp }),
    })
    const shadow = (document.querySelector("[data-onewarden-autofill='credential-prompt']") as HTMLElement).shadowRoot
    const input = shadow?.querySelector("input") as HTMLInputElement
    input.value = secret
    ;(shadow?.querySelector("button") as HTMLButtonElement).click()
    expect(submitted).toEqual({ decision: "accept", totp: secret })
    expect(shadow?.textContent).toContain("never enter a one-time code")
  } finally {
    HTMLElement.prototype.attachShadow = attachShadow
    document.body.replaceChildren()
  }
})
