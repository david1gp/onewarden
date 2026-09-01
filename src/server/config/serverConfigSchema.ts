import * as v from "valibot"

const serverConfigHostSchema = v.pipe(v.string(), v.trim(), v.minLength(1))
const serverConfigPortSchema = v.pipe(
  v.string(),
  v.trim(),
  v.regex(/^\d+$/, "PORT must be an integer from 1 to 65535"),
  v.transform(Number),
  v.integer(),
  v.minValue(1),
  v.maxValue(65535),
)
const serverConfigDatabasePathSchema = v.pipe(v.string(), v.trim(), v.minLength(1))
const serverConfigAttachmentsFolderSchema = v.pipe(
  v.string(),
  v.trim(),
  v.minLength(1),
  v.check(
    serverConfigAttachmentsFolderIsValid,
    "ATTACHMENTS_FOLDER must be a local path or an s3://bucket/optional-prefix location.",
  ),
)
const serverConfigBackupFolderSchema = v.pipe(v.string(), v.trim(), v.minLength(1))
const serverConfigLogLevelSchema = v.picklist(["debug", "info", "warn", "error"])
const serverConfigProxySchema = v.pipe(
  v.string(),
  v.trim(),
  v.picklist(["false", "true"]),
  v.transform((value) => value === "true"),
)
const serverConfigS3EndpointSchema = v.pipe(
  v.string(),
  v.trim(),
  v.url(),
  v.check(serverConfigS3EndpointIsValid, "S3_ENDPOINT must be an HTTP or HTTPS URL."),
)
const serverConfigIpHeaderSchema = v.pipe(v.string(), v.trim())
const serverConfigIpHeaderTrustedProxiesSchema = v.pipe(v.string(), v.trim())
const serverConfigPublicOriginSchema = v.pipe(
  v.string(),
  v.trim(),
  v.url(),
  v.check(serverConfigPublicOriginIsSafe, "PUBLIC_ORIGIN must be an HTTPS URL or a localhost HTTP URL."),
)
const serverConfigSmtpHostSchema = v.pipe(v.string(), v.trim(), v.minLength(1))
const serverConfigSmtpPortSchema = v.pipe(
  v.string(),
  v.trim(),
  v.regex(/^\d+$/, "SMTP_PORT must be an integer from 1 to 65535"),
  v.transform(Number),
  v.integer(),
  v.minValue(1),
  v.maxValue(65535),
)
const serverConfigSmtpUsernameSchema = v.pipe(v.string(), v.trim())
const serverConfigSmtpPasswordSchema = v.string()
const serverConfigSmtpFromSchema = v.pipe(v.string(), v.trim(), v.email())
const serverConfigSmtpTimeoutSchema = v.pipe(
  v.string(),
  v.trim(),
  v.regex(/^\d+$/, "SMTP_TIMEOUT must be an integer from 1 to 120 seconds"),
  v.transform(Number),
  v.integer(),
  v.minValue(1),
  v.maxValue(120),
)
const serverConfigPushEnabledSchema = v.pipe(
  v.string(),
  v.trim(),
  v.picklist(["false", "true"]),
  v.transform((value) => value === "true"),
)
const serverConfigPushUriSchema = v.pipe(v.string(), v.trim())
const serverConfigPushCredentialSchema = v.pipe(v.string(), v.trim())
const serverConfigHibpApiKeySchema = v.pipe(v.string(), v.trim())
const serverConfigWebVaultFolderSchema = v.pipe(v.string(), v.trim(), v.minLength(1))
const serverConfigAdminTokenSchema = v.pipe(v.string(), v.trim())
const serverConfigAdminSessionLifetimeSchema = v.pipe(
  v.string(),
  v.trim(),
  v.regex(/^\d+$/, "ADMIN_SESSION_LIFETIME must be a positive integer"),
  v.transform(Number),
  v.integer(),
  v.minValue(1),
)
const serverConfigInvitationOrganizationNameSchema = v.pipe(v.string(), v.trim(), v.minLength(1))
const serverConfigOptionalNonNegativeIntegerSchema = v.optional(
  v.pipe(
    v.string(),
    v.trim(),
    v.regex(/^\d+$/, "The value must be a non-negative integer."),
    v.transform(Number),
    v.integer(),
    v.minValue(0),
  ),
)
const serverConfigJobIntervalSchema = (defaultValue: string) =>
  v.optional(
    v.pipe(
      v.string(),
      v.trim(),
      v.regex(/^\d+$/, "The value must be a non-negative integer."),
      v.transform(Number),
      v.integer(),
      v.minValue(0),
    ),
    defaultValue,
  )

