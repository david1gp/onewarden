import * as v from "valibot"

export const eventDateSchema = v.pipe(
  v.string(),
  v.isoTimestamp(),
  v.check(eventDateCalendarIsValid, "Event date is invalid."),
  v.transform((value) => new Date(value).toISOString()),
)

function eventDateCalendarIsValid(value: string): boolean {
  const parts = /^(\d{4})-(\d{2})-(\d{2})T/u.exec(value)
  if (parts === null) return false
  const year = Number(parts[1])
  const month = Number(parts[2])
  const day = Number(parts[3])
  const lastDay = new Date(0)
  lastDay.setUTCFullYear(year, month, 0)
  lastDay.setUTCHours(0, 0, 0, 0)
  return day <= lastDay.getUTCDate()
}
