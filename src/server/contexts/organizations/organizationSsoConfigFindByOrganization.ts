import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { eq } from "drizzle-orm"
import { organizationSsoConfigs, type OrganizationSsoConfigRow } from "../../database/schema/organizationSsoConfigs.js"
import type { OrganizationSsoConfig } from "./organizationSsoConfig.js"
import { organizationSsoConfigFromRow } from "./organizationSsoConfigFromRow.js"

export function organizationSsoConfigFindByOrganization(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<OrganizationSsoConfig | null> {
  const op = "organizationSsoConfigFindByOrganization"
  try {
    const row: OrganizationSsoConfigRow | undefined = database.drizzle
      .select()
      .from(organizationSsoConfigs)
      .where(eq(organizationSsoConfigs.orgUuid, organizationUuid))
      .limit(1)
      .get()
    return resultCreate(row === undefined ? null : organizationSsoConfigFromRow(row))
  } catch {
    return resultErrorCreate(op, "Organization SSO configuration lookup failed.")
  }
}
