import { expect, test } from "bun:test"
import { webAuthApiClientCreate } from "../../../src/web/auth/model/webAuthApiClientCreate.js"

test("webAuthApiClient makes two-factor challenge and setup API requests", async () => {
  const requests: Array<{ url: string; method: string; body: string; headers: Record<string, string> }> = []

  const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input)
    const method = init?.method ?? "GET"
    const body = String(init?.body ?? "")
    const headersObj: Record<string, string> = {}
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((val, key) => {
          headersObj[key] = val
        })
      } else if (typeof init.headers === "object") {
        Object.assign(headersObj, init.headers)
      }
    }
    requests.push({ url, method, body, headers: headersObj })

    if (url.endsWith("/api/two-factor") && method === "GET") {
      return new Response(
        JSON.stringify({
          data: [
            { enabled: true, type: 0, object: "twoFactorProvider" },
            { enabled: false, type: 1, object: "twoFactorProvider" },
          ],
          object: "list",
          continuationToken: null,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/two-factor/get-authenticator")) {
      return new Response(
        JSON.stringify({
          enabled: false,
          key: "JBSWY3DPEHPK3PXP",
          object: "twoFactorAuthenticator",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/two-factor/authenticator") && method === "PUT") {
      return new Response(
        JSON.stringify({
          enabled: true,
          key: "JBSWY3DPEHPK3PXP",
          object: "twoFactorAuthenticator",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/two-factor/authenticator") && method === "DELETE") {
      return new Response(
        JSON.stringify({
          enabled: false,
          type: 0,
          object: "twoFactorProvider",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/two-factor/send-email-login")) {
      return new Response(null, { status: 200 })
    }

    if (url.endsWith("/api/two-factor/get-email")) {
      return new Response(
        JSON.stringify({
          email: "user@example.com",
          enabled: true,
          object: "twoFactorEmail",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/two-factor/send-email")) {
      return new Response(null, { status: 200 })
    }

    if (url.endsWith("/api/two-factor/email") && method === "PUT") {
      return new Response(
        JSON.stringify({
          email: "user@example.com",
          enabled: true,
          object: "twoFactorEmail",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/two-factor/get-duo")) {
      return new Response(
        JSON.stringify({
          enabled: false,
          host: null,
          clientSecret: null,
          clientId: null,
          object: "twoFactorDuo",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/two-factor/duo") && method === "PUT") {
      return new Response(
        JSON.stringify({
          enabled: true,
          host: "api-xxxx.duosecurity.com",
          clientSecret: "secret",
          clientId: "client",
          object: "twoFactorDuo",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/two-factor/get-yubikey")) {
      return new Response(
        JSON.stringify({
          enabled: false,
          Key1: null,
          nfc: false,
          object: "twoFactorU2f",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/two-factor/yubikey") && method === "PUT") {
      return new Response(
        JSON.stringify({
          enabled: true,
          Key1: "abcdefghijkl",
          nfc: false,
          object: "twoFactorU2f",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/two-factor/get-webauthn")) {
      return new Response(
        JSON.stringify({
          enabled: true,
          keys: [{ id: 1, name: "YubiKey 5", migrated: false }],
          object: "twoFactorU2f",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/two-factor/get-webauthn-challenge")) {
      return new Response(
        JSON.stringify({
          challenge: "random-challenge-base64",
          rpId: "localhost",
          rpName: "OneWarden",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/two-factor/webauthn") && method === "PUT") {
      return new Response(
        JSON.stringify({
          enabled: true,
          keys: [{ id: 1, name: "YubiKey 5", migrated: false }],
          object: "twoFactorU2f",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/two-factor/webauthn") && method === "DELETE") {
      return new Response(
        JSON.stringify({
          enabled: false,
          keys: [],
          object: "twoFactorU2f",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/two-factor/get-recover")) {
      return new Response(
        JSON.stringify({
          code: "1234567890abcdef",
          object: "twoFactorRecover",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/two-factor/disable")) {
      return new Response(
        JSON.stringify({
          enabled: false,
          type: 1,
          object: "twoFactorProvider",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/two-factor/get-device-verification-settings")) {
      return new Response(
        JSON.stringify({
          isDeviceVerificationSectionEnabled: false,
          unknownDeviceVerificationEnabled: false,
          object: "deviceVerificationSettings",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    return new Response("Not found", { status: 404 })
  }

  const client = webAuthApiClientCreate({ fetch: fakeFetch })
  const token = "mock-access-token"

  const providers = await client.twoFactorProvidersGet(token)
  expect(providers.success).toBe(true)
  if (!providers.success) throw new Error(providers.errorMessage)
  expect(providers.data.data).toHaveLength(2)

  const authKey = await client.twoFactorAuthenticatorGet(token)
  expect(authKey.success).toBe(true)
  if (!authKey.success) throw new Error(authKey.errorMessage)
  expect(authKey.data.key).toBe("JBSWY3DPEHPK3PXP")

  const authActivate = await client.twoFactorAuthenticatorActivate(token, {
    key: "JBSWY3DPEHPK3PXP",
    token: 123456,
  })
  expect(authActivate.success).toBe(true)

  const authDisable = await client.twoFactorAuthenticatorDisable(token, {
    key: "JBSWY3DPEHPK3PXP",
    masterPasswordHash: "h",
    type: 0,
  })
  expect(authDisable.success).toBe(true)

  const emailSendLogin = await client.twoFactorEmailLoginSend({ email: "user@example.com" })
  expect(emailSendLogin.success).toBe(true)

  const emailDetails = await client.twoFactorEmailGet(token)
  expect(emailDetails.success).toBe(true)

  const emailSend = await client.twoFactorEmailSend(token, { email: "user@example.com" })
  expect(emailSend.success).toBe(true)

  const emailActivate = await client.twoFactorEmailActivate(token, { email: "user@example.com", token: "123456" })
  expect(emailActivate.success).toBe(true)

  const duoDetails = await client.twoFactorDuoGet(token)
  expect(duoDetails.success).toBe(true)

  const duoActivate = await client.twoFactorDuoActivate(token, {
    host: "api-xxxx.duosecurity.com",
    clientId: "c",
    clientSecret: "s",
  })
  expect(duoActivate.success).toBe(true)

  const yubiDetails = await client.twoFactorYubikeyGet(token)
  expect(yubiDetails.success).toBe(true)

  const yubiActivate = await client.twoFactorYubikeyActivate(token, { key1: "abcdefghijkl" })
  expect(yubiActivate.success).toBe(true)

  const webauthnDetails = await client.twoFactorWebAuthnGet(token)
  expect(webauthnDetails.success).toBe(true)

  const webauthnChallenge = await client.twoFactorWebAuthnChallengeGet(token)
  expect(webauthnChallenge.success).toBe(true)

  const webauthnActivate = await client.twoFactorWebAuthnActivate(token, { id: 1, name: "Key", deviceResponse: {} })
  expect(webauthnActivate.success).toBe(true)

  const webauthnDelete = await client.twoFactorWebAuthnDelete(token, { id: 1, masterPasswordHash: "h" })
  expect(webauthnDelete.success).toBe(true)

  const recover = await client.twoFactorRecoverGet(token)
  expect(recover.success).toBe(true)
  if (!recover.success) throw new Error(recover.errorMessage)
  expect(recover.data.code).toBe("1234567890abcdef")

  const disable = await client.twoFactorDisable(token, { type: 1 })
  expect(disable.success).toBe(true)

  const deviceSettings = await client.twoFactorDeviceVerificationSettingsGet(token)
  expect(deviceSettings.success).toBe(true)

  const authActivateRequest = requests.find(
    (request) => request.url.endsWith("/api/two-factor/authenticator") && request.method === "PUT",
  )
  if (!authActivateRequest) throw new Error("Authenticator activation request was not captured.")
  expect(JSON.parse(authActivateRequest.body)).toEqual({
    key: "JBSWY3DPEHPK3PXP",
    token: "123456",
    masterPasswordHash: null,
  })

  const yubikeyActivateRequest = requests.find((request) => request.url.endsWith("/api/two-factor/yubikey"))
  if (!yubikeyActivateRequest) throw new Error("YubiKey activation request was not captured.")
  expect(JSON.parse(yubikeyActivateRequest.body)).toEqual({
    key1: "abcdefghijkl",
    nfc: false,
    masterPasswordHash: null,
  })

  const disableRequest = requests.find((request) => request.url.endsWith("/api/two-factor/disable"))
  if (!disableRequest) throw new Error("Two-factor disable request was not captured.")
  expect(JSON.parse(disableRequest.body)).toEqual({ type: 1, masterPasswordHash: null })
})

test("webAuthApiClient rejects invalid two-factor request inputs before making requests", async () => {
  let requestCount = 0
  const client = webAuthApiClientCreate({
    fetch: async () => {
      requestCount += 1
      return new Response(null, { status: 204 })
    },
  })

  const invalid = await client.twoFactorYubikeyActivate("mock-access-token", {
    key1: 123 as unknown as string,
  })
  expect(invalid).toMatchObject({ success: false, code: "platform.invalid-request", statusCode: 400 })
  expect(requestCount).toBe(0)
})
