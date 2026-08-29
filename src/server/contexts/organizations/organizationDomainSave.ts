import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationDomain } from "./organizationDomain.js"

export function organizationDomainSave(database: DatabaseConnection, domain: OrganizationDomain): Result<void> {
  const op = "organizationDomainSave"
  try {
    database.run(
      `INSERT INTO organization_domains (
         uuid, org_uuid, txt, domain_name, creation_date, next_run_date,
         job_run_count, verified_date, last_checked_date
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET
         txt = excluded.txt,
         domain_name = excluded.domain_name,
         next_run_date = excluded.next_run_date,
         job_run_count = excluded.job_run_count,
         verified_date = excluded.verified_date,
         last_checked_date = excluded.last_checked_date`,
      [
        domain.uuid,
        domain.organizationUuid,
        domain.txt,
        domain.domainName,
        domain.creationDate,
        domain.nextRunDate,
        domain.jobRunCount,
        domain.verifiedDate,
        domain.lastCheckedDate,
      ],
    )
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Organization domain save failed.")
  }
}
