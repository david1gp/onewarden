import type { ExtensionAutofillFieldKind } from "./extensionAutofillFieldKindSchema.js"

type AutofillControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLElement

const autocompleteKinds: Readonly<Record<string, ExtensionAutofillFieldKind>> = {
  username: "username",
  "current-password": "currentPassword",
  "new-password": "newPassword",
  "one-time-code": "totp",
  "cc-name": "cardholderName",
  "cc-given-name": "cardholderName",
  "cc-additional-name": "cardholderName",
  "cc-family-name": "cardholderName",
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
  "tel-country-code": "identityPhone",
  "tel-national": "identityPhone",
  "tel-area-code": "identityPhone",
  "tel-local": "identityPhone",
  "tel-local-prefix": "identityPhone",
  "tel-local-suffix": "identityPhone",
  "tel-extension": "identityPhone",
  organization: "identityCompany",
  "address-line1": "identityAddressLine1",
  "address-line2": "identityAddressLine2",
  "address-line3": "identityAddressLine3",
  "street-address": "identityAddressLine1",
  "address-level2": "identityCity",
  "address-level1": "identityState",
  "postal-code": "identityPostalCode",
  country: "identityCountry",
  "country-name": "identityCountry",
}

/** Classifies a control from semantic attributes and labels without reading its value. */
export function extensionAutofillFieldClassify(control: AutofillControl): ExtensionAutofillFieldKind {
  const autocomplete = control.getAttribute("autocomplete")?.toLowerCase().trim().split(/\s+/).at(-1) ?? ""
  const autocompleteKind = autocompleteKinds[autocomplete]
  if (autocompleteKind === "identityEmail" && extensionAutofillLoginContextCheck(control)) return "username"
  if (autocompleteKind !== undefined) return autocompleteKind

  const input = control instanceof HTMLInputElement ? control : null
  const hint = extensionAutofillFieldHintRead(control)
  if (input?.type === "password") {
    if (/confirm|confirmation|repeat|retype|verify/.test(hint)) return "confirmationPassword"
    if (/new|create|choose/.test(hint)) return "newPassword"
    return "currentPassword"
  }
  if (/one.?time|otp|totp|2fa|two.?factor|auth(?:entication)?.?code|verification.?code/.test(hint)) return "totp"
  if (/card.?holder|name.?on.?card/.test(hint)) return "cardholderName"
  if (/card.?type|card.?brand/.test(hint)) return "cardBrand"
  if (/card.?number|credit.?card|pan\b/.test(hint)) return "cardNumber"
  if (/(?:cvv|cvc|csc|security.?code)/.test(hint)) return "cardSecurityCode"
  if (/expir(?:y|ation).?month|exp.?month/.test(hint)) return "cardExpirationMonth"
  if (/expir(?:y|ation).?year|exp.?year/.test(hint)) return "cardExpirationYear"
  if (/expir(?:y|ation)|exp.?date/.test(hint)) return "cardExpirationDate"

  const loginContext = extensionAutofillLoginContextCheck(control)
  if (/user.?name|login|account.?name|user.?id/.test(hint)) return "username"
  if ((input?.type === "email" || /e.?mail/.test(hint)) && loginContext) return "username"
  if (input?.type === "email" || /e.?mail/.test(hint)) return "identityEmail"
  if (input?.type === "tel" || /phone|telephone|mobile/.test(hint)) return "identityPhone"
  if (/first|given/.test(hint) && /name/.test(hint)) return "identityGivenName"
  if (/middle|additional/.test(hint) && /name/.test(hint)) return "identityMiddleName"
  if (/last|family|surname/.test(hint) && /name/.test(hint)) return "identityFamilyName"
  if (/full.?name|contact.?name|your.?name/.test(hint)) return "identityFullName"
  if (/honorific|salutation|name.?prefix/.test(hint)) return "identityTitle"
  if (/company|organization|organisation/.test(hint)) return "identityCompany"
  if (/address.?3/.test(hint)) return "identityAddressLine3"
  if (/address.?2|suite|apartment|unit/.test(hint)) return "identityAddressLine2"
  if (/street|address.?1/.test(hint)) return "identityAddressLine1"
  if (/postal|zip/.test(hint)) return "identityPostalCode"
  if (/country/.test(hint)) return "identityCountry"
  if (/state|province|region/.test(hint)) return "identityState"
  if (/city|town/.test(hint)) return "identityCity"
  if (/social.?security|\bssn\b/.test(hint)) return "identitySocialSecurityNumber"
  if (/passport/.test(hint)) return "identityPassportNumber"
  if (/driver.?s?.?licen[cs]e|license.?number/.test(hint)) return "identityLicenseNumber"
  return "unknown"
}

function extensionAutofillFieldHintRead(control: AutofillControl): string {
  const labels =
    "labels" in control && control.labels ? Array.from(control.labels, (label) => label.textContent ?? "") : []
  const labelledBy = (control.getAttribute("aria-labelledby") ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => control.ownerDocument.getElementById(id)?.textContent ?? "")
  return [
    control.getAttribute("name"),
    control.id,
    control.getAttribute("placeholder"),
    control.getAttribute("aria-label"),
    ...labels,
    ...labelledBy,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
}

function extensionAutofillLoginContextCheck(control: AutofillControl): boolean {
  const scope = control.closest("form") ?? control.ownerDocument
  return scope.querySelector("input[type='password']") !== null
}
