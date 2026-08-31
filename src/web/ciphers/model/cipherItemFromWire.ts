import * as v from "valibot"
import { bitwardenFido2CredentialSchema } from "../../../shared/api/bitwardenFido2CredentialSchema.js"
import { type CipherItem, cipherItemSchema } from "../schemas/cipherItemSchema.js"
import { type CipherType, cipherTypeSchema } from "../schemas/cipherTypeSchema.js"
import { cipherPasswordStrengthCalculate } from "./cipherPasswordStrengthCalculate.js"

export function cipherItemFromWire(wire: Record<string, unknown>): CipherItem {
  const typeResult = v.safeParse(cipherTypeSchema, wire.type)
  const type: CipherType = typeResult.success ? typeResult.output : 1

  const fieldsRaw = Array.isArray(wire.fields) ? wire.fields : []
  const fields = fieldsRaw.map((f: any) => ({
    name: typeof f.name === "string" ? f.name : (f.label ?? ""),
    value: typeof f.value === "string" ? f.value : "",
    type: typeof f.type === "number" && f.type >= 0 && f.type <= 3 ? (f.type as 0 | 1 | 2 | 3) : 0,
    linkedId: typeof f.linkedId === "number" ? f.linkedId : undefined,
  }))

  const rawLogin = wire.login as Record<string, unknown> | null | undefined
  const fido2CredentialsResult = v.safeParse(
    v.nullable(v.array(bitwardenFido2CredentialSchema)),
    rawLogin?.fido2Credentials,
  )
  const login = rawLogin
    ? {
        username: typeof rawLogin.username === "string" ? rawLogin.username : null,
        password: typeof rawLogin.password === "string" ? rawLogin.password : null,
        totp: typeof rawLogin.totp === "string" ? rawLogin.totp : null,
        uris: Array.isArray(rawLogin.uris)
          ? rawLogin.uris.map((u: any) => ({
              uri: typeof u.uri === "string" ? u.uri : "",
              match: typeof u.match === "number" ? u.match : null,
            }))
          : typeof rawLogin.uri === "string"
            ? [{ uri: rawLogin.uri, match: null }]
            : null,
        passwordRevisionDate: typeof rawLogin.passwordRevisionDate === "string" ? rawLogin.passwordRevisionDate : null,
        ...(fido2CredentialsResult.success ? { fido2Credentials: fido2CredentialsResult.output } : {}),
      }
    : null

  const rawCard = wire.card as Record<string, unknown> | null | undefined
  const card = rawCard
    ? {
        cardholderName: typeof rawCard.cardholderName === "string" ? rawCard.cardholderName : null,
        brand: typeof rawCard.brand === "string" ? rawCard.brand : null,
        number: typeof rawCard.number === "string" ? rawCard.number : null,
        expMonth: typeof rawCard.expMonth === "string" ? rawCard.expMonth : null,
        expYear: typeof rawCard.expYear === "string" ? rawCard.expYear : null,
        code: typeof rawCard.code === "string" ? rawCard.code : null,
      }
    : null

  const rawIdentity = wire.identity as Record<string, unknown> | null | undefined
  const identity = rawIdentity
    ? {
        title: typeof rawIdentity.title === "string" ? rawIdentity.title : null,
        firstName: typeof rawIdentity.firstName === "string" ? rawIdentity.firstName : null,
        middleName: typeof rawIdentity.middleName === "string" ? rawIdentity.middleName : null,
        lastName: typeof rawIdentity.lastName === "string" ? rawIdentity.lastName : null,
        address1: typeof rawIdentity.address1 === "string" ? rawIdentity.address1 : null,
        address2: typeof rawIdentity.address2 === "string" ? rawIdentity.address2 : null,
        address3: typeof rawIdentity.address3 === "string" ? rawIdentity.address3 : null,
        city: typeof rawIdentity.city === "string" ? rawIdentity.city : null,
        state: typeof rawIdentity.state === "string" ? rawIdentity.state : null,
        postalCode: typeof rawIdentity.postalCode === "string" ? rawIdentity.postalCode : null,
        country: typeof rawIdentity.country === "string" ? rawIdentity.country : null,
        company: typeof rawIdentity.company === "string" ? rawIdentity.company : null,
        email: typeof rawIdentity.email === "string" ? rawIdentity.email : null,
        phone: typeof rawIdentity.phone === "string" ? rawIdentity.phone : null,
        ssn: typeof rawIdentity.ssn === "string" ? rawIdentity.ssn : null,
        username: typeof rawIdentity.username === "string" ? rawIdentity.username : null,
        passportNumber: typeof rawIdentity.passportNumber === "string" ? rawIdentity.passportNumber : null,
        licenseNumber: typeof rawIdentity.licenseNumber === "string" ? rawIdentity.licenseNumber : null,
      }
    : null

  const rawSecureNote = wire.secureNote as Record<string, unknown> | null | undefined
  const secureNote = rawSecureNote
    ? {
        type: typeof rawSecureNote.type === "number" ? rawSecureNote.type : 0,
      }
    : null

  const rawAttachments = Array.isArray(wire.attachments) ? wire.attachments : []
  const attachments = rawAttachments.map((a: any) => ({
    id: typeof a.id === "string" ? a.id : "",
    fileName: typeof a.fileName === "string" ? a.fileName : "",
    key: typeof a.key === "string" ? a.key : null,
    size: typeof a.size === "string" || typeof a.size === "number" ? String(a.size) : null,
    sizeName: typeof a.sizeName === "string" ? a.sizeName : null,
    url: typeof a.url === "string" ? a.url : null,
  }))

  const rawPasswordHistory = Array.isArray(wire.passwordHistory) ? wire.passwordHistory : []
  const passwordHistory = rawPasswordHistory
    .filter((h: any) => typeof h?.password === "string")
    .map((h: any) => ({
      password: h.password,
      lastUsedDate: typeof h.lastUsedDate === "string" ? h.lastUsedDate : "1970-01-01T00:00:00.000000Z",
    }))

  const collectionIds = Array.isArray(wire.collectionIds)
    ? wire.collectionIds.filter((c: any) => typeof c === "string")
    : null

  const rawPermissions = wire.permissions as Record<string, unknown> | null | undefined
  const permissions = rawPermissions
    ? {
        delete: typeof rawPermissions.delete === "boolean" ? rawPermissions.delete : null,
        restore: typeof rawPermissions.restore === "boolean" ? rawPermissions.restore : null,
      }
    : null

  const password = login?.password
  const strength = password ? cipherPasswordStrengthCalculate(password) : null

  const parsed = v.safeParse(cipherItemSchema, {
    id: typeof wire.id === "string" ? wire.id : "",
    type,
    name: typeof wire.name === "string" ? wire.name : "",
    notes: typeof wire.notes === "string" ? wire.notes : null,
    favorite: wire.favorite === true,
    folderId: typeof wire.folderId === "string" ? wire.folderId : null,
    folderName: typeof wire.folderName === "string" ? wire.folderName : null,
    organizationId: typeof wire.organizationId === "string" ? wire.organizationId : null,
    collectionIds,
    reprompt: typeof wire.reprompt === "number" ? wire.reprompt : 0,
    fields,
    attachments: attachments.length > 0 ? attachments : null,
    passwordHistory: passwordHistory.length > 0 ? passwordHistory : null,
    login,
    secureNote,
    card,
    identity,
    creationDate: typeof wire.creationDate === "string" ? wire.creationDate : null,
    revisionDate: typeof wire.revisionDate === "string" ? wire.revisionDate : null,
    deletedDate: typeof wire.deletedDate === "string" ? wire.deletedDate : null,
    archivedDate: typeof wire.archivedDate === "string" ? wire.archivedDate : null,
    viewPassword: wire.viewPassword !== false,
    edit: wire.edit !== false,
    permissions,
    passwordStrength: strength,
  })

  if (parsed.success) {
    return parsed.output
  }

  return {
    id: typeof wire.id === "string" ? wire.id : "",
    type,
    name: typeof wire.name === "string" ? wire.name : "",
    notes: typeof wire.notes === "string" ? wire.notes : null,
    favorite: wire.favorite === true,
    folderId: typeof wire.folderId === "string" ? wire.folderId : null,
    folderName: null,
    organizationId: null,
    collectionIds: null,
    reprompt: 0,
    fields: [],
    attachments: null,
    passwordHistory: null,
    login: null,
    secureNote: null,
    card: null,
    identity: null,
    creationDate: null,
    revisionDate: null,
    deletedDate: null,
    archivedDate: null,
    viewPassword: false,
    edit: false,
    permissions: { delete: false, restore: false },
    passwordStrength: null,
  }
}
