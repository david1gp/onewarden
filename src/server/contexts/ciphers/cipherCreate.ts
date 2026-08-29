import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { organizationCollectionFindByUuidAndOrganization } from "../organizations/organizationCollectionFindByUuidAndOrganization.js"
import { organizationCollectionWritableByUser } from "../organizations/organizationCollectionWritableByUser.js"
import { organizationMembershipFindByUserAndOrganization } from "../organizations/organizationMembershipFindByUserAndOrganization.js"
import { organizationMembershipStatus } from "../organizations/organizationMembershipStatus.js"
import type { Cipher } from "./cipher.js"
import type { CipherData } from "./cipherDataSchema.js"
import { cipherApplyData } from "./cipherApplyData.js"
import { cipherCollectionLinkSave } from "./cipherCollectionLinkSave.js"
import { cipherErrorCreate } from "./cipherErrorCreate.js"
import { cipherRevisionUpdate } from "./cipherRevisionUpdate.js"
import { cipherSave } from "./cipherSave.js"

export function cipherCreate(
  database: DatabaseConnection,
  userUuid: string,
  data: CipherData,
  clock: Clock,
  identifier: Identifier,
  groupsEnabled = false,
  collectionIds: readonly string[] | undefined = undefined,
): Result<Cipher> {
  const organizationUuid = data.organizationId ?? data.organizationID ?? null
  const targetCollectionIds = [...new Set(collectionIds ?? [])]
  if (organizationUuid !== null) {
    const membershipResult = organizationMembershipFindByUserAndOrganization(database, userUuid, organizationUuid)
    if (!membershipResult.success) return membershipResult
    const membership = membershipResult.data
    if (membership === null || membership.status !== organizationMembershipStatus.confirmed)
      return cipherErrorCreate("cipherCreate", "You don't have permission to add item to organization")
    for (const collectionUuid of targetCollectionIds) {
      const collectionResult = organizationCollectionFindByUuidAndOrganization(
        database,
        collectionUuid,
        organizationUuid,
      )
      if (!collectionResult.success) return collectionResult
      if (collectionResult.data === null) return cipherErrorCreate("cipherCreate", "Invalid collection ID provided")
      const writableResult = organizationCollectionWritableByUser(
        database,
        collectionUuid,
        userUuid,
        organizationUuid,
        groupsEnabled,
      )
      if (!writableResult.success) return writableResult
      if (!writableResult.data) return cipherErrorCreate("cipherCreate", "No rights to modify the collection")
    }
  }
  const now = clock.now().toISOString()
  const cipher: Cipher = {
    uuid: identifier.uuid(),
    createdAt: now,
    updatedAt: now,
    userUuid,
    organizationUuid: null,
    key: null,
    type: data.type,
    name: data.name,
    notes: null,
    fields: null,
    data: "{}",
    passwordHistory: null,
    deletedAt: null,
    reprompt: null,
  }
  const result = databaseTransaction(database, () => {
    const saveResult = cipherSave(database, cipher)
    if (!saveResult.success) return saveResult
    const applyResult = cipherApplyData(cipher, database, userUuid, data, clock, {
      groupsEnabled,
      revisionDate: now,
      transaction: false,
      updateRevision: false,
    })
    if (!applyResult.success) return applyResult
    if (organizationUuid !== null) {
      for (const collectionUuid of targetCollectionIds) {
        const linkResult = cipherCollectionLinkSave(database, cipher.uuid, collectionUuid)
        if (!linkResult.success) return linkResult
      }
    }
    const revisionResult = cipherRevisionUpdate(database, applyResult.data, now, groupsEnabled, userUuid)
    if (!revisionResult.success) return revisionResult
    return applyResult
  })
  if (!result.success) return result
  return resultCreate(result.data)
}
