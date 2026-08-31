import type { VaultItem } from "../../demo/vaultItemSchema.js"
import type { CipherCustomField } from "../schemas/cipherCustomFieldSchema.js"
import type { CipherItem } from "../schemas/cipherItemSchema.js"
import { cipherCategoryToType } from "./cipherCategoryToType.js"

export function cipherItemFromDemo(demo: VaultItem): CipherItem {
  const type = cipherCategoryToType(demo.category)

  const fields: CipherCustomField[] = (demo.customFields ?? []).map((f) => ({
    name: f.label,
    value: f.value,
    type: f.concealed ? (1 as const) : (0 as const),
    linkedId: undefined,
  }))

  const login =
    type === 1 || demo.username || demo.password || demo.totp || demo.url
      ? {
          username: demo.username ?? null,
          password: demo.password ?? null,
          totp: demo.totp ?? null,
          uris: demo.url ? [{ uri: demo.url, match: null }] : null,
          passwordRevisionDate: null,
        }
      : null

  let card = null
  if (type === 3) {
    const findField = (label: string) => demo.customFields?.find((f) => f.label.toLowerCase().includes(label))?.value
    card = {
      cardholderName: findField("cardholder") ?? null,
      brand: null,
      number: findField("card number") ?? null,
      expMonth: findField("expiration")?.split("/")[0] ?? null,
      expYear: findField("expiration")?.split("/")[1] ?? null,
      code: findField("security code") ?? findField("cvv") ?? null,
    }
  }

  let identity = null
  if (type === 4) {
    const findField = (label: string) => demo.customFields?.find((f) => f.label.toLowerCase().includes(label))?.value
    identity = {
      title: null,
      firstName: findField("full name") ?? null,
      middleName: null,
      lastName: null,
      address1: null,
      address2: null,
      address3: null,
      city: null,
      state: null,
      postalCode: null,
      country: findField("nationality") ?? null,
      company: null,
      email: findField("email") ?? null,
      phone: findField("phone") ?? null,
      ssn: null,
      username: null,
      passportNumber: findField("passport") ?? null,
      licenseNumber: null,
    }
  }

  return {
    id: demo.id,
    type,
    name: demo.title,
    notes: demo.notes ?? null,
    favorite: demo.favorite,
    folderId: demo.folderId,
    folderName: demo.folder ?? null,
    organizationId: demo.organizationId ?? null,
    collectionIds: demo.collectionIds ?? [],
    reprompt: 0,
    fields,
    passwordHistory: demo.passwordHistory ?? [],
    login,
    secureNote: type === 2 ? { type: 0 } : null,
    card,
    identity,
    creationDate: demo.createdAt,
    revisionDate: demo.updatedAt,
    deletedDate: demo.deletedDate ?? demo.deletedAt ?? null,
    archivedDate: demo.archivedDate ?? null,
    viewPassword: true,
    edit: true,
    passwordStrength: demo.passwordStrength ?? null,
  }
}
