import { afterEach, expect, test } from "bun:test"
import { createHmac } from "node:crypto"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { twoFactorAdaptersCreate } from "../../../src/server/contexts/twoFactor/twoFactorAdaptersCreate.js"
import type { TwoFactorWebAuthnState } from "../../../src/server/contexts/twoFactor/twoFactorAdapters.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

test("the production Duo adapter validates credentials and legacy signed responses", async () => {
  let requestUrl: string | undefined
  let requestHeaders: Headers | undefined
  globalThis.fetch = (async (input, init) => {
    requestUrl = String(input)
    requestHeaders = new Headers(init?.headers)
    return new Response("{}", { status: 200 })
  }) as typeof fetch
  const credentials = { clientId: "DIuser", clientSecret: "user-secret", host: "api-user.duosecurity.com" }
  const adapters = twoFactorAdaptersCreate(undefined, undefined, clockTestCreate("2026-08-28T00:00:00.000Z"))
  expect(await adapters.duo?.credentialsValidate?.(credentials)).toEqual({ success: true, data: undefined })
  expect(requestUrl).toBe("https://api-user.duosecurity.com/auth/v2/check")
  expect(requestHeaders?.get("authorization")).toMatch(/^Basic /u)
  expect(requestHeaders?.get("date")).not.toBeNull()

  const expires = Math.floor(new Date("2026-08-28T00:05:00.000Z").getTime() / 1_000)
  const auth = duoSignedValueCreate(credentials.clientSecret, "AUTH", "duo@example.com", credentials.clientId, expires)
  const app = duoSignedValueCreate(credentials.clientSecret, "APP", "duo@example.com", credentials.clientId, expires)
  expect(
    await adapters.duo?.loginValidate?.({
      credentials,
      email: "duo@example.com",
      state: null,
      token: `${auth}:${app}`,
    }),
  ).toEqual({ success: true, data: undefined })
  expect(
    await adapters.duo?.loginValidate?.({
      credentials,
      email: "duo@example.com",
      state: null,
      token: `${auth}:${app}`,
    }),
  ).toEqual({ success: true, data: undefined })
})

test("the production Yubico adapter verifies the signed OTP response", async () => {
  const otp = `abcdefghijkl${"m".repeat(32)}`
  const secret = "yubico-secret"
  const encodedSecret = Buffer.from(secret).toString("base64")
  globalThis.fetch = (async (input) => {
    const url = new URL(String(input))
    const fields: Record<string, string> = {
      nonce: url.searchParams.get("nonce") ?? "",
      otp: url.searchParams.get("otp") ?? "",
      sl: "secure",
      status: "OK",
      timestamp: "2026-08-28T00:00:00Z",
    }
    const signed = Object.entries(fields)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join("&")
    fields.h = createHmac("sha1", secret).update(signed).digest("base64")
    return new Response(
      Object.entries(fields)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n"),
      { status: 200 },
    )
  }) as typeof fetch
  const adapters = twoFactorAdaptersCreate(
    undefined,
    identityConfigCreate({
      YUBICO_CLIENT_ID: "123456",
      YUBICO_ENABLED: true,
      YUBICO_SECRET_KEY: encodedSecret,
      YUBICO_SERVER: "https://yubico.example/wsapi/2.0/verify",
    }),
  )
  expect(await adapters.yubikey?.otpValidate?.(otp)).toEqual({ success: true, data: undefined })
})

test("the production WebAuthn adapter rejects expired ceremony state", async () => {
  const state: TwoFactorWebAuthnState = {
    challenge: "challenge",
    credentialIds: [],
    expiresAt: Math.floor(new Date("2026-08-28T00:00:00.000Z").getTime() / 1_000) - 1,
    kind: "registration",
    origin: "https://vault.example",
    rpId: "vault.example",
    userUuid: "user",
  }
  const adapters = twoFactorAdaptersCreate(undefined, undefined, clockTestCreate("2026-08-28T00:00:00.000Z"))
  expect(await adapters.webauthn?.registrationValidate?.({}, state)).toMatchObject({
    success: false,
    errorMessage: "Webauthn registration challenge expired",
  })
})

function duoSignedValueCreate(
  secret: string,
  prefix: string,
  email: string,
  clientId: string,
  expires: number,
): string {
  const encoded = Buffer.from(`${email}|${clientId}|${expires}`).toString("base64")
  const signature = createHmac("sha1", secret).update(`${prefix}|${encoded}`).digest("hex")
  return `${prefix}|${encoded}|${signature}`
}
