import * as v from "valibot"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { organizationPolicyFindActiveByUserAndType } from "./organizationPolicyFindActiveByUserAndType.js"
import { organizationPolicyType } from "./organizationPolicyType.js"

const organizationPolicySendOptionsSchema = v.object({
  disableHideEmail: v.optional(v.boolean()),
  DisableHideEmail: v.optional(v.boolean()),
})

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
    const parsed = v.safeParse(organizationPolicySendOptionsSchema, JSON.parse(value))
    return parsed.success ? parsed.output : null
  } catch {
    return null
  }
}
