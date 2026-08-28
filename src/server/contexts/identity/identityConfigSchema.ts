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

export const identityConfigSchema = v.object({
  SIGNUPS_ALLOWED: v.optional(identityConfigBooleanSchema, "true"),
  SIGNUPS_VERIFY: v.optional(identityConfigBooleanSchema, "false"),
  SIGNUPS_VERIFY_RESEND_TIME: v.optional(identityConfigNonNegativeIntegerSchema, "3600"),
  SIGNUPS_VERIFY_RESEND_LIMIT: v.optional(identityConfigNonNegativeIntegerSchema, "6"),
  SIGNUPS_DOMAINS_WHITELIST: v.optional(v.pipe(v.string(), v.trim()), ""),
  INVITATIONS_ALLOWED: v.optional(identityConfigBooleanSchema, "true"),
  INVITATION_EXPIRATION_HOURS: v.optional(identityConfigIntegerSchema, "120"),
  EMERGENCY_ACCESS_ALLOWED: v.optional(identityConfigBooleanSchema, "true"),
  PASSWORD_ITERATIONS: v.optional(identityConfigIntegerSchema, "600000"),
  PASSWORD_HINTS_ALLOWED: v.optional(identityConfigBooleanSchema, "true"),
  MAIL_ENABLED: v.optional(identityConfigBooleanSchema, "false"),
  UNAUTHENTICATED_RATELIMIT_SECONDS: v.optional(identityConfigIntegerSchema, "60"),
  UNAUTHENTICATED_RATELIMIT_MAX_BURST: v.optional(identityConfigIntegerSchema, "50"),
})

export type IdentityConfig = v.InferOutput<typeof identityConfigSchema>
