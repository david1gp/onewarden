import type { Result } from "#result"
import type { ExtensionAutofillFillValue } from "../autofill/extensionAutofillFillValueSchema.js"
import type { ExtensionCipherFillData } from "./extensionCipherFillDataSchema.js"

/** One-shot manual card/identity fill serialized into the active page. */
export function extensionCipherFillInjected(values: ExtensionAutofillFillValue[]): Result<ExtensionCipherFillData> {
  function error(message: string): Result<ExtensionCipherFillData> {
    return { success: false, op: "extensionCipherFillInjected", errorMessage: message }
  }
  function kindRead(control: HTMLElement): string {
    const autocomplete = (control.getAttribute("autocomplete") ?? "").trim().toLowerCase().split(/\s+/).at(-1) ?? ""
    const autocompleteKinds: Record<string, string> = {
      "cc-name": "cardholderName",
      "cc-type": "cardBrand",
      "cc-number": "cardNumber",
      "cc-exp-month": "cardExpirationMonth",
      "cc-exp-year": "cardExpirationYear",
      "cc-exp": "cardExpirationDate",
      "cc-csc": "cardSecurityCode",
      name: "identityFullName",
      "honorific-prefix": "identityTitle",
      "given-name": "identityGivenName",
      "additional-name": "identityMiddleName",
      "family-name": "identityFamilyName",
      email: "identityEmail",
      tel: "identityPhone",
      organization: "identityCompany",
      "address-line1": "identityAddressLine1",
      "street-address": "identityAddressLine1",
      "address-line2": "identityAddressLine2",
      "address-line3": "identityAddressLine3",
      "address-level2": "identityCity",
      "address-level1": "identityState",
      "postal-code": "identityPostalCode",
      country: "identityCountry",
      "country-name": "identityCountry",
    }
    if (autocompleteKinds[autocomplete] !== undefined) return autocompleteKinds[autocomplete]
    const labels =
      (control instanceof HTMLInputElement ||
        control instanceof HTMLSelectElement ||
        control instanceof HTMLTextAreaElement) &&
      control.labels
        ? Array.from(control.labels, (label) => label.textContent ?? "")
        : []
    const hint = [
      control.id,
      control.getAttribute("name"),
      control.getAttribute("placeholder"),
      control.getAttribute("aria-label"),
      ...labels,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
    if (/card.?holder|name.?on.?card/.test(hint)) return "cardholderName"
    if (/card.?number|credit.?card|pan\b/.test(hint)) return "cardNumber"
    if (/cvv|cvc|csc|security.?code/.test(hint)) return "cardSecurityCode"
    if (/expir(?:y|ation).?month|exp.?month/.test(hint)) return "cardExpirationMonth"
    if (/expir(?:y|ation).?year|exp.?year/.test(hint)) return "cardExpirationYear"
    if (/first|given/.test(hint) && /name/.test(hint)) return "identityGivenName"
    if (/last|family|surname/.test(hint) && /name/.test(hint)) return "identityFamilyName"
    if (/e.?mail/.test(hint)) return "identityEmail"
    if (/phone|telephone|mobile/.test(hint)) return "identityPhone"
    if (/postal|zip/.test(hint)) return "identityPostalCode"
    if (/street|address.?1/.test(hint)) return "identityAddressLine1"
    if (/city|town/.test(hint)) return "identityCity"
    if (/state|province|region/.test(hint)) return "identityState"
    if (/country/.test(hint)) return "identityCountry"
    if (/company|organi[sz]ation/.test(hint)) return "identityCompany"
    if (/social.?security|\bssn\b/.test(hint)) return "identitySocialSecurityNumber"
    if (/passport/.test(hint)) return "identityPassportNumber"
    if (/licen[cs]e/.test(hint)) return "identityLicenseNumber"
    return "unknown"
  }
  function usable(control: HTMLElement): boolean {
    if (control.hidden || control.inert || control.getAttribute("aria-hidden") === "true") return false
    if ("disabled" in control && control.disabled === true) return false
    if ("readOnly" in control && control.readOnly === true) return false
    const style = window.getComputedStyle(control)
    return style.display !== "none" && style.visibility !== "hidden" && style.visibility !== "collapse"
  }
  function valueSet(control: HTMLElement, value: string): boolean {
    try {
      if (control instanceof HTMLInputElement) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
        if (setter === undefined) return false
        setter.call(control, value)
      } else if (control instanceof HTMLTextAreaElement) {
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set
        if (setter === undefined) return false
        setter.call(control, value)
      } else if (control instanceof HTMLSelectElement) {
        const option = Array.from(control.options).find(
          (entry) =>
            entry.value.toLowerCase() === value.toLowerCase() ||
            entry.text.trim().toLowerCase() === value.toLowerCase(),
        )
        if (option === undefined) return false
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set
        if (setter === undefined) return false
        setter.call(control, option.value)
      } else return false
      control.dispatchEvent(new Event("input", { bubbles: true, composed: true }))
      control.dispatchEvent(new Event("change", { bubbles: true, composed: true }))
      return true
    } catch {
      return false
    }
  }
  if (!Array.isArray(values) || values.length === 0) return error("No fillable values were provided.")
  const byKind = new Map<string, string>(values.map((entry) => [entry.kind, entry.value]))
  const roots: Array<Document | ShadowRoot> = [document]
  let filledCount = 0
  while (roots.length > 0) {
    const root = roots.shift()
    if (root === undefined) continue
    for (const element of root.querySelectorAll<HTMLElement>("input, select, textarea, *")) {
      if (element.shadowRoot !== null) roots.push(element.shadowRoot)
      if (
        !(
          element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement
        ) ||
        !usable(element)
      )
        continue
      const value = byKind.get(kindRead(element))
      if (value !== undefined && valueSet(element, value)) filledCount += 1
    }
  }
  const status = filledCount === 0 ? "noFields" : filledCount < values.length ? "partiallyFilled" : "filled"
  return { success: true, data: { status, filledCount, requestedCount: values.length } }
}
