import { expect, test } from "bun:test"
import { extensionEnvironmentResolve } from "../../../src/extension/api/extensionEnvironmentResolve.js"

test("extensionEnvironmentResolve resolves official US and EU locations", () => {
  expect(extensionEnvironmentResolve("us")).toEqual({
    success: true,
    data: {
      api: "https://api.bitwarden.com",
      identity: "https://identity.bitwarden.com",
      icons: "https://icons.bitwarden.com",
      notifications: "https://notifications.bitwarden.com",
      events: "https://events.bitwarden.com",
      webVault: "https://vault.bitwarden.com",
    },
  })
  expect(extensionEnvironmentResolve({ region: "eu" })).toMatchObject({
    success: true,
    data: { webVault: "https://vault.bitwarden.eu", events: "https://events.bitwarden.eu" },
  })
})

test("extensionEnvironmentResolve derives self-hosted locations and accepts overrides", () => {
  expect(extensionEnvironmentResolve("https://vault.example/onewarden")).toEqual({
    success: true,
    data: {
      api: "https://vault.example/onewarden/api",
      identity: "https://vault.example/onewarden/identity",
      icons: "https://vault.example/onewarden/icons",
      notifications: "https://vault.example/onewarden/notifications",
      events: "https://vault.example/onewarden/events",
      webVault: "https://vault.example/onewarden",
    },
  })
  expect(
    extensionEnvironmentResolve({ baseUrl: "https://vault.example", eventsUrl: "https://events.example" }),
  ).toMatchObject({
    success: true,
    data: { api: "https://vault.example/api", events: "https://events.example" },
  })
})
