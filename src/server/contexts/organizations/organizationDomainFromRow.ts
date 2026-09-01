import type { OrganizationDomain } from "./organizationDomain.js"
import type { OrganizationDomainRow } from "../../database/schema/organizationDomains.js"

export function organizationDomainFromRow(row: OrganizationDomainRow): OrganizationDomain {
  return {
    creationDate: row.creationDate,
    domainName: row.domainName,
    jobRunCount: row.jobRunCount,
    lastCheckedDate: row.lastCheckedDate,
    nextRunDate: row.nextRunDate,
    organizationUuid: row.orgUuid,
    txt: row.txt,
    uuid: row.uuid,
    verifiedDate: row.verifiedDate,
  }
}
