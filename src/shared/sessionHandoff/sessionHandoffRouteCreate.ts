import type { SessionHandoffOperation } from "./sessionHandoffOperationSchema.js"

export function sessionHandoffRouteCreate(
  operation: SessionHandoffOperation,
  cipherId: string | null,
  prefillUrl: string | null = null,
): string {
  if (operation === "create") {
    if (prefillUrl === null) return "/ciphers/new"
    return `/ciphers/new?uri=${encodeURIComponent(prefillUrl)}`
  }
  if (cipherId === null) return "/ciphers/new"
  return `/ciphers/${encodeURIComponent(cipherId)}/edit`
}
