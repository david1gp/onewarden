import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"

export function extensionWebAuthnOriginValidate(
  value: string,
): Result<{ url: URL; origin: string; hostname: string; isLocalhost: boolean }> {
  const op = "extensionWebAuthnOriginValidate"
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return resultErrorCreate(op, "WebAuthn requesting origin is invalid.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/u, "")
  const isLocalhost = hostname === "localhost"
  const secure = url.protocol === "https:" || (url.protocol === "http:" && isLocalhost)
  if (!secure || url.origin === "null" || hostname === "" || url.username !== "" || url.password !== "") {
    return resultErrorCreate(op, "WebAuthn requesting origin is not eligible.", {
      code: "platform.forbidden",
      statusCode: 403,
    })
  }

  const origin = `${url.protocol}//${hostname}${url.port === "" ? "" : `:${url.port}`}`
  return resultCreate({ url, origin, hostname, isLocalhost })
}
