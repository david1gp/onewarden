import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Organization } from "./organization.js"
import { organizationFindByUuid } from "./organizationFindByUuid.js"
import { organizationMembershipFindMainByUser } from "./organizationMembershipFindMainByUser.js"
import { organizationPolicyFindByOrganizationAndType } from "./organizationPolicyFindByOrganizationAndType.js"
import { organizationPolicyType } from "./organizationPolicyType.js"

const fakeSsoOrganizationUuid = "00000000-01DC-01DC-01DC-000000000000"

export function organizationAutoEnrollStatusFind(
  database: DatabaseConnection,
  userUuid: string,
  identifier: string,
): Result<{ id: string; identifier: string; resetPasswordEnabled: boolean }> {
  let organizationResult: Result<Organization | null>
  if (identifier === fakeSsoOrganizationUuid) {
    const membershipResult = organizationMembershipFindMainByUser(database, userUuid)
    if (!membershipResult.success) return membershipResult
    if (membershipResult.data === null) return resultCreate(organizationAutoEnrollStatusUnknown(identifier))
    organizationResult = organizationFindByUuid(database, membershipResult.data.organizationUuid)
  } else {
    organizationResult = organizationFindByUuid(database, identifier)
  }
  if (!organizationResult.success) return organizationResult
  if (organizationResult.data === null) return resultCreate(organizationAutoEnrollStatusUnknown(identifier))

  const policyResult = organizationPolicyFindByOrganizationAndType(
    database,
    organizationResult.data.uuid,
    organizationPolicyType.resetPassword,
  )
  if (!policyResult.success) return policyResult
  const policy = policyResult.data
  return resultCreate({
    id: organizationResult.data.uuid,
    identifier: organizationResult.data.uuid,
    resetPasswordEnabled: policy?.enabled === true && organizationAutoEnrollStatusPolicyEnabled(policy.data),
  })
}

function organizationAutoEnrollStatusUnknown(identifier: string) {
  return { id: identifier, identifier, resetPasswordEnabled: false as const }
}

function organizationAutoEnrollStatusPolicyEnabled(data: string): boolean {
  let parsed: unknown
  try {
    parsed = JSON.parse(data) as unknown
  } catch {
    return false
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return false
  const policyData = parsed as Record<string, unknown>
  const hasCamelCaseValue = Object.hasOwn(policyData, "autoEnrollEnabled")
  const hasPascalCaseValue = Object.hasOwn(policyData, "AutoEnrollEnabled")
  if (hasCamelCaseValue === hasPascalCaseValue) return false
  if (organizationAutoEnrollStatusPolicyKeyCount(data) !== 1) return false
  return (hasCamelCaseValue ? policyData.autoEnrollEnabled : policyData.AutoEnrollEnabled) === true
}

function organizationAutoEnrollStatusPolicyKeyCount(data: string): number | null {
  let index = organizationAutoEnrollStatusWhitespaceSkip(data, 0)
  if (data[index] !== "{") return null
  index = organizationAutoEnrollStatusWhitespaceSkip(data, index + 1)
  let count = 0
  if (data[index] === "}") return count

  while (index < data.length) {
    if (data[index] !== '"') return null
    const keyStart = index
    const keyEnd = organizationAutoEnrollStatusStringEnd(data, index)
    if (keyEnd === null) return null
    let key: unknown
    try {
      key = JSON.parse(data.slice(keyStart, keyEnd)) as unknown
    } catch {
      return null
    }
    if (key === "autoEnrollEnabled" || key === "AutoEnrollEnabled") count += 1

    index = organizationAutoEnrollStatusWhitespaceSkip(data, keyEnd)
    if (data[index] !== ":") return null
    const valueEnd = organizationAutoEnrollStatusValueEnd(data, index + 1)
    if (valueEnd === null) return null
    index = organizationAutoEnrollStatusWhitespaceSkip(data, valueEnd)
    if (data[index] === "}") return count
    if (data[index] !== ",") return null
    index = organizationAutoEnrollStatusWhitespaceSkip(data, index + 1)
  }
  return null
}

function organizationAutoEnrollStatusWhitespaceSkip(data: string, start: number): number {
  let index = start
  while (/\s/.test(data[index] ?? "")) index += 1
  return index
}

function organizationAutoEnrollStatusStringEnd(data: string, start: number): number | null {
  for (let index = start + 1; index < data.length; index += 1) {
    if (data[index] === "\\") {
      index += 1
      continue
    }
    if (data[index] === '"') return index + 1
  }
  return null
}

function organizationAutoEnrollStatusValueEnd(data: string, start: number): number | null {
  const valueStart = organizationAutoEnrollStatusWhitespaceSkip(data, start)
  const first = data[valueStart]
  if (first === '"') return organizationAutoEnrollStatusStringEnd(data, valueStart)
  if (first !== "{" && first !== "[") {
    let index = valueStart
    while (index < data.length && !/[\s,}\]]/.test(data[index] ?? "")) index += 1
    return index
  }

  let index = valueStart
  const stack = [data[index]]
  index += 1
  while (index < data.length && stack.length > 0) {
    const character = data[index]
    if (character === '"') {
      const stringEnd = organizationAutoEnrollStatusStringEnd(data, index)
      if (stringEnd === null) return null
      index = stringEnd
      continue
    }
    if (character === "{" || character === "[") stack.push(character)
    if (character === "}" || character === "]") {
      const opening = stack.at(-1)
      if ((character === "}" && opening !== "{") || (character === "]" && opening !== "[")) return null
      stack.pop()
      if (stack.length === 0) return index + 1
    }
    index += 1
  }
  return null
}
