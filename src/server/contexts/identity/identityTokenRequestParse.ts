import * as v from "valibot"
import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { type IdentityTokenRequest, identityTokenRequestSchema } from "./identityTokenRequestSchema.js"

const identityTokenRequestAliases: Record<string, keyof IdentityTokenRequest> = {
  grant_type: "grantType",
  granttype: "grantType",
  refresh_token: "refreshToken",
  refreshtoken: "refreshToken",
  client_id: "clientId",
  clientid: "clientId",
  client_secret: "clientSecret",
  clientsecret: "clientSecret",
  password: "password",
  scope: "scope",
  username: "username",
  device_identifier: "deviceIdentifier",
  deviceidentifier: "deviceIdentifier",
  device_name: "deviceName",
  devicename: "deviceName",
  device_type: "deviceType",
  devicetype: "deviceType",
  device_push_token: "devicePushToken",
  devicepushtoken: "devicePushToken",
  two_factor_provider: "twoFactorProvider",
  twofactorprovider: "twoFactorProvider",
  two_factor_token: "twoFactorToken",
  twofactortoken: "twoFactorToken",
  two_factor_remember: "twoFactorRemember",
  twofactorremember: "twoFactorRemember",
  auth_request: "authRequest",
  authrequest: "authRequest",
  codeverifier: "codeVerifier",
  code: "code",
  code_verifier: "codeVerifier",
  sendid: "sendId",
  send_id: "sendId",
  passwordhashb64: "passwordHashB64",
  password_hash_b64: "passwordHashB64",
}

export function identityTokenRequestParse(input: unknown): Result<IdentityTokenRequest> {
  const op = "identityTokenRequestParse"
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return resultErrorCreate(op, "Invalid request.", { code: "platform.invalid-request", statusCode: 400 })
  }

  const normalized: Partial<Record<keyof IdentityTokenRequest, string>> = {}
  for (const [key, value] of Object.entries(input)) {
    if (typeof value !== "string") continue
    const field = identityTokenRequestAliases[key.toLowerCase()]
    if (field !== undefined && normalized[field] === undefined) normalized[field] = value
  }

  const parsed = v.safeParse(identityTokenRequestSchema, normalized)
  if (!parsed.success) {
    return resultErrorCreate(op, v.summarize(parsed.issues), {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  return resultCreate(parsed.output)
}
