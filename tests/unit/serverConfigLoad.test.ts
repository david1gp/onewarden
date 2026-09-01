import { expect, test } from "bun:test"
import { serverConfigLoad } from "../../src/server/config/serverConfigLoad.js"

test("serverConfigLoad applies defaults for known runtime settings", () => {
  const result = serverConfigLoad({})

  expect(result).toEqual({
    success: true,
    data: {
      HOST: "127.0.0.1",
      PORT: 3000,
      DATABASE_PATH: "./data/onewarden.sqlite3",
      SENDS_FOLDER: "./data/sends",
      ATTACHMENTS_FOLDER: "./data/attachments",
      S3_FORCE_PATH_STYLE: false,
      BACKUP_FOLDER: "./data/backups",
      SENDS_ALLOWED: true,
      INCREASE_NOTE_SIZE_LIMIT: false,
      LOG_LEVEL: "info",
      PROXY: false,
      IP_HEADER: "X-Real-IP",
      IP_HEADER_TRUSTED_PROXIES: "local",
      ENABLE_WEBSOCKET: true,
      SMTP_PORT: 587,
      SMTP_TIMEOUT: 15,
      PUSH_ENABLED: false,
      PUSH_RELAY_URI: "https://push.bitwarden.com",
      PUSH_IDENTITY_URI: "https://identity.bitwarden.com",
      PUSH_INSTALLATION_ID: "",
      PUSH_INSTALLATION_KEY: "",
      WEB_VAULT_ENABLED: true,
      WEB_VAULT_FOLDER: "./build/web",
      DISABLE_ADMIN_TOKEN: false,
      ADMIN_SESSION_LIFETIME: 20,
      INVITATION_ORG_NAME: "Vaultwarden",
      JOB_SEND_PURGE_INTERVAL: 3600,
      JOB_AUTH_REQUEST_PURGE_INTERVAL: 3600,
      JOB_EVENT_PURGE_INTERVAL: 3600,
      JOB_EMERGENCY_ACCESS_TIMEOUT_INTERVAL: 3600,
      JOB_EMERGENCY_ACCESS_REMINDER_INTERVAL: 3600,
      JOB_INCOMPLETE_2FA_NOTIFICATION_INTERVAL: 60,
      JOB_TRASH_PURGE_INTERVAL: 86400,
      JOB_INCOMPLETE_SSO_PURGE_INTERVAL: 86400,
      JOB_SESSION_HANDOFF_PURGE_INTERVAL: 60,
    },
  })
})

test("serverConfigLoad parses and validates known runtime settings", () => {
  const result = serverConfigLoad({
    DATABASE_PATH: " /var/lib/onewarden/db.sqlite3 ",
    HOST: "0.0.0.0",
    INCREASE_NOTE_SIZE_LIMIT: "true",
    LOG_LEVEL: "debug",
    PORT: "8080",
    PROXY: "true",
    IP_HEADER: "CF-Connecting-IP",
    IP_HEADER_TRUSTED_PROXIES: "10.0.0.0/8, 2001:db8::/32",
    PUBLIC_ORIGIN: "https://vault.example.com",
  })

  expect(result).toEqual({
    success: true,
    data: {
      DATABASE_PATH: "/var/lib/onewarden/db.sqlite3",
      HOST: "0.0.0.0",
      LOG_LEVEL: "debug",
      PORT: 8080,
      PROXY: true,
      IP_HEADER: "CF-Connecting-IP",
      IP_HEADER_TRUSTED_PROXIES: "10.0.0.0/8, 2001:db8::/32",
      ATTACHMENTS_FOLDER: "./data/attachments",
      S3_FORCE_PATH_STYLE: false,
      SENDS_FOLDER: "./data/sends",
      BACKUP_FOLDER: "./data/backups",
      SENDS_ALLOWED: true,
      INCREASE_NOTE_SIZE_LIMIT: true,
      ENABLE_WEBSOCKET: true,
      PUBLIC_ORIGIN: "https://vault.example.com",
      SMTP_PORT: 587,
      SMTP_TIMEOUT: 15,
      PUSH_ENABLED: false,
      PUSH_RELAY_URI: "https://push.bitwarden.com",
      PUSH_IDENTITY_URI: "https://identity.bitwarden.com",
      PUSH_INSTALLATION_ID: "",
      PUSH_INSTALLATION_KEY: "",
      WEB_VAULT_ENABLED: true,
      WEB_VAULT_FOLDER: "./build/web",
      DISABLE_ADMIN_TOKEN: false,
      ADMIN_SESSION_LIFETIME: 20,
      INVITATION_ORG_NAME: "Vaultwarden",
      JOB_SEND_PURGE_INTERVAL: 3600,
      JOB_AUTH_REQUEST_PURGE_INTERVAL: 3600,
      JOB_EVENT_PURGE_INTERVAL: 3600,
      JOB_EMERGENCY_ACCESS_TIMEOUT_INTERVAL: 3600,
      JOB_EMERGENCY_ACCESS_REMINDER_INTERVAL: 3600,
      JOB_INCOMPLETE_2FA_NOTIFICATION_INTERVAL: 60,
      JOB_TRASH_PURGE_INTERVAL: 86400,
      JOB_INCOMPLETE_SSO_PURGE_INTERVAL: 86400,
      JOB_SESSION_HANDOFF_PURGE_INTERVAL: 60,
    },
  })
})

