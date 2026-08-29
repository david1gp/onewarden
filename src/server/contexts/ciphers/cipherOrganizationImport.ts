import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { organizationCollectionCreate } from "../organizations/organizationCollectionCreate.js"
import { organizationCollectionFindByOrganization } from "../organizations/organizationCollectionFindByOrganization.js"
import { organizationCollectionWritableByUser } from "../organizations/organizationCollectionWritableByUser.js"
import type { OrganizationCollection } from "../organizations/organizationCollection.js"
import { organizationErrorCreate } from "../organizations/organizationErrorCreate.js"
import { organizationMembershipFindByUserAndOrganization } from "../organizations/organizationMembershipFindByUserAndOrganization.js"
import { organizationMembershipHasFullAccess } from "../organizations/organizationMembershipHasFullAccess.js"
import { organizationMembershipStatus } from "../organizations/organizationMembershipStatus.js"
import type { Cipher } from "./cipher.js"
import { cipherApplyData } from "./cipherApplyData.js"
import { cipherCollectionLinkSave } from "./cipherCollectionLinkSave.js"
import { cipherDataPrepare } from "./cipherDataPrepare.js"
import type { CipherOrganizationImportData } from "./cipherOrganizationImportDataSchema.js"
import { cipherPasswordHistoryValidate } from "./cipherPasswordHistoryValidate.js"
import { cipherRevisionUpdate } from "./cipherRevisionUpdate.js"
import { cipherUserRevisionUpdate } from "./cipherUserRevisionUpdate.js"
import { cipherUserUuidsFind } from "./cipherUserUuidsFind.js"

