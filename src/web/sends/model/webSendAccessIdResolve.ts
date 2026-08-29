export function webSendAccessIdResolve(location: string): string {
  const url = new URL(location, "http://localhost")
  const normalizedPath = url.pathname.toLowerCase()
  const prefixes = ["/send/", "/sends/access/"]

  for (const prefix of prefixes) {
    if (!normalizedPath.startsWith(prefix)) continue
    const value = url.pathname.slice(prefix.length).split("/", 1)[0] ?? ""
    try {
      return decodeURIComponent(value)
    } catch {
      return value
    }
  }

  return url.searchParams.get("send") ?? ""
}
