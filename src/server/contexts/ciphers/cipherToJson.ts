import type { KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { attachmentFindByCipher } from "../attachments/attachmentFindByCipher.js"
import { attachmentToJson } from "../attachments/attachmentToJson.js"
import type { Cipher } from "./cipher.js"
import { cipherAccessFindByUser } from "./cipherAccessFindByUser.js"
import { cipherArchiveFind } from "./cipherArchiveFind.js"
import { cipherCollectionIdsFindByUser } from "./cipherCollectionIdsFindByUser.js"
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
  options?: {
    adminCollections?: boolean
    clock: Clock
    groupsEnabled?: boolean
    origin: string
    privateKey: KeyInput | undefined
  },
  groupsEnabled = false,
): Promise<Result<Record<string, unknown>>> {
  return cipherToJsonAsync(database, cipher, userUuid, options, groupsEnabled)
}

async function cipherToJsonAsync(
  database: DatabaseConnection,
  cipher: Cipher,
  userUuid: string,
  options:
    | {
        adminCollections?: boolean
        clock: Clock
        groupsEnabled?: boolean
        origin: string
        privateKey: KeyInput | undefined
      }
    | undefined,
  groupsEnabled: boolean,
): Promise<Result<Record<string, unknown>>> {
  const accessResult = cipherAccessFindByUser(database, cipher, userUuid, options?.groupsEnabled ?? groupsEnabled)
  if (!accessResult.success) return accessResult
  const collectionIdsResult = cipherCollectionIdsFindByUser(
    database,
    cipher,
    userUuid,
    options?.groupsEnabled ?? groupsEnabled,
    options?.adminCollections,
  )
  if (!collectionIdsResult.success) return collectionIdsResult
  const folderResult = cipherFolderFindByUser(database, cipher.uuid, userUuid)
  if (!folderResult.success) return folderResult
  const favoriteResult = cipherFavoriteFind(database, cipher.uuid, userUuid)
  if (!favoriteResult.success) return favoriteResult
  const archiveResult = cipherArchiveFind(database, cipher.uuid, userUuid)
  if (!archiveResult.success) return archiveResult
  const attachmentsResult = attachmentFindByCipher(database, cipher.uuid)
  if (!attachmentsResult.success) return attachmentsResult
  let attachments: unknown[] | null = null
  if (attachmentsResult.data.length > 0) {
    if (options?.privateKey !== undefined) {
      attachments = []
      for (const attachment of attachmentsResult.data) {
        const attachmentResult = await attachmentToJson(attachment, options)
        if (!attachmentResult.success) return attachmentResult
        attachments.push(attachmentResult.data)
      }
    }
  }

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
  const access = accessResult.data ?? { hidePasswords: true, manage: false, readOnly: true }

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
    attachments,
    organizationUseTotp: true,
    collectionIds: collectionIdsResult.data,
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
    edit: !access.readOnly,
    viewPassword: !access.hidePasswords,
    permissions: { delete: !access.readOnly, restore: !access.readOnly },
  }
  result[typeKey] = typeData
  return resultCreate(result)
}
