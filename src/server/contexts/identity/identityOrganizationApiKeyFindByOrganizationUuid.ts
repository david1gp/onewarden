import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityOrganizationApiKey } from "./identityOrganizationApiKey.js"
import { identityOrganizationApiKeyFromRow } from "./identityOrganizationApiKeyFromRow.js"
import type { IdentityOrganizationApiKeyRow } from "./identityOrganizationApiKeyRow.js"

export function identityOrganizationApiKeyFindByOrganizationUuid(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<IdentityOrganizationApiKey | null> {
  const op = "identityOrganizationApiKeyFindByOrganizationUuid"
  try {
    const row = database
      .query<IdentityOrganizationApiKeyRow, [string]>(
        `SELECT uuid, org_uuid, atype, api_key, revision_date
         FROM organization_api_key WHERE org_uuid = ? LIMIT 1`,
      )
      .get(organizationUuid)
    return resultCreate(row === null ? null : identityOrganizationApiKeyFromRow(row))
  } catch {
    return resultErrorCreate(op, "Organization API key lookup failed.")
  }
}
