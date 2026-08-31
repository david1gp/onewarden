export function vaultEntryFaviconPathResolve(url: string | undefined): string | null {
  if (!url) return null

  try {
    const parsedUrl = new URL(url)
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") return null
    const hostname = parsedUrl.hostname.toLowerCase().replace(/\.+$/u, "")
    if (!hostname) return null
    return `/icons/${hostname}/icon.png?fallback=error`
  } catch {
    return null
  }
}
