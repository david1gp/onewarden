export function cipherPasswordHistoryFormatDate(isoDate: string): string {
  if (!isoDate || isoDate.startsWith("1970-01-01")) {
    return "Unknown date"
  }
  try {
    const d = new Date(isoDate)
    if (Number.isNaN(d.getTime())) {
      return isoDate
    }
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return isoDate
  }
}
