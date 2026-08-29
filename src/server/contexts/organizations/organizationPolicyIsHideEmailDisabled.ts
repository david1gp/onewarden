import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { organizationPolicyFindActiveByUserAndType } from "./organizationPolicyFindActiveByUserAndType.js"
import { organizationPolicyType } from "./organizationPolicyType.js"

export function organizationPolicyIsHideEmailDisabled(database: DatabaseConnection, userUuid: string): Result<boolean> {
  const policiesResult = organizationPolicyFindActiveByUserAndType(
    database,
    userUuid,
    organizationPolicyType.sendOptions,
  )
  if (!policiesResult.success) return policiesResult
  for (const policy of policiesResult.data) {
    const data = organizationPolicyJsonObjectParse(policy.data)
    if (data?.disableHideEmail === true || data?.DisableHideEmail === true) return resultCreate(true)
  }
  return resultCreate(false)
}

function organizationPolicyJsonObjectParse(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}
