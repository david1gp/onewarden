import type { SessionHandoffOperation } from "./sessionHandoffOperationSchema.js"

export function sessionHandoffRouteCreate(operation: SessionHandoffOperation, cipherId: string | null): string {
  if (operation === "create") return "/ciphers/new"
  if (cipherId === null) return "/ciphers/new"
  return `/ciphers/${encodeURIComponent(cipherId)}/edit`
}
