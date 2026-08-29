import { resolveTxt } from "node:dns/promises"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export async function organizationDomainDnsResolve(domainName: string, txt: string): Promise<Result<boolean>> {
  const op = "organizationDomainDnsResolve"
  try {
    const records = await resolveTxt(domainName)
    return resultCreate(records.some((record) => record.join("") === txt))
  } catch {
    return resultErrorCreate(op, "Organization domain DNS lookup failed.")
  }
}
