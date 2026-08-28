import { identityOriginResolve } from "../identity/identityOriginResolve.js"

export function adminIssuerResolve(publicOrigin: string | undefined, requestUrl: string): string {
  return `${identityOriginResolve(publicOrigin, requestUrl)}|admin`
}
