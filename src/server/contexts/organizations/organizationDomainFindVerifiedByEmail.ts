import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationDomainVerifiedSsoDetail } from "./organizationDomainVerifiedSsoDetail.js"

export function organizationDomainFindVerifiedByEmail(
  database: DatabaseConnection,
  email: string,
): Result<OrganizationDomainVerifiedSsoDetail[]> {
  const op = "organizationDomainFindVerifiedByEmail"
  try {
    const rows = database
      .query<OrganizationDomainVerifiedSsoDetail, [string]>(
        `SELECT domain.domain_name AS domainName,
                organization.identifier AS organizationIdentifier,
                organization.name AS organizationName
         FROM organization_domains AS domain
         JOIN organizations AS organization ON organization.uuid = domain.org_uuid
         WHERE domain.verified_date IS NOT NULL
           AND lower(?) LIKE '%@' || lower(domain.domain_name)
         ORDER BY domain.domain_name`,
      )
      .all(email.toLowerCase())
    return resultCreate(rows)
  } catch {
    return resultErrorCreate(op, "Organization domain lookup failed.")
  }
}
