import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationSsoConfig } from "./organizationSsoConfig.js"
import { organizationSsoConfigFromRow } from "./organizationSsoConfigFromRow.js"
import type { OrganizationSsoConfigRow } from "./organizationSsoConfigRow.js"

export function organizationSsoConfigFindByOrganization(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<OrganizationSsoConfig | null> {
  const op = "organizationSsoConfigFindByOrganization"
  try {
    const row = database
      .query<OrganizationSsoConfigRow, [string]>(
        `SELECT org_uuid, enabled, data, creation_date, revision_date
         FROM organization_sso_configs WHERE org_uuid = ? LIMIT 1`,
      )
      .get(organizationUuid)
    return resultCreate(row === null ? null : organizationSsoConfigFromRow(row))
  } catch {
    return resultErrorCreate(op, "Organization SSO configuration lookup failed.")
  }
}
