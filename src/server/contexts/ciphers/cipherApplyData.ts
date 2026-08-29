import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { folderFindByUuidAndUser } from "../folders/folderFindByUuidAndUser.js"
import { organizationPolicyIsApplicableToUser } from "../organizations/organizationPolicyIsApplicableToUser.js"
import { organizationPolicyType } from "../organizations/organizationPolicyType.js"
import type { Cipher } from "./cipher.js"
import { cipherArchiveSet } from "./cipherArchiveSet.js"
import { cipherDataPrepare } from "./cipherDataPrepare.js"
import type { CipherData } from "./cipherDataSchema.js"
import { cipherErrorCreate } from "./cipherErrorCreate.js"
import { cipherFavoriteSet } from "./cipherFavoriteSet.js"
import { cipherFolderSet } from "./cipherFolderSet.js"
import { cipherRevisionUpdate } from "./cipherRevisionUpdate.js"
import { cipherSave } from "./cipherSave.js"

type CipherApplyDataOptions = {
  groupsEnabled?: boolean
  revisionDate?: string
  transaction?: boolean
  updateRevision?: boolean
}

function cipherDateNormalize(value: string): string | undefined {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return undefined
  return new Date(timestamp).toISOString()
}

export function cipherApplyData(
  cipher: Cipher,
  database: DatabaseConnection,
  userUuid: string,
  data: CipherData,
  clock: Clock,
  options: CipherApplyDataOptions = {},
): Result<Cipher> {
  const preparedResult = cipherDataPrepare(data)
  if (!preparedResult.success) return preparedResult
  const prepared = preparedResult.data
  if (prepared.organizationUuid === null) {
    const personalOwnershipResult = organizationPolicyIsApplicableToUser(
      database,
      userUuid,
      organizationPolicyType.personalOwnership,
    )
    if (!personalOwnershipResult.success) return personalOwnershipResult
    if (personalOwnershipResult.data)
      return cipherErrorCreate(
        "cipherApplyData",
        "Due to an Enterprise Policy, you are restricted from saving items to your personal vault.",
      )
  }
  if (prepared.folderUuid !== null) {
    const folderResult = folderFindByUuidAndUser(database, prepared.folderUuid, userUuid)
    if (!folderResult.success) return folderResult
    if (folderResult.data === null)
      return cipherErrorCreate("cipherApplyData", "Invalid folder", "Folder does not exist or belongs to another user")
  }

  const now = options.revisionDate ?? clock.now().toISOString()
  const nextCipher = {
    ...cipher,
    data: prepared.data,
    fields: prepared.fields,
    key: prepared.key,
    name: prepared.name,
    notes: prepared.notes,
    passwordHistory: prepared.passwordHistory,
    reprompt: prepared.reprompt,
    organizationUuid: prepared.organizationUuid,
    updatedAt: now,
    userUuid: prepared.organizationUuid === null ? userUuid : null,
  }
  const persist = () => {
    if (options.updateRevision !== false) {
      const revisionResult = cipherRevisionUpdate(database, nextCipher, now, options.groupsEnabled, userUuid)
      if (!revisionResult.success) return revisionResult
    }
    const saveResult = cipherSave(database, nextCipher)
    if (!saveResult.success) return saveResult
    const folderResult = cipherFolderSet(database, nextCipher.uuid, prepared.folderUuid)
    if (!folderResult.success) return folderResult
    const favoriteResult = cipherFavoriteSet(database, nextCipher.uuid, userUuid, prepared.favorite, now)
    if (!favoriteResult.success) return favoriteResult
    const archivedAt =
      prepared.archivedDate === null || prepared.archivedDate === undefined
        ? undefined
        : cipherDateNormalize(prepared.archivedDate)
    if (archivedAt !== undefined) {
      const archiveResult = cipherArchiveSet(database, nextCipher.uuid, userUuid, archivedAt, now)
      if (!archiveResult.success) return archiveResult
    }
    return resultCreate(nextCipher)
  }
  return options.transaction === false ? persist() : databaseTransaction(database, persist)
}
