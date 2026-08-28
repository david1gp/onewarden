import { afterEach, expect, test } from "bun:test"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { identitySsoAdapterCreate } from "../../../src/server/contexts/identity/identitySsoAdapterCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

test("SSO adapter discovers the provider and builds authorization parameters", async () => {
  const calls: string[] = []
  globalThis.fetch = Object.assign(
    async (input: Parameters<typeof fetch>[0]) => {
      calls.push(String(input))
      return new Response(
        JSON.stringify({
          authorization_endpoint: "https://idp.example/authorize",
          token_endpoint: "https://idp.example/token",
          userinfo_endpoint: "https://idp.example/userinfo",
        }),
        { headers: { "content-type": "application/json" } },
      )
    },
    { preconnect: originalFetch.preconnect },
  )
  const adapter = identitySsoAdapterCreate(
    identityConfigCreate({ SSO_AUTHORITY: "https://idp.example", SSO_CLIENT_ID: "client-id" }),
    "https://vault.example/",
    clockTestCreate("2026-08-28T00:00:00.000Z"),
  )
  const result = await adapter.authorize({
    clientId: "web",
    rawRedirectUri: "ignored",
    redirectUri: "https://vault.example/sso-connector.html",
    state: "state",
    clientChallenge: "challenge",
  })
  expect(result.success).toBe(true)
  expect(calls).toEqual(["https://idp.example/.well-known/openid-configuration"])
  if (!result.success) return
  const url = new URL(result.data.authorizationUrl)
  expect(url.searchParams).toMatchObject({})
  expect(url.searchParams.get("client_id")).toBe("client-id")
  expect(url.searchParams.get("redirect_uri")).toBe("https://vault.example/sso-connector.html")
  expect(url.searchParams.get("code_challenge_method")).toBe("S256")
})
