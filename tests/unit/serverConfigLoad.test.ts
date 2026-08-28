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
      LOG_LEVEL: "info",
      PROXY: false,
    },
  })
})

test("serverConfigLoad parses and validates known runtime settings", () => {
  const result = serverConfigLoad({
    DATABASE_PATH: " /var/lib/onewarden/db.sqlite3 ",
    HOST: "0.0.0.0",
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
      PUBLIC_ORIGIN: "https://vault.example.com",
    },
  })
})

test("serverConfigLoad rejects invalid log level, proxy, and public origin", () => {
  const result = serverConfigLoad({ LOG_LEVEL: "trace", PROXY: "yes", PUBLIC_ORIGIN: "not a URL" })

  expect(result.success).toBe(false)
  expect(result).toMatchObject({ op: "serverConfigLoad", success: false })
})
