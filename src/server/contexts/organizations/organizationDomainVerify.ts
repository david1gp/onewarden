import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { organizationDomainSave } from "./organizationDomainSave.js"
import type { OrganizationDomain } from "./organizationDomain.js"
import { organizationPolicyCreate } from "./organizationPolicyCreate.js"
import { organizationPolicyFindByOrganizationAndType } from "./organizationPolicyFindByOrganizationAndType.js"
import { organizationPolicySave } from "./organizationPolicySave.js"
import { organizationPolicyType } from "./organizationPolicyType.js"

export async function organizationDomainVerify(
  database: DatabaseConnection,
  domain: OrganizationDomain,
  clock: Clock,
  identifier: Identifier,
  dnsResolve: (domainName: string, txt: string) => Promise<Result<boolean>>,
): Promise<Result<OrganizationDomain>> {
  if (domain.verifiedDate !== null)
    return {
      success: false,
      op: "organizationDomainVerify",
      errorMessage: "Domain has already been verified.",
      code: "platform.conflict",
    }
  const checkedDomain = { ...domain, lastCheckedDate: clock.now().toISOString() }
  const dnsResult = await dnsResolve(checkedDomain.domainName, checkedDomain.txt)
  if (!dnsResult.success) {
    const saveResult = organizationDomainSave(database, checkedDomain)
    if (!saveResult.success) return saveResult
    return resultCreate(checkedDomain)
  }
  if (!dnsResult.data) {
    const saveResult = organizationDomainSave(database, checkedDomain)
    if (!saveResult.success) return saveResult
    return resultCreate(checkedDomain)
  }
  const verifiedDomain = { ...checkedDomain, verifiedDate: clock.now().toISOString() }
  return databaseTransaction(database, () => {
    const saveResult = organizationDomainSave(database, verifiedDomain)
    if (!saveResult.success) return saveResult
    const policyResult = organizationPolicyFindByOrganizationAndType(
      database,
      domain.organizationUuid,
      organizationPolicyType.singleOrganization,
    )
    if (!policyResult.success) return policyResult
    const policy =
      policyResult.data ??
      organizationPolicyCreate(
        domain.organizationUuid,
        organizationPolicyType.singleOrganization,
        identifier,
        false,
        "null",
        clock.now().toISOString(),
      )
    const policySaveResult = organizationPolicySave(database, {
      ...policy,
      enabled: true,
      revisionDate: clock.now().toISOString(),
    })
    if (!policySaveResult.success) return policySaveResult
    return resultCreate(verifiedDomain)
  })
}
