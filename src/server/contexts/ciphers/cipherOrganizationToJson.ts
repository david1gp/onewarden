import type { KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { attachmentFindByCipher } from "../attachments/attachmentFindByCipher.js"
import { attachmentToJson } from "../attachments/attachmentToJson.js"
import type { Cipher } from "./cipher.js"
import { cipherCollectionIdsFindByOrganization } from "./cipherCollectionIdsFindByOrganization.js"
import { cipherPasswordHistoryNormalize } from "./cipherPasswordHistoryNormalize.js"

export function cipherOrganizationToJson(
  database: DatabaseConnection,
  cipher: Cipher,
  organizationUuid: string,
  options: { clock: Clock; origin: string; privateKey: KeyInput | undefined },
): Promise<Result<Record<string, unknown>>> {
  return cipherOrganizationJsonCreate(database, cipher, organizationUuid, options)
}

async function cipherOrganizationJsonCreate(
  database: DatabaseConnection,
  cipher: Cipher,
  organizationUuid: string,
  options: { clock: Clock; origin: string; privateKey: KeyInput | undefined },
): Promise<Result<Record<string, unknown>>> {
  const attachmentsResult = attachmentFindByCipher(database, cipher.uuid)
  if (!attachmentsResult.success) return attachmentsResult
  let attachments: unknown[] | null = null
  if (attachmentsResult.data.length > 0) {
    attachments = []
    for (const attachment of attachmentsResult.data) {
      const attachmentResult = await attachmentToJson(attachment, options)
      if (!attachmentResult.success) return attachmentResult
      attachments.push(attachmentResult.data)
    }
  }

  const collectionIdsResult = cipherCollectionIdsFindByOrganization(database, cipher.uuid, organizationUuid)
  if (!collectionIdsResult.success) return collectionIdsResult
  const typeKey = cipherOrganizationTypeKeyResolve(cipher.type)
  if (typeKey === undefined)
    return resultErrorCreate("cipherOrganizationToJson", `Cipher ${cipher.uuid} has an invalid type ${cipher.type}`, {
      code: "platform.invalid-request",
      statusCode: 400,
    })

  const result: Record<string, unknown> = {
    object: "cipherDetails",
    id: cipher.uuid,
    type: cipher.type,
    creationDate: cipherOrganizationDateFormat(cipher.createdAt),
    revisionDate: cipherOrganizationDateFormat(cipher.updatedAt),
    deletedDate: cipher.deletedAt === null ? null : cipherOrganizationDateFormat(cipher.deletedAt),
    reprompt: cipher.reprompt === 0 || cipher.reprompt === 1 ? cipher.reprompt : 0,
    organizationId: cipher.organizationUuid,
    key: cipher.key,
    attachments,
    organizationUseTotp: true,
    collectionIds: collectionIdsResult.data,
    name: cipher.name,
    notes: cipher.notes,
    fields: cipherOrganizationFieldsParse(cipher.fields),
    passwordHistory: cipherPasswordHistoryNormalize(cipher.passwordHistory),
    login: null,
    secureNote: null,
    card: null,
    identity: null,
    sshKey: null,
    bankAccount: null,
    driversLicense: null,
    passport: null,
  }
  result[typeKey] = cipherOrganizationTypeDataParse(cipher.type, cipher.data)
  return resultCreate(result)
}

function cipherOrganizationTypeKeyResolve(
  type: number,
): "login" | "secureNote" | "card" | "identity" | "sshKey" | "bankAccount" | "driversLicense" | "passport" | undefined {
  if (type === 1) return "login"
  if (type === 2) return "secureNote"
  if (type === 3) return "card"
  if (type === 4) return "identity"
  if (type === 5) return "sshKey"
  if (type === 6) return "bankAccount"
  if (type === 7) return "driversLicense"
  if (type === 8) return "passport"
  return undefined
}

function cipherOrganizationFieldsParse(value: string | null): unknown[] {
  if (value === null) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  return parsed.map((entry) => cipherOrganizationFieldNormalize(entry))
}

function cipherOrganizationFieldNormalize(value: unknown): unknown {
  const normalized = cipherOrganizationValueNormalize(value)
  if (!cipherOrganizationRecordIs(normalized)) return normalized
  const type = normalized.type
  if (typeof type === "number") return normalized
  if (typeof type === "string") {
    normalized.type = cipherOrganizationUnsignedByteParse(type) ?? 1
    return normalized
  }
  normalized.type = 1
  return normalized
}

function cipherOrganizationTypeDataParse(type: number, value: string): unknown {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    parsed = {}
  }
  const normalizedTypeData = cipherOrganizationRecordIs(parsed) ? cipherOrganizationValueNormalize(parsed) : {}
  const typeData = cipherOrganizationRecordIs(normalizedTypeData) ? normalizedTypeData : {}

  if (type === 1) {
    typeData.uri = null
    const uris = typeData.uris
    if (Array.isArray(uris) && uris.length > 0) {
      const normalizedUris = uris.map((uri) => cipherOrganizationLoginUriNormalize(uri))
      typeData.uris = normalizedUris
      const firstUri = normalizedUris[0]
      if (cipherOrganizationRecordIs(firstUri)) typeData.uri = firstUri.uri ?? null
    }
    if (typeof typeData.passwordRevisionDate === "string")
      typeData.passwordRevisionDate = cipherOrganizationDateNormalize(typeData.passwordRevisionDate)
  }
  if (type === 2 && (!Object.hasOwn(typeData, "type") || typeof typeData.type !== "number")) return { type: 0 }
  if (
    type === 5 &&
    (typeof typeData.keyFingerprint !== "string" ||
      typeData.keyFingerprint.length === 0 ||
      typeof typeData.privateKey !== "string" ||
      typeData.privateKey.length === 0 ||
      typeof typeData.publicKey !== "string" ||
      typeData.publicKey.length === 0)
  )
    return null
  return typeData
}

