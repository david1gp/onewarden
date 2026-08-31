import * as v from "valibot"

function calendarDateIsValid(value: string): boolean {
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(0, 0, 0, 0)
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function isoTimestampIsValid(value: string): boolean {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/.exec(value)
  return match !== null && calendarDateIsValid(match[1] ?? "") && Number.isFinite(Date.parse(value))
}

export const isoTimestampSchema = v.pipe(
  v.string(),
  v.isoTimestamp(),
  v.check(isoTimestampIsValid, "Invalid ISO-8601 timestamp."),
)
