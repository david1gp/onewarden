import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationDomain } from "./organizationDomain.js"
import { organizationDomainFromRow } from "./organizationDomainFromRow.js"
import type { OrganizationDomainRow } from "./organizationDomainRow.js"

export function organizationDomainFindByUuidAndOrganization(
  database: DatabaseConnection,
  uuid: string,
  organizationUuid: string,
): Result<OrganizationDomain | null> {
  const op = "organizationDomainFindByUuidAndOrganization"
  try {
    const row = database
      .query<OrganizationDomainRow, [string, string]>(
        `SELECT uuid, org_uuid, txt, domain_name, creation_date, next_run_date,
                job_run_count, verified_date, last_checked_date
         FROM organization_domains WHERE uuid = ? AND org_uuid = ? LIMIT 1`,
      )
      .get(uuid, organizationUuid)
    return resultCreate(row === null ? null : organizationDomainFromRow(row))
  } catch {
    return resultErrorCreate(op, "Organization domain lookup failed.")
  }
}
