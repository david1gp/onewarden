import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { organizationCollectionCreate } from "./organizationCollectionCreate.js"
import type { Organization } from "./organization.js"
import type { OrganizationCreateData } from "./organizationCreateDataSchema.js"
import { organizationSave } from "./organizationSave.js"

export function organizationCreate(
  database: DatabaseConnection,
  userUuid: string,
  data: OrganizationCreateData,
  clock: Clock,
  identifier: Identifier,
): Result<Organization> {
  const now = clock.now().toISOString()
  const organization: Organization = {
    billingEmail: data.billingEmail.toLowerCase(),
    identifier: null,
    name: data.name,
    privateKey: data.keys?.encryptedPrivateKey ?? null,
    publicKey: data.keys?.publicKey ?? null,
    uuid: identifier.uuid(),
  }
  const membershipUuid = identifier.uuid()

  return databaseTransaction(database, () => {
    const saveResult = organizationSave(database, organization, now)
    if (!saveResult.success) return saveResult
    try {
      database.run(
        `INSERT INTO users_organizations (
           uuid, user_uuid, org_uuid, access_all, akey, status, atype
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [membershipUuid, userUuid, organization.uuid, 1, data.key, 2, 0],
      )
      const collectionResult = organizationCollectionCreate(
        database,
        organization.uuid,
        data.collectionName,
        null,
        now,
        identifier,
      )
      if (!collectionResult.success) return collectionResult
      return resultCreate(organization)
    } catch {
      return resultErrorCreate("organizationCreate", "Organization creation failed.")
    }
  })
}