export function cipherOrganizationImport(
  database: DatabaseConnection,
  userUuid: string,
  organizationUuid: string,
  data: CipherOrganizationImportData,
  clock: Clock,
  identifier: Identifier,
  maxNoteSize = 10_000,
  groupsEnabled = false,
): Result<{
  ciphers: Array<{ cipher: Cipher; collectionIds: string[]; userUuids: string[] }>
  createdCollections: OrganizationCollection[]
  revisionDate: string
}> {
  for (const [cipherIndex, cipherData] of data.ciphers.entries()) {
    const preparedResult = cipherDataPrepare({ ...cipherData, folderId: null, organizationId: organizationUuid })
    if (!preparedResult.success) return preparedResult
    if (
      cipherData.notes !== null &&
      cipherData.notes !== undefined &&
      new TextEncoder().encode(cipherData.notes).byteLength > maxNoteSize
    )
      return apiErrorCreate("cipherOrganizationImport", "platform.invalid-request", "The model state is invalid.", {
        [`Ciphers[${cipherIndex}].Notes`]: [
          `The field Notes exceeds the maximum encrypted value length of ${maxNoteSize} characters.`,
        ],
      })
    const passwordHistoryResult = cipherPasswordHistoryValidate(cipherData.passwordHistory, cipherIndex)
    if (!passwordHistoryResult.success) return passwordHistoryResult
  }
  for (const relation of data.collectionRelationships)
    if (relation.key >= data.ciphers.length || relation.value >= data.collections.length)
      return organizationErrorCreate("cipherOrganizationImport", "Invalid collection relationship")

  const membershipResult = organizationMembershipFindByUserAndOrganization(database, userUuid, organizationUuid)
  if (!membershipResult.success) return membershipResult
  if (membershipResult.data === null)
    return organizationErrorCreate("cipherOrganizationImport", "The current user isn't member of the organization", 401)
  const membership = membershipResult.data
  const now = clock.now().toISOString()

  return databaseTransaction(database, () => {
    const existingCollectionsResult = organizationCollectionFindByOrganization(database, organizationUuid)
    if (!existingCollectionsResult.success) return existingCollectionsResult
    const existingCollections = new Map(
      existingCollectionsResult.data.map((collection) => [collection.uuid, collection]),
    )
    const collectionIds: string[] = []
    const createdCollections: OrganizationCollection[] = []
    for (const collectionData of data.collections) {
      const existingCollection =
        collectionData.id === undefined || collectionData.id === null
          ? undefined
          : existingCollections.get(collectionData.id)
      if (existingCollection !== undefined) {
        if (!organizationMembershipHasFullAccess(membership)) {
          const writableResult = organizationCollectionWritableByUser(
            database,
            existingCollection.uuid,
            userUuid,
            organizationUuid,
            groupsEnabled,
            false,
          )
          if (!writableResult.success) return writableResult
          if (!writableResult.data)
            return organizationErrorCreate(
              "cipherOrganizationImport",
              "The current user isn't allowed to manage this collection",
            )
        }
        collectionIds.push(existingCollection.uuid)
        continue
      }
      if (!organizationMembershipHasFullAccess(membership))
        return organizationErrorCreate(
          "cipherOrganizationImport",
          "The current user isn't allowed to create new collections",
        )
      const collectionResult = organizationCollectionCreate(
        database,
        organizationUuid,
        collectionData.name,
        collectionData.externalId,
        now,
        identifier,
      )
      if (!collectionResult.success) return collectionResult
      collectionIds.push(collectionResult.data.uuid)
      createdCollections.push(collectionResult.data)
    }

    const targetCollectionIds = [...new Set(collectionIds)]
    if (data.ciphers.length > 0) {
      if (membership.status !== organizationMembershipStatus.confirmed)
        return organizationErrorCreate(
          "cipherOrganizationImport",
          "You don't have permission to add item to organization",
        )
      if (targetCollectionIds.length === 0 && !organizationMembershipHasFullAccess(membership))
        return organizationErrorCreate(
          "cipherOrganizationImport",
          "You don't have permission to add cipher directly to organization",
        )
    }

    const relationshipCollectionIds = new Map<number, string[]>()
    for (const relation of data.collectionRelationships) {
      const collectionId = collectionIds[relation.value]
      if (collectionId === undefined)
        return organizationErrorCreate("cipherOrganizationImport", "Invalid collection relationship")
      const relationIds = relationshipCollectionIds.get(relation.key) ?? []
      if (!relationIds.includes(collectionId)) relationIds.push(collectionId)
      relationshipCollectionIds.set(relation.key, relationIds)
    }

    const importedCiphers: Array<{ cipher: Cipher; collectionIds: string[]; userUuids: string[] }> = []
    for (const [cipherIndex, cipherData] of data.ciphers.entries()) {
      const cipher: Cipher = {
        uuid: identifier.uuid(),
        createdAt: now,
        updatedAt: now,
        userUuid,
        organizationUuid: null,
        key: null,
        type: cipherData.type,
        name: cipherData.name,
        notes: null,
        fields: null,
        data: "{}",
        passwordHistory: null,
        deletedAt: null,
        reprompt: null,
      }
      const applyResult = cipherApplyData(
        cipher,
        database,
        userUuid,
        { ...cipherData, folderId: null, organizationId: organizationUuid },
        clock,
        { groupsEnabled, revisionDate: now, transaction: false, updateRevision: false },
      )
      if (!applyResult.success) return applyResult
      const relatedCollectionIds = relationshipCollectionIds.get(cipherIndex) ?? []
      for (const collectionId of relatedCollectionIds) {
        const linkResult = cipherCollectionLinkSave(database, applyResult.data.uuid, collectionId)
        if (!linkResult.success) return linkResult
      }
      const revisionResult = cipherRevisionUpdate(database, applyResult.data, now, groupsEnabled, userUuid)
      if (!revisionResult.success) return revisionResult
      const userUuidsResult = cipherUserUuidsFind(database, applyResult.data, groupsEnabled)
      if (!userUuidsResult.success) return userUuidsResult
      const userUuids = new Set(userUuidsResult.data)
      userUuids.add(userUuid)
      importedCiphers.push({
        cipher: applyResult.data,
        collectionIds: [...relatedCollectionIds],
        userUuids: [...userUuids],
      })
    }
    const userRevisionResult = cipherUserRevisionUpdate(database, userUuid, now)
    if (!userRevisionResult.success) return userRevisionResult
    return resultCreate({ ciphers: importedCiphers, createdCollections, revisionDate: now })
  })
}
