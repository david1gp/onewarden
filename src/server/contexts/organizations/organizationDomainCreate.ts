import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { base64UrlEncode } from "../../../shared/crypto/base64UrlEncode.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import type { OrganizationDomain } from "./organizationDomain.js"

export function organizationDomainCreate(
  organizationUuid: string,
  domainName: string,
  clock: Clock,
  identifier: Identifier,
): Result<OrganizationDomain> {
  const randomResult = secureRandomBytes(33)
  if (!randomResult.success) return randomResult
  const creationDate = clock.now().toISOString()
  const nextRunDate = new Date(clock.now().getTime() + 12 * 60 * 60 * 1_000).toISOString()
  return resultCreate({
    creationDate,
    domainName: domainName.toLowerCase(),
    jobRunCount: 0,
    lastCheckedDate: null,
    nextRunDate,
    organizationUuid,
    txt: `bw=${base64UrlEncode(randomResult.data)}`,
    uuid: identifier.uuid(),
    verifiedDate: null,
  })
}