test("serverConfigLoad rejects invalid log level, proxy, public origin, and trusted proxy", () => {
  const result = serverConfigLoad({ LOG_LEVEL: "trace", PROXY: "yes", PUBLIC_ORIGIN: "not a URL" })

  expect(result.success).toBe(false)
  expect(result).toMatchObject({ op: "serverConfigLoad", success: false })
  expect(serverConfigLoad({ IP_HEADER_TRUSTED_PROXIES: "not-an-ip" }).success).toBe(false)
})

test("serverConfigLoad validates production origin and enabled mail settings", () => {
  const missingOrigin = serverConfigLoad({ NODE_ENV: "production" })
  expect(missingOrigin.success).toBe(false)
  if (missingOrigin.success) return
  expect(missingOrigin.errorMessage).toBe("PUBLIC_ORIGIN is required in production.")
  const insecureOrigin = serverConfigLoad({ NODE_ENV: "production", PUBLIC_ORIGIN: "http://localhost:3000" })
  expect(insecureOrigin.success).toBe(false)
  if (insecureOrigin.success) return
  expect(insecureOrigin.errorMessage).toBe("PUBLIC_ORIGIN must use HTTPS in production.")
  expect(
    serverConfigLoad({
      MAIL_ENABLED: "true",
      PUBLIC_ORIGIN: "https://onewarden.example.com",
      SMTP_HOST: "email.example.com",
      SMTP_FROM: "auth@example.com",
      SMTP_USERNAME: "auth@example.com",
      SMTP_PASSWORD: "secret-password",
    }),
  ).toMatchObject({ success: true })
  const missingMailSettings = serverConfigLoad({
    MAIL_ENABLED: "true",
    PUBLIC_ORIGIN: "https://onewarden.example.com",
  })
  expect(missingMailSettings.success).toBe(false)
  if (missingMailSettings.success) return
  expect(missingMailSettings.errorMessage).toBe(
    "MAIL_ENABLED requires SMTP_HOST, SMTP_FROM, SMTP_USERNAME, SMTP_PASSWORD.",
  )
})

test("serverConfigLoad does not include invalid SMTP values in errors", () => {
  const result = serverConfigLoad({ SMTP_FROM: "smtp-password-value" })

  expect(result.success).toBe(false)
  if (result.success) return
  expect(result.errorMessage).not.toContain("smtp-password-value")
  expect(result.errorMessage).toContain("SMTP_FROM")
})

test("serverConfigLoad requires SMTP credentials as a pair", () => {
  const missingPassword = serverConfigLoad({ SMTP_USERNAME: "auth@example.com" })
  expect(missingPassword.success).toBe(false)
  if (missingPassword.success) return
  expect(missingPassword.errorMessage).toBe("SMTP_USERNAME and SMTP_PASSWORD must be set together.")
  const missingUsername = serverConfigLoad({ SMTP_PASSWORD: "secret-password" })
  expect(missingUsername.success).toBe(false)
  if (missingUsername.success) return
  expect(missingUsername.errorMessage).toBe("SMTP_USERNAME and SMTP_PASSWORD must be set together.")
})

test("serverConfigLoad bounds SMTP port and timeout values", () => {
  expect(serverConfigLoad({ SMTP_PORT: "2525", SMTP_TIMEOUT: "30" })).toMatchObject({
    success: true,
    data: { SMTP_PORT: 2525, SMTP_TIMEOUT: 30 },
  })
  expect(serverConfigLoad({ SMTP_PORT: "0" }).success).toBe(false)
  expect(serverConfigLoad({ SMTP_TIMEOUT: "121" }).success).toBe(false)
})

test("serverConfigLoad allows localhost HTTP origins only for development", () => {
  expect(serverConfigLoad({ PUBLIC_ORIGIN: "http://localhost:3000" })).toMatchObject({
    success: true,
    data: { PUBLIC_ORIGIN: "http://localhost:3000" },
  })
  expect(serverConfigLoad({ PUBLIC_ORIGIN: "http://onewarden.example.com" }).success).toBe(false)
})

