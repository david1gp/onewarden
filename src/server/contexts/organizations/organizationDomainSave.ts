import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { organizationDomains } from "../../database/schema/organizationDomains.js"
import type { OrganizationDomain } from "./organizationDomain.js"

export function organizationDomainSave(database: DatabaseConnection, domain: OrganizationDomain): Result<void> {
  const op = "organizationDomainSave"
  try {
    database.drizzle
      .insert(organizationDomains)
      .values({
        uuid: domain.uuid,
        orgUuid: domain.organizationUuid,
        txt: domain.txt,
        domainName: domain.domainName,
        creationDate: domain.creationDate,
        nextRunDate: domain.nextRunDate,
        jobRunCount: domain.jobRunCount,
        verifiedDate: domain.verifiedDate,
        lastCheckedDate: domain.lastCheckedDate,
      })
      .onConflictDoUpdate({
        target: organizationDomains.uuid,
        set: {
          txt: domain.txt,
          domainName: domain.domainName,
          nextRunDate: domain.nextRunDate,
          jobRunCount: domain.jobRunCount,
          verifiedDate: domain.verifiedDate,
          lastCheckedDate: domain.lastCheckedDate,
        },
      })
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Organization domain save failed.")
  }
}
