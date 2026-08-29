import type { CipherFormData } from "../schemas/cipherFormDataSchema.js"
import type { CipherItem } from "../schemas/cipherItemSchema.js"

export function cipherItemToWire(item: CipherFormData | CipherItem): Record<string, unknown> {
  const fields = item.fields.map((f) => ({
    name: f.name,
    value: f.value,
    type: f.type,
    linkedId: f.linkedId ?? null,
  }))

  const base: Record<string, unknown> = {
    type: item.type,
    name: "name" in item ? item.name : "",
    notes: item.notes ?? null,
    favorite: item.favorite ?? false,
    folderId: item.folderId ?? null,
    fields,
    reprompt: "reprompt" in item && typeof item.reprompt === "number" ? item.reprompt : 0,
  }

  if ("organizationId" in item) {
    base.organizationId = item.organizationId ?? null
  }

  if (item.type === 1) {
    if ("username" in item) {
      const uris = "uris" in item && Array.isArray(item.uris) ? item.uris : undefined
      base.login = {
        username: item.username || null,
        password: item.password || null,
        totp: item.totp || null,
        uris:
          uris?.map((entry) => ({ uri: entry.uri, match: entry.match ?? null })) ??
          (item.uri ? [{ uri: item.uri, match: null }] : []),
      }
    } else if ("login" in item && item.login) {
      base.login = item.login
    } else {
      base.login = { username: null, password: null, totp: null, uris: [] }
    }
  } else if (item.type === 2) {
    base.secureNote = { type: 0 }
  } else if (item.type === 3) {
    if ("number" in item) {
      base.card = {
        cardholderName: item.cardholderName || null,
        brand: item.brand || null,
        number: item.number || null,
        expMonth: item.expMonth || null,
        expYear: item.expYear || null,
        code: item.code || null,
      }
    } else if ("card" in item && item.card) {
      base.card = item.card
    } else {
      base.card = {}
    }
  } else if (item.type === 4) {
    if ("firstName" in item) {
      base.identity = {
        title: item.title || null,
        firstName: item.firstName || null,
        middleName: item.middleName || null,
        lastName: item.lastName || null,
        company: item.company || null,
        email: item.email || null,
        phone: item.phone || null,
        address1: item.address1 || null,
        address2: item.address2 || null,
        address3: item.address3 || null,
        city: item.city || null,
        state: item.state || null,
        postalCode: item.postalCode || null,
        country: item.country || null,
        ssn: item.ssn || null,
        passportNumber: item.passportNumber || null,
        licenseNumber: item.licenseNumber || null,
        username: item.username || null,
      }
    } else if ("identity" in item && item.identity) {
      base.identity = item.identity
    } else {
      base.identity = {}
    }
  }

  return base
}
