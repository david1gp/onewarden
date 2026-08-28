export function adminCookieValueResolve(cookieHeader: string | undefined): string | undefined {
  if (cookieHeader === undefined) return undefined
  for (const item of cookieHeader.split(";")) {
    const [name, ...value] = item.trim().split("=")
    if (name === "VW_ADMIN") return value.join("=") || undefined
  }
  return undefined
}
