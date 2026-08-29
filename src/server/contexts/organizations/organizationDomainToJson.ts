import type { OrganizationDomain } from "./organizationDomain.js"

export function organizationDomainToJson(domain: OrganizationDomain): Record<string, unknown> {
  return {
    id: domain.uuid,
    organizationId: domain.organizationUuid,
    txt: domain.txt,
    domainName: domain.domainName,
    creationDate: domain.creationDate,
    nextRunDate: domain.nextRunDate,
    jobRunCount: domain.jobRunCount,
    verifiedDate: domain.verifiedDate,
    lastCheckedDate: domain.lastCheckedDate,
    object: "organizationDomain",
  }
}
