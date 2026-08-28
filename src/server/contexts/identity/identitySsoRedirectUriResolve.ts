import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"

export function identitySsoRedirectUriResolve(
  clientId: string,
  rawRedirectUri: string,
  publicOrigin: string,
): Result<string> {
  const op = "identitySsoRedirectUriResolve"
  if (clientId === "web" || clientId === "browser") return resultCreate(`${publicOrigin}/sso-connector.html`)
  if (clientId === "desktop" || clientId === "mobile") return resultCreate("bitwarden://sso-callback")
  if (clientId === "cli") {
    const match = /^http:\/\/localhost:([0-9]{4})$/.exec(rawRedirectUri)
    if (match?.[1] !== undefined) return resultCreate(`http://localhost:${match[1]}`)
    return identityDomainErrorCreate(op, "Failed to extract port number")
  }
  return identityDomainErrorCreate(op, `Unsupported client ${clientId}`)
}