export const serverConfigSchema = v.object({
  HOST: v.optional(serverConfigHostSchema, "127.0.0.1"),
  PORT: v.optional(serverConfigPortSchema, "3000"),
  DATABASE_PATH: v.optional(serverConfigDatabasePathSchema, "./data/onewarden.sqlite3"),
  SENDS_FOLDER: v.optional(serverConfigDatabasePathSchema, "./data/sends"),
  ATTACHMENTS_FOLDER: v.optional(serverConfigAttachmentsFolderSchema, "./data/attachments"),
  S3_ENDPOINT: v.optional(serverConfigS3EndpointSchema),
  S3_FORCE_PATH_STYLE: v.optional(serverConfigProxySchema, "false"),
  BACKUP_FOLDER: v.optional(serverConfigBackupFolderSchema, "./data/backups"),
  SENDS_ALLOWED: v.optional(serverConfigProxySchema, "true"),
  USER_SEND_LIMIT: serverConfigOptionalNonNegativeIntegerSchema,
  INCREASE_NOTE_SIZE_LIMIT: v.optional(serverConfigProxySchema, "false"),
  LOG_LEVEL: v.optional(serverConfigLogLevelSchema, "info"),
  PROXY: v.optional(serverConfigProxySchema, "false"),
  IP_HEADER: v.optional(serverConfigIpHeaderSchema, "X-Real-IP"),
  IP_HEADER_TRUSTED_PROXIES: v.optional(serverConfigIpHeaderTrustedProxiesSchema, "local"),
  ENABLE_WEBSOCKET: v.optional(serverConfigProxySchema, "true"),
  PUBLIC_ORIGIN: v.optional(serverConfigPublicOriginSchema),
  SMTP_HOST: v.optional(serverConfigSmtpHostSchema),
  SMTP_PORT: v.optional(serverConfigSmtpPortSchema, "587"),
  SMTP_USERNAME: v.optional(serverConfigSmtpUsernameSchema),
  SMTP_PASSWORD: v.optional(serverConfigSmtpPasswordSchema),
  SMTP_FROM: v.optional(serverConfigSmtpFromSchema),
  SMTP_TIMEOUT: v.optional(serverConfigSmtpTimeoutSchema, "15"),
  PUSH_ENABLED: v.optional(serverConfigPushEnabledSchema, "false"),
  PUSH_RELAY_URI: v.optional(serverConfigPushUriSchema, "https://push.bitwarden.com"),
  PUSH_IDENTITY_URI: v.optional(serverConfigPushUriSchema, "https://identity.bitwarden.com"),
  PUSH_INSTALLATION_ID: v.optional(serverConfigPushCredentialSchema, ""),
  PUSH_INSTALLATION_KEY: v.optional(serverConfigPushCredentialSchema, ""),
  HIBP_API_KEY: v.optional(serverConfigHibpApiKeySchema),
  WEB_VAULT_ENABLED: v.optional(serverConfigProxySchema, "true"),
  WEB_VAULT_FOLDER: v.optional(serverConfigWebVaultFolderSchema, "./build/web"),
  ADMIN_TOKEN: v.optional(serverConfigAdminTokenSchema),
  DISABLE_ADMIN_TOKEN: v.optional(serverConfigProxySchema, "false"),
  ADMIN_SESSION_LIFETIME: v.optional(serverConfigAdminSessionLifetimeSchema, "20"),
  INVITATION_ORG_NAME: v.optional(serverConfigInvitationOrganizationNameSchema, "Vaultwarden"),
  JOB_SEND_PURGE_INTERVAL: serverConfigJobIntervalSchema("3600"),
  JOB_AUTH_REQUEST_PURGE_INTERVAL: serverConfigJobIntervalSchema("3600"),
  JOB_EVENT_PURGE_INTERVAL: serverConfigJobIntervalSchema("3600"),
  JOB_EMERGENCY_ACCESS_TIMEOUT_INTERVAL: serverConfigJobIntervalSchema("3600"),
  JOB_EMERGENCY_ACCESS_REMINDER_INTERVAL: serverConfigJobIntervalSchema("3600"),
  JOB_INCOMPLETE_2FA_NOTIFICATION_INTERVAL: serverConfigJobIntervalSchema("60"),
  JOB_TRASH_PURGE_INTERVAL: serverConfigJobIntervalSchema("86400"),
  JOB_INCOMPLETE_SSO_PURGE_INTERVAL: serverConfigJobIntervalSchema("86400"),
  JOB_SESSION_HANDOFF_PURGE_INTERVAL: serverConfigJobIntervalSchema("60"),
})

export type ServerConfig = v.InferOutput<typeof serverConfigSchema>

function serverConfigAttachmentsFolderIsValid(value: string): boolean {
  if (!/^s3:/i.test(value)) return true
  if (!value.startsWith("s3://")) return false
  try {
    const url = new URL(value)
    return (
      url.protocol === "s3:" &&
      url.hostname.length > 0 &&
      url.username === "" &&
      url.password === "" &&
      url.port === "" &&
      url.search === "" &&
      url.hash === "" &&
      !url.pathname.startsWith("//")
    )
  } catch {
    return false
  }
}

function serverConfigS3EndpointIsValid(value: string): boolean {
  try {
    const url = new URL(value)
    return (url.protocol === "http:" || url.protocol === "https:") && url.username === "" && url.password === ""
  } catch {
    return false
  }
}

function serverConfigPublicOriginIsSafe(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.username !== "" || url.password !== "") return false
    if (url.protocol === "https:") return true
    if (url.protocol !== "http:") return false
    return serverConfigPublicOriginIsLocal(url.hostname)
  } catch {
    return false
  }
}

function serverConfigPublicOriginIsLocal(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase()
  return (
    normalizedHostname === "localhost" ||
    normalizedHostname.endsWith(".localhost") ||
    normalizedHostname === "127.0.0.1" ||
    normalizedHostname === "[::1]" ||
    normalizedHostname === "::1"
  )
}
