const cipherPasswordHistoryEpoch = "1970-01-01T00:00:00.000000Z"

function recordIs(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function keyNormalize(key: string): string {
  if (key.toLowerCase() === "ssn") return "ssn"
  return key.length === 0 ? key : `${key[0]?.toLowerCase() ?? ""}${key.slice(1)}`
}

function valueNormalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(valueNormalize)
  if (!recordIs(value)) return value
  const normalized: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) normalized[keyNormalize(key)] = valueNormalize(entry)
  return normalized
}

function calendarDateIsValid(value: string): boolean {
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(0, 0, 0, 0)
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function dateNormalize(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/.exec(value)
  if (match === null) return cipherPasswordHistoryEpoch
  if (!calendarDateIsValid(match[1] ?? "") || !Number.isFinite(Date.parse(value))) return cipherPasswordHistoryEpoch
  const fraction = (match[2] ?? "").slice(0, 6).padEnd(6, "0")
  return `${match[1]}.${fraction}${match[3]}`
}

export function cipherPasswordHistoryNormalize(value: string | null): unknown[] {
  if (value === null) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const history: unknown[] = []
  for (const entry of parsed) {
    const normalized = valueNormalize(entry)
    if (!recordIs(normalized) || typeof normalized.password !== "string") continue
    normalized.lastUsedDate =
      typeof normalized.lastUsedDate === "string" ? dateNormalize(normalized.lastUsedDate) : cipherPasswordHistoryEpoch
    history.push(normalized)
  }
  return history
}
