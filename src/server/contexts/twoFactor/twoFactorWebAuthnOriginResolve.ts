import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export function twoFactorWebAuthnOriginResolve(publicOrigin: string | undefined): Result<string> {
  const op = "twoFactorWebAuthnOriginResolve"
  if (publicOrigin === undefined) return resultErrorCreate(op, "Configured `DOMAIN` is not compatible with Webauthn")
  try {
    const origin = new URL(publicOrigin)
    const localhost = origin.protocol === "http:" && origin.hostname === "localhost"
    if (
      origin.hostname === "" ||
      (origin.protocol !== "https:" && !localhost) ||
      origin.username !== "" ||
      origin.password !== "" ||
      origin.pathname !== "/" ||
      origin.search !== "" ||
      origin.hash !== ""
    )
      return resultErrorCreate(op, "Configured `DOMAIN` is not compatible with Webauthn")
    return resultCreate(origin.origin)
  } catch {
    return resultErrorCreate(op, "Configured `DOMAIN` is not compatible with Webauthn")
  }
}