test("serverConfigLoad validates enabled push relay credentials and HTTPS endpoints", () => {
  const result = serverConfigLoad({
    PUSH_ENABLED: "true",
    PUSH_IDENTITY_URI: "https://identity.example",
    PUSH_INSTALLATION_ID: "installation-id",
    PUSH_INSTALLATION_KEY: "installation-key",
    PUSH_RELAY_URI: "https://relay.example",
  })

  expect(result).toMatchObject({
    success: true,
    data: {
      PUSH_ENABLED: true,
      PUSH_IDENTITY_URI: "https://identity.example",
      PUSH_INSTALLATION_ID: "installation-id",
      PUSH_INSTALLATION_KEY: "installation-key",
      PUSH_RELAY_URI: "https://relay.example",
    },
  })
  expect(serverConfigLoad({ PUSH_ENABLED: "true" }).success).toBe(false)
  expect(
    serverConfigLoad({
      PUSH_ENABLED: "true",
      PUSH_IDENTITY_URI: "http://identity.example",
      PUSH_INSTALLATION_ID: "installation-id",
      PUSH_INSTALLATION_KEY: "installation-key",
      PUSH_RELAY_URI: "https://relay.example",
    }).success,
  ).toBe(false)
})

test("serverConfigLoad parses web vault settings", () => {
  const result = serverConfigLoad({ WEB_VAULT_ENABLED: "false", WEB_VAULT_FOLDER: " /srv/onewarden/web " })

  expect(result).toMatchObject({
    success: true,
    data: { WEB_VAULT_ENABLED: false, WEB_VAULT_FOLDER: "/srv/onewarden/web" },
  })
})

test("serverConfigLoad trims the optional HIBP API key", () => {
  expect(serverConfigLoad({ HIBP_API_KEY: "  secret-key  " })).toMatchObject({
    success: true,
    data: { HIBP_API_KEY: "secret-key" },
  })
})

test("serverConfigLoad parses the global sends policy", () => {
  const result = serverConfigLoad({ SENDS_ALLOWED: "false" })

  expect(result).toMatchObject({ success: true, data: { SENDS_ALLOWED: false } })
})

test("serverConfigLoad trims a custom attachment folder", () => {
  expect(serverConfigLoad({ ATTACHMENTS_FOLDER: " /var/lib/onewarden/attachments " })).toMatchObject({
    success: true,
    data: { ATTACHMENTS_FOLDER: "/var/lib/onewarden/attachments" },
  })
})

test("serverConfigLoad accepts S3 attachment locations and compatible client settings", () => {
  expect(serverConfigLoad({ ATTACHMENTS_FOLDER: " s3://attachments " })).toMatchObject({
    success: true,
    data: { ATTACHMENTS_FOLDER: "s3://attachments" },
  })
  expect(
    serverConfigLoad({
      ATTACHMENTS_FOLDER: "s3://attachments/onewarden/encrypted",
      S3_ENDPOINT: " http://minio.internal:9000 ",
      S3_FORCE_PATH_STYLE: "true",
    }),
  ).toMatchObject({
    success: true,
    data: {
      ATTACHMENTS_FOLDER: "s3://attachments/onewarden/encrypted",
      S3_ENDPOINT: "http://minio.internal:9000",
      S3_FORCE_PATH_STYLE: true,
    },
  })
})

test("serverConfigLoad rejects malformed S3 attachment locations", () => {
  for (const ATTACHMENTS_FOLDER of [
    "s3://",
    "s3:///prefix",
    "s3:/attachments",
    "S3://attachments",
    "s3://bucket?key=value",
  ])
    expect(serverConfigLoad({ ATTACHMENTS_FOLDER }).success).toBe(false)
})

test("serverConfigLoad rejects malformed S3-compatible client settings", () => {
  expect(serverConfigLoad({ S3_ENDPOINT: "ftp://storage.example.com" }).success).toBe(false)
  expect(serverConfigLoad({ S3_ENDPOINT: "https://user:secret@storage.example.com" }).success).toBe(false)
  expect(serverConfigLoad({ S3_FORCE_PATH_STYLE: "yes" }).success).toBe(false)
})

test("serverConfigLoad parses independent scheduled-job intervals and allows disabling them", () => {
  expect(
    serverConfigLoad({
      JOB_AUTH_REQUEST_PURGE_INTERVAL: " 0 ",
      JOB_SEND_PURGE_INTERVAL: "90",
    }),
  ).toMatchObject({
    success: true,
    data: { JOB_AUTH_REQUEST_PURGE_INTERVAL: 0, JOB_SEND_PURGE_INTERVAL: 90 },
  })
  expect(serverConfigLoad({ JOB_EVENT_PURGE_INTERVAL: "-1" }).success).toBe(false)
})
