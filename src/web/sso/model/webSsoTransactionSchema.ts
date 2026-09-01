import * as v from "valibot"
import { webSsoTransactionTtlMs } from "./webSsoTransactionTtlMs.js"

function webSsoRedirectUriIsValid(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.username === "" &&
      url.password === "" &&
      url.pathname === "/sso-connector.html" &&
      url.search === "" &&
      url.hash === ""
    )
  } catch {
    return false
  }
}

/**
 * A single in-flight browser SSO authorization attempt.
 *
 * `state` and `codeVerifier` are independently generated random values, never derived from each
 * other. Only the S256 challenge derived from `codeVerifier` ever leaves the browser tab.
 */
export const webSsoTransactionSchema = v.pipe(
  v.strictObject({
    state: v.pipe(v.string(), v.minLength(43), v.maxLength(128), v.regex(/^[A-Za-z0-9_-]+$/u)),
    codeVerifier: v.pipe(v.string(), v.minLength(43), v.maxLength(128), v.regex(/^[A-Za-z0-9_-]+$/u)),
    clientId: v.literal("web"),
    redirectUri: v.pipe(v.string(), v.url(), v.minLength(1), v.check(webSsoRedirectUriIsValid)),
    createdAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
    expiresAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
    email: v.optional(v.pipe(v.string(), v.trim(), v.toLowerCase(), v.minLength(1), v.maxLength(256))),
  }),
  v.check(
    (transaction) => transaction.expiresAt - transaction.createdAt === webSsoTransactionTtlMs,
    "SSO transaction lifetime is invalid.",
  ),
)

export type WebSsoTransaction = v.InferOutput<typeof webSsoTransactionSchema>
