export function organizationResetPasswordPolicyAutoEnrollEnabled(data: string): boolean {
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
  if (organizationResetPasswordPolicyAutoEnrollKeyCount(data) !== 1) return false
  return (hasCamelCaseValue ? policyData.autoEnrollEnabled : policyData.AutoEnrollEnabled) === true
}

function organizationResetPasswordPolicyAutoEnrollKeyCount(data: string): number | null {
  let index = organizationResetPasswordPolicyAutoEnrollWhitespaceSkip(data, 0)
  if (data[index] !== "{") return null
  index = organizationResetPasswordPolicyAutoEnrollWhitespaceSkip(data, index + 1)
  let count = 0
  if (data[index] === "}") return count

  while (index < data.length) {
    if (data[index] !== '"') return null
    const keyStart = index
    const keyEnd = organizationResetPasswordPolicyAutoEnrollStringEnd(data, index)
    if (keyEnd === null) return null
    let key: unknown
    try {
      key = JSON.parse(data.slice(keyStart, keyEnd)) as unknown
    } catch {
      return null
    }
    if (key === "autoEnrollEnabled" || key === "AutoEnrollEnabled") count += 1

    index = organizationResetPasswordPolicyAutoEnrollWhitespaceSkip(data, keyEnd)
    if (data[index] !== ":") return null
    const valueEnd = organizationResetPasswordPolicyAutoEnrollValueEnd(data, index + 1)
    if (valueEnd === null) return null
    index = organizationResetPasswordPolicyAutoEnrollWhitespaceSkip(data, valueEnd)
    if (data[index] === "}") return count
    if (data[index] !== ",") return null
    index = organizationResetPasswordPolicyAutoEnrollWhitespaceSkip(data, index + 1)
  }
  return null
}

function organizationResetPasswordPolicyAutoEnrollWhitespaceSkip(data: string, start: number): number {
  let index = start
  while (/\s/.test(data[index] ?? "")) index += 1
  return index
}

function organizationResetPasswordPolicyAutoEnrollStringEnd(data: string, start: number): number | null {
  for (let index = start + 1; index < data.length; index += 1) {
    if (data[index] === "\\") {
      index += 1
      continue
    }
    if (data[index] === '"') return index + 1
  }
  return null
}

function organizationResetPasswordPolicyAutoEnrollValueEnd(data: string, start: number): number | null {
  const valueStart = organizationResetPasswordPolicyAutoEnrollWhitespaceSkip(data, start)
  const first = data[valueStart]
  if (first === '"') return organizationResetPasswordPolicyAutoEnrollStringEnd(data, valueStart)
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
      const stringEnd = organizationResetPasswordPolicyAutoEnrollStringEnd(data, index)
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
