import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"
import { organizationFindByUuid } from "./organizationFindByUuid.js"

export function organizationDelete(
  database: DatabaseConnection,
  organizationUuid: string,
  revisionDate: string,
): Result<void> {
  const organizationResult = organizationFindByUuid(database, organizationUuid)
  if (!organizationResult.success) return organizationResult
  if (organizationResult.data === null)
    return organizationErrorCreate("organizationDelete", "Organization not found", 404)

  return databaseTransaction(database, () => {
    try {
      database.run(
        `UPDATE users
         SET updated_at = ?
         WHERE uuid IN (SELECT user_uuid FROM users_organizations WHERE org_uuid = ?)`,
        [revisionDate, organizationUuid],
      )
      database.run(
        "DELETE FROM groups_users WHERE groups_uuid IN (SELECT uuid FROM groups WHERE organizations_uuid = ?)",
        [organizationUuid],
      )
      database.run(
        "DELETE FROM collections_groups WHERE collections_uuid IN (SELECT uuid FROM collections WHERE org_uuid = ?)",
        [organizationUuid],
      )
      database.run(
        "DELETE FROM ciphers_collections WHERE collection_uuid IN (SELECT uuid FROM collections WHERE org_uuid = ?)",
        [organizationUuid],
      )
      database.run(
        "DELETE FROM users_collections WHERE collection_uuid IN (SELECT uuid FROM collections WHERE org_uuid = ?)",
        [organizationUuid],
      )
      database.run(
        "DELETE FROM favorites WHERE cipher_uuid IN (SELECT uuid FROM ciphers WHERE organization_uuid = ?)",
        [organizationUuid],
      )
      database.run("DELETE FROM archives WHERE cipher_uuid IN (SELECT uuid FROM ciphers WHERE organization_uuid = ?)", [
        organizationUuid,
      ])
      database.run(
        "DELETE FROM folders_ciphers WHERE cipher_uuid IN (SELECT uuid FROM ciphers WHERE organization_uuid = ?)",
        [organizationUuid],
      )
      database.run(
        "DELETE FROM attachments WHERE cipher_uuid IN (SELECT uuid FROM ciphers WHERE organization_uuid = ?)",
        [organizationUuid],
      )
      database.run("DELETE FROM ciphers WHERE organization_uuid = ?", [organizationUuid])
      database.run("DELETE FROM collections WHERE org_uuid = ?", [organizationUuid])
      database.run("DELETE FROM groups WHERE organizations_uuid = ?", [organizationUuid])
      database.run("DELETE FROM users_organizations WHERE org_uuid = ?", [organizationUuid])
      database.run("DELETE FROM organization_api_key WHERE org_uuid = ?", [organizationUuid])
      database.run("DELETE FROM organizations WHERE uuid = ?", [organizationUuid])
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate("organizationDelete", "Organization deletion failed.")
    }
  })
}
