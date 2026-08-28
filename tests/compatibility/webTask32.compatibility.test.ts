import { expect, test } from "bun:test"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"

test("task 32 exposes the Vaultwarden web and core metadata contract", async () => {
  const app = serverAppCreate({ web: { publicOrigin: "https://vault.example" } })

  const configResponse = await app.request("https://vault.example/api/config")
  expect(configResponse.status).toBe(200)
  expect(configResponse.headers.get("content-type")).toBe("application/json")
  expect(await configResponse.json()).toEqual({
    communication: null,
    environment: {
      api: "https://vault.example/api",
      cloudRegion: null,
      identity: "https://vault.example/identity",
      notifications: "https://vault.example/notifications",
      sso: "",
      vault: "https://vault.example",
    },
    featureStates: { "pm-19148-innovation-archive": true },
    gitHash: null,
    object: "config",
    push: { pushTechnology: 0, vapidPublicKey: null },
    server: { name: "Vaultwarden", url: "https://github.com/dani-garcia/vaultwarden" },
    settings: { disableUserRegistration: false, suppressOnboardingInterstitials: false },
    version: "2026.6.0",
  })

  const appIdResponse = await app.request("https://vault.example/app-id.json")
  expect(await appIdResponse.json()).toEqual({
    trustedFacets: [
      {
        ids: [
          "https://vault.example",
          "ios:bundle-id:com.8bit.bitwarden",
          "android:apk-key-hash:dUGFzUzf3lmHSLBDBIv+WaFyZMI",
        ],
        version: { major: 1, minor: 0 },
      },
    ],
  })

  const notFoundResponse = await app.request("https://vault.example/legacy-client-route")
  expect(notFoundResponse.status).toBe(404)
  expect(notFoundResponse.headers.get("content-type")).toContain("text/html")
})