function cipherOrganizationLoginUriNormalize(value: unknown): unknown {
  if (!cipherOrganizationRecordIs(value)) return value
  const normalized = cipherOrganizationValueNormalize(value)
  if (!cipherOrganizationRecordIs(normalized)) return normalized
  if (typeof normalized.match === "string") {
    normalized.match = cipherOrganizationUnsignedByteParse(normalized.match)
  }
  return normalized
}

function cipherOrganizationDateNormalize(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/.exec(value)
  if (match === null || !cipherOrganizationDateIsValid(match[1] ?? "") || !Number.isFinite(Date.parse(value)))
    return "1970-01-01T00:00:00.000000Z"
  const fraction = match[2] ?? ""
  const normalizedFraction = fraction.slice(0, 6).padEnd(6, "0")
  return `${match[1]}.${normalizedFraction}${match[3]}`
}

function cipherOrganizationDateFormat(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/.exec(value)
  if (match === null || !cipherOrganizationDateIsValid(match[1] ?? "") || !Number.isFinite(Date.parse(value)))
    return value
  return `${match[1]}.${(match[2] ?? "").slice(0, 6).padEnd(6, "0")}Z`
}

function cipherOrganizationDateIsValid(value: string): boolean {
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(0, 0, 0, 0)
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function cipherOrganizationUnsignedByteParse(value: string): number | null {
  if (!/^\+?\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 255 ? parsed : null
}

function cipherOrganizationValueNormalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cipherOrganizationValueNormalize)
  if (!cipherOrganizationRecordIs(value)) return value
  const normalized: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value))
    normalized[cipherOrganizationKeyNormalize(key)] = cipherOrganizationValueNormalize(entry)
  return normalized
}

function cipherOrganizationKeyNormalize(key: string): string {
  if (key.toLowerCase() === "ssn") return "ssn"
  return key.length === 0 ? key : `${key[0]?.toLowerCase() ?? ""}${key.slice(1)}`
}

function cipherOrganizationRecordIs(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
