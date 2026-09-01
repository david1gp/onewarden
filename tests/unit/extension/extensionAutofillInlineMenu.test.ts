import { expect, test } from "bun:test"
import { extensionAutofillInlineMenuMount } from "../../../src/extension/autofill/extensionAutofillInlineMenuMount.js"

test("inline menu uses a closed protected mount and cleans up without leaking field values", () => {
  document.documentElement.innerHTML = `<head></head><body><input value="never-copy-me"></body>`
  const field = document.querySelector("input") as HTMLInputElement
  const dismissals: string[] = []

  const menu = extensionAutofillInlineMenuMount({
    document,
    field,
    fieldId: "field-1",
    onDismiss: (reason) => dismissals.push(reason),
  })
  const host = document.querySelector("[data-onewarden-autofill='menu']") as HTMLElement

  expect(host).not.toBeNull()
  expect(host.shadowRoot).toBeNull()
  expect(host.style.getPropertyValue("z-index")).toBe("2147483647")
  expect(host.outerHTML).not.toContain("never-copy-me")

  const escapeEvent = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })
  expect(document.dispatchEvent(escapeEvent)).toBe(true)
  menu.dismiss("stopped")
  expect(document.querySelector("[data-onewarden-autofill='menu']")).toBeNull()
  expect(dismissals).toEqual(["escape"])
})
