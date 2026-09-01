import type { ExtensionCipher } from "../crypto/extensionCipherSchema.js"
import type { ExtensionAutofillFillValue } from "./extensionAutofillFillValueSchema.js"

/** Projects one explicitly selected cipher to the minimum ephemeral values needed by page insertion. */
export function extensionAutofillFillValuesCreate(cipher: ExtensionCipher): ExtensionAutofillFillValue[] {
  if (cipher.type === 1) {
    return extensionAutofillValuesCompact([
      ["username", cipher.login.username],
      ["currentPassword", cipher.viewPassword === false ? null : cipher.login.password],
    ])
  }
  if (cipher.type === 3) {
    return extensionAutofillValuesCompact([
      ["cardholderName", cipher.card.cardholderName],
      ["cardBrand", cipher.card.brand],
      ["cardNumber", cipher.viewPassword === false ? null : cipher.card.number],
      ["cardExpirationMonth", cipher.card.expMonth],
      ["cardExpirationYear", cipher.card.expYear],
      ["cardExpirationDate", extensionAutofillExpirationCreate(cipher.card.expMonth, cipher.card.expYear)],
      ["cardSecurityCode", cipher.viewPassword === false ? null : cipher.card.code],
    ])
  }
  if (cipher.type === 4) {
    const fullName = [
      cipher.identity.title,
      cipher.identity.firstName,
      cipher.identity.middleName,
      cipher.identity.lastName,
    ]
      .filter((value): value is string => value !== null && value !== undefined && value.trim() !== "")
      .join(" ")
    return extensionAutofillValuesCompact([
      ["identityFullName", fullName || null],
      ["identityTitle", cipher.identity.title],
      ["identityGivenName", cipher.identity.firstName],
      ["identityMiddleName", cipher.identity.middleName],
      ["identityFamilyName", cipher.identity.lastName],
      ["identityEmail", cipher.identity.email],
      ["identityPhone", cipher.identity.phone],
      ["identityCompany", cipher.identity.company],
      ["identityAddressLine1", cipher.identity.address1],
      ["identityAddressLine2", cipher.identity.address2],
      ["identityAddressLine3", cipher.identity.address3],
      ["identityCity", cipher.identity.city],
      ["identityState", cipher.identity.state],
      ["identityPostalCode", cipher.identity.postalCode],
      ["identityCountry", cipher.identity.country],
      ["identitySocialSecurityNumber", cipher.viewPassword === false ? null : cipher.identity.ssn],
      ["identityPassportNumber", cipher.viewPassword === false ? null : cipher.identity.passportNumber],
      ["identityLicenseNumber", cipher.viewPassword === false ? null : cipher.identity.licenseNumber],
    ])
  }
  return []
}

function extensionAutofillValuesCompact(
  entries: Array<[ExtensionAutofillFillValue["kind"], string | null | undefined]>,
): ExtensionAutofillFillValue[] {
  return entries.flatMap(([kind, value]) =>
    value === null || value === undefined || value === "" ? [] : [{ kind, value }],
  )
}

function extensionAutofillExpirationCreate(
  month: string | null | undefined,
  year: string | null | undefined,
): string | null {
  if (month === null || month === undefined || year === null || year === undefined) return null
  return `${month.padStart(2, "0")}/${year.length === 4 ? year.slice(-2) : year}`
}
