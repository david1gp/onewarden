import type { OrganizationDomain } from "./organizationDomain.js"
import type { OrganizationDomainRow } from "./organizationDomainRow.js"

export function organizationDomainFromRow(row: OrganizationDomainRow): OrganizationDomain {
  return {
    creationDate: row.creation_date,
    domainName: row.domain_name,
    jobRunCount: row.job_run_count,
    lastCheckedDate: row.last_checked_date,
    nextRunDate: row.next_run_date,
    organizationUuid: row.org_uuid,
    txt: row.txt,
    uuid: row.uuid,
    verifiedDate: row.verified_date,
  }
}
