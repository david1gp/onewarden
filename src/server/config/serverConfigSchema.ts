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
const serverConfigLogLevelSchema = v.picklist(["debug", "info", "warn", "error"])
const serverConfigProxySchema = v.pipe(
  v.string(),
  v.trim(),
  v.picklist(["false", "true"]),
  v.transform((value) => value === "true"),
)
const serverConfigPublicOriginSchema = v.pipe(v.string(), v.trim(), v.url())
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

export const serverConfigSchema = v.object({
  HOST: v.optional(serverConfigHostSchema, "127.0.0.1"),
  PORT: v.optional(serverConfigPortSchema, "3000"),
  DATABASE_PATH: v.optional(serverConfigDatabasePathSchema, "./data/onewarden.sqlite3"),
  SENDS_FOLDER: v.optional(serverConfigDatabasePathSchema, "./data/sends"),
  SENDS_ALLOWED: v.optional(serverConfigProxySchema, "true"),
  USER_SEND_LIMIT: serverConfigOptionalNonNegativeIntegerSchema,
  INCREASE_NOTE_SIZE_LIMIT: v.optional(serverConfigProxySchema, "false"),
  LOG_LEVEL: v.optional(serverConfigLogLevelSchema, "info"),
  PROXY: v.optional(serverConfigProxySchema, "false"),
  ENABLE_WEBSOCKET: v.optional(serverConfigProxySchema, "true"),
  PUBLIC_ORIGIN: v.optional(serverConfigPublicOriginSchema),
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
})

export type ServerConfig = v.InferOutput<typeof serverConfigSchema>
