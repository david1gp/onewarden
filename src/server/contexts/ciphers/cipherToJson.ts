import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Cipher } from "./cipher.js"
import { cipherArchiveFind } from "./cipherArchiveFind.js"
import { cipherFavoriteFind } from "./cipherFavoriteFind.js"
import { cipherFolderFindByUser } from "./cipherFolderFindByUser.js"
import { cipherPasswordHistoryNormalize } from "./cipherPasswordHistoryNormalize.js"

function jsonObjectParse(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value)
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function jsonArrayParse(value: string | null): unknown[] {
  if (value === null) return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function cipherToJson(
  database: DatabaseConnection,
  cipher: Cipher,
  userUuid: string,
): Result<Record<string, unknown>> {
  const folderResult = cipherFolderFindByUser(database, cipher.uuid, userUuid)
  if (!folderResult.success) return folderResult
  const favoriteResult = cipherFavoriteFind(database, cipher.uuid, userUuid)
  if (!favoriteResult.success) return favoriteResult
  const archiveResult = cipherArchiveFind(database, cipher.uuid, userUuid)
  if (!archiveResult.success) return archiveResult

  const typeData = jsonObjectParse(cipher.data)
  const typeKey =
    cipher.type === 1
      ? "login"
      : cipher.type === 2
        ? "secureNote"
        : cipher.type === 3
          ? "card"
          : cipher.type === 4
            ? "identity"
            : cipher.type === 5
              ? "sshKey"
              : undefined
  if (typeKey === undefined) return resultErrorCreate("cipherToJson", "Cipher has an invalid type.")

  const result: Record<string, unknown> = {
    object: "cipherDetails",
    id: cipher.uuid,
    type: cipher.type,
    creationDate: cipher.createdAt,
    revisionDate: cipher.updatedAt,
    deletedDate: cipher.deletedAt,
    reprompt: cipher.reprompt === 0 || cipher.reprompt === 1 ? cipher.reprompt : 0,
    organizationId: cipher.organizationUuid,
    key: cipher.key,
    attachments: null,
    organizationUseTotp: true,
    collectionIds: [],
    name: cipher.name,
    notes: cipher.notes,
    fields: jsonArrayParse(cipher.fields),
    passwordHistory: cipherPasswordHistoryNormalize(cipher.passwordHistory),
    login: null,
    secureNote: null,
    card: null,
    identity: null,
    sshKey: null,
    bankAccount: null,
    driversLicense: null,
    passport: null,
    folderId: folderResult.data,
    favorite: favoriteResult.data,
    archivedDate: archiveResult.data,
    edit: true,
    viewPassword: true,
    permissions: { delete: true, restore: true },
  }
  result[typeKey] = typeData
  return resultCreate(result)
}
