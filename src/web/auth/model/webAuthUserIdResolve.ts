import { base64UrlDecode } from "../../../shared/crypto/base64UrlDecode.js"

export function webAuthUserIdResolve(token: string): string {
  const parts = token.split(".")
  if (parts.length < 2 || parts[1] === undefined) return "anonymous"
  const decoded = base64UrlDecode(parts[1])
  if (!decoded.success) return "anonymous"
  try {
    const json = JSON.parse(new TextDecoder().decode(decoded.data)) as { sub?: unknown }
    if (typeof json === "object" && json !== null && typeof json.sub === "string") {
      return json.sub
    }
  } catch {
    return "anonymous"
  }
  return "anonymous"
}
