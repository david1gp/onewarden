import * as v from "valibot"

const identityConfigBooleanSchema = v.pipe(
  v.string(),
  v.trim(),
  v.picklist(["false", "true"]),
  v.transform((value) => value === "true"),
)

const identityConfigIntegerSchema = v.pipe(
  v.string(),
  v.trim(),
  v.regex(/^\d+$/, "The value must be a non-negative integer."),
  v.transform(Number),
  v.integer(),
  v.minValue(1),
)
const identityConfigNonNegativeIntegerSchema = v.pipe(
  v.string(),
  v.trim(),
  v.regex(/^\d+$/, "The value must be a non-negative integer."),
  v.transform(Number),
  v.integer(),
  v.minValue(0),
)
const identityConfigOrganizationCreationUsersSchema = v.pipe(
  v.string(),
  v.trim(),
  v.transform((value) => value.toLowerCase()),
  v.check(identityConfigOrganizationCreationUsersIsValid, "ORG_CREATION_USERS contains invalid email addresses."),
)

function identityConfigOrganizationCreationUsersIsValid(value: string): boolean {
  if (value === "" || value === "all" || value === "none") return true
  return value.split(",").every((email) => identityConfigEmailIsValid(email.trim()))
}

function identityConfigEmailIsValid(email: string): boolean {
  const separator = email.lastIndexOf("@")
  if (separator < 1 || separator !== email.indexOf("@") || separator === email.length - 1 || /[\s]/u.test(email))
    return false
  const domain = email.slice(separator + 1)
  try {
    const domainUrl = new URL(`https://${domain}`)
    return domainUrl.pathname === "/" && domainUrl.search === "" && domainUrl.hostname.length > 0
  } catch {
    return false
  }
}

export const identityConfigSchema = v.object({
  ORG_CREATION_USERS: v.optional(identityConfigOrganizationCreationUsersSchema, ""),
  SIGNUPS_ALLOWED: v.optional(identityConfigBooleanSchema, "true"),
  SIGNUPS_VERIFY: v.optional(identityConfigBooleanSchema, "false"),
  SIGNUPS_VERIFY_RESEND_TIME: v.optional(identityConfigNonNegativeIntegerSchema, "3600"),
  SIGNUPS_VERIFY_RESEND_LIMIT: v.optional(identityConfigNonNegativeIntegerSchema, "6"),
  SIGNUPS_DOMAINS_WHITELIST: v.optional(v.pipe(v.string(), v.trim()), ""),
  INVITATIONS_ALLOWED: v.optional(identityConfigBooleanSchema, "true"),
  INVITATION_EXPIRATION_HOURS: v.optional(identityConfigIntegerSchema, "120"),
  EMERGENCY_ACCESS_ALLOWED: v.optional(identityConfigBooleanSchema, "true"),
  EMAIL_CHANGE_ALLOWED: v.optional(identityConfigBooleanSchema, "true"),
  PASSWORD_ITERATIONS: v.optional(identityConfigIntegerSchema, "600000"),
  PASSWORD_HINTS_ALLOWED: v.optional(identityConfigBooleanSchema, "true"),
  SHOW_PASSWORD_HINT: v.optional(identityConfigBooleanSchema, "false"),
  MAIL_ENABLED: v.optional(identityConfigBooleanSchema, "false"),
  SSO_ENABLED: v.optional(identityConfigBooleanSchema, "false"),
  SSO_ONLY: v.optional(identityConfigBooleanSchema, "false"),
  SSO_SIGNUPS_MATCH_EMAIL: v.optional(identityConfigBooleanSchema, "true"),
  SSO_ALLOW_UNKNOWN_EMAIL_VERIFICATION: v.optional(identityConfigBooleanSchema, "false"),
  SSO_CLIENT_ID: v.optional(v.string(), ""),
  SSO_CLIENT_SECRET: v.optional(v.string(), ""),
  SSO_AUTHORITY: v.optional(v.string(), ""),
  SSO_SCOPES: v.optional(v.string(), "email profile"),
  SSO_AUTHORIZE_EXTRA_PARAMS: v.optional(v.string(), ""),
  SSO_PKCE: v.optional(identityConfigBooleanSchema, "true"),
  SSO_AUTH_ONLY_NOT_SESSION: v.optional(identityConfigBooleanSchema, "false"),
  DISABLE_2FA_REMEMBER: v.optional(identityConfigBooleanSchema, "false"),
  AUTHENTICATOR_DISABLE_TIME_DRIFT: v.optional(identityConfigBooleanSchema, "false"),
  ENABLE_EMAIL_2FA: v.optional(identityConfigBooleanSchema, "false"),
  EMAIL_TOKEN_SIZE: v.optional(identityConfigIntegerSchema, "6"),
  EMAIL_EXPIRATION_TIME: v.optional(identityConfigNonNegativeIntegerSchema, "600"),
  EMAIL_ATTEMPTS_LIMIT: v.optional(identityConfigNonNegativeIntegerSchema, "3"),
  INCOMPLETE_2FA_TIME_LIMIT: v.optional(identityConfigNonNegativeIntegerSchema, "3"),
  WEBAUTHN_ENABLED: v.optional(identityConfigBooleanSchema, "true"),
  WEBAUTHN_RP_NAME: v.optional(v.string(), "OneWarden"),
  DUO_ENABLED: v.optional(identityConfigBooleanSchema, "true"),
  DUO_HOST: v.optional(v.string(), ""),
  DUO_IKEY: v.optional(v.string(), ""),
  DUO_SKEY: v.optional(v.string(), ""),
  YUBICO_ENABLED: v.optional(identityConfigBooleanSchema, "false"),
  YUBICO_CLIENT_ID: v.optional(v.string(), ""),
  YUBICO_SECRET_KEY: v.optional(v.string(), ""),
  YUBICO_SERVER: v.optional(v.pipe(v.string(), v.trim()), ""),
  UNAUTHENTICATED_RATELIMIT_SECONDS: v.optional(identityConfigIntegerSchema, "60"),
  UNAUTHENTICATED_RATELIMIT_MAX_BURST: v.optional(identityConfigIntegerSchema, "50"),
})

export type IdentityConfig = v.InferOutput<typeof identityConfigSchema>
