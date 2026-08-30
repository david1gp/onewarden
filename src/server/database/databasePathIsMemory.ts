export function databasePathIsMemory(databasePath: string): boolean {
  const normalized = databasePath.trim().toLowerCase()
  return (
    normalized === "" ||
    normalized === ":memory:" ||
    normalized.startsWith("file::memory:") ||
    (normalized.startsWith("file:") && /(?:[?&])mode=memory(?:[&#]|$)/.test(normalized))
  )
}
