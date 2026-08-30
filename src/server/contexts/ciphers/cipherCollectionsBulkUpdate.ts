import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { organizationCollectionFindByUser } from "../organizations/organizationCollectionFindByUser.js"
import { organizationCollectionWritableByUser } from "../organizations/organizationCollectionWritableByUser.js"
import { organizationErrorCreate } from "../organizations/organizationErrorCreate.js"
import { organizationMembershipFindByUserAndOrganization } from "../organizations/organizationMembershipFindByUserAndOrganization.js"
import { organizationMembershipStatus } from "../organizations/organizationMembershipStatus.js"
import { cipherAccessFindByUser } from "./cipherAccessFindByUser.js"
import { cipherCollectionLinkDelete } from "./cipherCollectionLinkDelete.js"
import { cipherCollectionLinkSave } from "./cipherCollectionLinkSave.js"
import { cipherFindByUuid } from "./cipherFindByUuid.js"

export function cipherCollectionsBulkUpdate(
  database: DatabaseConnection,
  userUuid: string,
  organizationUuid: string,
  cipherUuids: readonly string[],
  collectionUuids: readonly string[],
  removeCollections: boolean,
  groupsEnabled = false,
): Result<void> {
  const op = "cipherCollectionsBulkUpdate"
  const membershipResult = organizationMembershipFindByUserAndOrganization(database, userUuid, organizationUuid)
  if (!membershipResult.success) return membershipResult
  if (membershipResult.data === null || membershipResult.data.status !== organizationMembershipStatus.confirmed)
    return organizationErrorCreate(op, "You need to be a Member of the Organization to call this endpoint")

  const availableCollectionsResult = organizationCollectionFindByUser(database, userUuid, groupsEnabled)
  if (!availableCollectionsResult.success) return availableCollectionsResult
  const availableCollections = new Map(
    availableCollectionsResult.data
      .filter((collection) => collection.organizationUuid === organizationUuid)
      .map((collection) => [collection.uuid, collection]),
  )
  const targetCollectionUuids = [...new Set(collectionUuids)]
  for (const collectionUuid of targetCollectionUuids) {
    if (!availableCollections.has(collectionUuid)) return organizationErrorCreate(op, "Resource not found", 404)
    const writableResult = organizationCollectionWritableByUser(
      database,
      collectionUuid,
      userUuid,
      organizationUuid,
      groupsEnabled,
    )
    if (!writableResult.success) return writableResult
    if (!writableResult.data) return organizationErrorCreate(op, "Resource not found", 404)
  }

  for (const cipherUuid of cipherUuids) {
    const cipherResult = cipherFindByUuid(database, cipherUuid)
    if (!cipherResult.success) return cipherResult
    if (cipherResult.data === null || cipherResult.data.organizationUuid !== organizationUuid) continue
    const accessResult = cipherAccessFindByUser(database, cipherResult.data, userUuid, groupsEnabled)
    if (!accessResult.success) return accessResult
    if (accessResult.data === null || (accessResult.data.readOnly && !accessResult.data.manage)) continue

    for (const collectionUuid of targetCollectionUuids) {
      const linkResult = removeCollections
        ? cipherCollectionLinkDelete(database, cipherUuid, collectionUuid)
        : cipherCollectionLinkSave(database, cipherUuid, collectionUuid)
      if (!linkResult.success) return linkResult
    }
  }

  return resultCreate(undefined)
}
