import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { organizationCollectionFindByUuidAndOrganization } from "../organizations/organizationCollectionFindByUuidAndOrganization.js"
import { organizationCollectionWritableByUser } from "../organizations/organizationCollectionWritableByUser.js"
import { organizationMembershipFindByUserAndOrganization } from "../organizations/organizationMembershipFindByUserAndOrganization.js"
import { organizationMembershipStatus } from "../organizations/organizationMembershipStatus.js"
import { cipherApplyData } from "./cipherApplyData.js"
import { cipherAccessFindByUser } from "./cipherAccessFindByUser.js"
import type { Cipher } from "./cipher.js"
import type { CipherData } from "./cipherDataSchema.js"
import { cipherCollectionLinkSave } from "./cipherCollectionLinkSave.js"
import { cipherErrorCreate } from "./cipherErrorCreate.js"
import { cipherFindByUuid } from "./cipherFindByUuid.js"
import { cipherRevisionUpdate } from "./cipherRevisionUpdate.js"

function cipherRevisionIsStale(cipher: Cipher, revisionDate: string | null | undefined): boolean {
  if (revisionDate === undefined || revisionDate === null) return false
  const clientTimestamp = Date.parse(revisionDate)
  const serverTimestamp = Date.parse(cipher.updatedAt)
  if (!Number.isFinite(clientTimestamp) || !Number.isFinite(serverTimestamp)) return false
  return serverTimestamp - clientTimestamp > 1000
}

type CipherShareOptions = {
  checkRevision?: boolean
  revisionDate?: string
  transaction?: boolean
}

export function cipherShare(
  database: DatabaseConnection,
  cipherUuid: string,
  userUuid: string,
  data: CipherData,
  collectionIds: readonly string[],
  clock: Clock,
  groupsEnabled = false,
  options: CipherShareOptions = {},
): Result<Cipher> {
  const cipherResult = cipherFindByUuid(database, cipherUuid)
  if (!cipherResult.success) return cipherResult
  if (cipherResult.data === null) return cipherErrorCreate("cipherShare", "Cipher doesn't exist")
  const cipher = cipherResult.data

  const accessResult = cipherAccessFindByUser(database, cipher, userUuid, groupsEnabled)
  if (!accessResult.success) return accessResult
  if (accessResult.data === null || (accessResult.data.readOnly && !accessResult.data.manage))
    return cipherErrorCreate("cipherShare", "Cipher is not write accessible")
  if (options.checkRevision !== false && cipherRevisionIsStale(cipher, data.lastKnownRevisionDate))
    return cipherErrorCreate(
      "cipherShare",
      "The client copy of this cipher is out of date. Resync the client and try again.",
    )

  const organizationUuid = data.organizationId ?? data.organizationID ?? null
  if (cipher.organizationUuid !== null && cipher.organizationUuid !== organizationUuid)
    return cipherErrorCreate(
      "cipherShare",
      "Organization mismatch. Please resync the client before updating the cipher",
    )

  const targetCollectionIds = [...new Set(collectionIds)]
  if (organizationUuid !== null) {
    const membershipResult = organizationMembershipFindByUserAndOrganization(database, userUuid, organizationUuid)
    if (!membershipResult.success) return membershipResult
    const membership = membershipResult.data
    if (membership === null || membership.status !== organizationMembershipStatus.confirmed)
      return cipherErrorCreate("cipherShare", "You don't have permission to add item to organization")
    for (const collectionUuid of targetCollectionIds) {
      const collectionResult = organizationCollectionFindByUuidAndOrganization(
        database,
        collectionUuid,
        organizationUuid,
      )
      if (!collectionResult.success) return collectionResult
      if (collectionResult.data === null) return cipherErrorCreate("cipherShare", "Invalid collection ID provided")
      const writableResult = organizationCollectionWritableByUser(
        database,
        collectionUuid,
        userUuid,
        organizationUuid,
        groupsEnabled,
      )
      if (!writableResult.success) return writableResult
      if (!writableResult.data) return cipherErrorCreate("cipherShare", "No rights to modify the collection")
    }
  }

  const revisionDate = options.revisionDate ?? clock.now().toISOString()
  const persist = () => {
    const applyResult = cipherApplyData(cipher, database, userUuid, data, clock, {
      groupsEnabled,
      revisionDate,
      transaction: false,
      updateRevision: false,
    })
    if (!applyResult.success) return applyResult
    if (organizationUuid !== null) {
      for (const collectionUuid of targetCollectionIds) {
        const linkResult = cipherCollectionLinkSave(database, cipherUuid, collectionUuid)
        if (!linkResult.success) return linkResult
      }
    }
    const revisionResult = cipherRevisionUpdate(database, applyResult.data, revisionDate, groupsEnabled, userUuid)
    if (!revisionResult.success) return revisionResult
    return applyResult
  }
  return options.transaction === false ? persist() : databaseTransaction(database, persist)
}
