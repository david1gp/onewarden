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
      SENDS_ALLOWED: true,
      USER_SEND_LIMIT: undefined,
      INCREASE_NOTE_SIZE_LIMIT: false,
      LOG_LEVEL: "info",
      PROXY: false,
      ENABLE_WEBSOCKET: true,
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
      SENDS_FOLDER: "./data/sends",
      SENDS_ALLOWED: true,
      USER_SEND_LIMIT: undefined,
      INCREASE_NOTE_SIZE_LIMIT: true,
      ENABLE_WEBSOCKET: true,
      PUBLIC_ORIGIN: "https://vault.example.com",
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
    },
  })
})

test("serverConfigLoad rejects invalid log level, proxy, and public origin", () => {
  const result = serverConfigLoad({ LOG_LEVEL: "trace", PROXY: "yes", PUBLIC_ORIGIN: "not a URL" })

  expect(result.success).toBe(false)
  expect(result).toMatchObject({ op: "serverConfigLoad", success: false })
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

test("serverConfigLoad parses the global sends policy", () => {
  const result = serverConfigLoad({ SENDS_ALLOWED: "false" })

  expect(result).toMatchObject({ success: true, data: { SENDS_ALLOWED: false } })
})
