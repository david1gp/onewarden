import { afterEach, expect, test } from "bun:test"
import { identityConfigCreate } from "../../src/server/contexts/identity/identityConfigCreate.js"
import { identityMailAdapterCreate } from "../../src/server/contexts/identity/identityMailAdapterCreate.js"
import type { Result } from "#result"
import type { IdentityUser } from "../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../src/server/contexts/identity/identityUserSave.js"
import { databaseClose } from "../../src/server/database/databaseClose.js"
import type { DatabaseConnection } from "../../src/server/database/database.js"
import { databaseTestCreate } from "../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import { clockTestCreate } from "../../src/shared/clock/clockTestCreate.js"
import { passwordHashCreate } from "../../src/shared/crypto/passwordHashCreate.js"
import { resultCreate } from "../../src/shared/result/resultCreate.js"
import { resultErrorCreate } from "../../src/shared/result/resultErrorCreate.js"
import upstreamRouteManifest from "../../tools/compatibility/upstream-route-manifest.json"
import { rsaKeyPairGenerate } from "../../src/shared/crypto/rsaKeyPairGenerate.js"
import { twoFactorProviderType } from "../../src/server/contexts/twoFactor/twoFactorProviderType.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const databases: DatabaseConnection[] = []

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("Yubikey setup aliases, provider listing, adapter validation, and password login stay compatible", async () => {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  databases.push(databaseResult.data)
  const database = databaseResult.data
  const salt = Uint8Array.from({ length: 64 }, (_, index) => index + 1)
  const passwordResult = await passwordHashCreate("correct-client-password-hash", salt, 100_000)
  if (!passwordResult.success) throw new Error(passwordResult.errorMessage)
  const user: IdentityUser = {
    uuid: "00000000-0000-4000-8000-000000000050",
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: "2026-08-27T00:00:00.000Z",
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "yubikey@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Yubikey Example",
    passwordHash: passwordResult.data,
    salt,
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "wrapped-user-key",
    privateKey: "encrypted-private-key",
    publicKey: "public-key",
    securityStamp: "00000000-0000-4000-8000-000000000051",
    stampException: null,
    equivalentDomains: "[]",
    excludedGlobals: "[]",
    clientKdfType: 0,
    clientKdfIter: 100_000,
    clientKdfMemory: null,
    clientKdfParallelism: null,
    apiKey: null,
    avatarColor: null,
    externalId: null,
  }
  const saveResult = identityUserSave(database, user)
  if (!saveResult.success) throw new Error(saveResult.errorMessage)
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const mail = identityMailAdapterCreate(clock)
  const activationToken = `abcdefghijkl${"m".repeat(32)}`
  const loginToken = `abcdefghijkl${"n".repeat(32)}`
  const usedTokens = new Set<string>()
  const app = serverAppCreate({
    clock,
    database,
    identity: {
      clock,
      config: identityConfigCreate({
        PASSWORD_ITERATIONS: 100_000,
        YUBICO_ENABLED: true,
        YUBICO_CLIENT_ID: "123456",
        YUBICO_SECRET_KEY: "secret-key",
      }),
      database,
      identifier: { uuid: () => "00000000-0000-4000-8000-000000000099" },
      mail,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      rateLimiter: { check: () => resultCreate(undefined) },
      twoFactor: {
        yubikey: {
          otpValidate: async (otp) => {
            if (usedTokens.has(otp)) return resultErrorCreate("yubico", "OTP has already been used")
            usedTokens.add(otp)
            return resultCreate(undefined)
          },
        },
      },
    },
  })
  const form = (overrides: Record<string, string> = {}) => ({
    grant_type: "password",
    client_id: "web",
    password: "correct-client-password-hash",
    scope: "api offline_access",
    username: user.email,
    device_identifier: "yubikey-device",
    device_name: "Yubikey Device",
    device_type: "6",
    ...overrides,
  })
  const requestForm = (values: Record<string, string>) =>
    app.request("https://vault.example/identity/connect/token", {
      body: new URLSearchParams(values).toString(),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
    })
  const requestJson = (path: string, body: unknown, token: string, method: "GET" | "POST" | "PUT" = "POST") => {
    const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" }
    if (method === "GET") return app.request(`https://vault.example${path}`, { headers, method })
    return app.request(`https://vault.example${path}`, { body: JSON.stringify(body), headers, method })
  }

  const initialLogin = await requestForm(form())
  expect(initialLogin.status).toBe(200)
  const initialLoginBody = (await initialLogin.json()) as { access_token: string }
  const activation = await requestJson(
    "/api/two-factor/yubikey",
    {
      key1: activationToken,
      master_password_hash: "correct-client-password-hash",
      nfc: false,
    },
    initialLoginBody.access_token,
    "PUT",
  )
  expect(activation.status).toBe(200)
  expect(await activation.json()).toMatchObject({
    Key1: "abcdefghijkl",
    enabled: true,
    nfc: false,
    object: "twoFactorU2f",
  })

  const configured = await requestJson(
    "/api/two-factor/get-yubikey",
    { MasterPasswordHash: "correct-client-password-hash" },
    initialLoginBody.access_token,
  )
  expect(configured.status).toBe(200)
  expect(await configured.json()).toMatchObject({ Key1: "abcdefghijkl", enabled: true, object: "twoFactorU2f" })
  const providers = await requestJson("/api/two-factor", {}, initialLoginBody.access_token, "GET")
  expect(await providers.json()).toMatchObject({ data: [{ enabled: true, type: twoFactorProviderType.yubikey }] })

  const challenge = await requestForm(form({ device_identifier: "yubikey-login-device" }))
  expect(challenge.status).toBe(400)
  expect(await challenge.json()).toMatchObject({
    TwoFactorProviders: [String(twoFactorProviderType.yubikey)],
    TwoFactorProviders2: { [String(twoFactorProviderType.yubikey)]: null },
  })
  const completedLogin = await requestForm(
    form({
      device_identifier: "yubikey-login-device",
      two_factor_provider: String(twoFactorProviderType.yubikey),
      two_factor_token: loginToken,
    }),
  )
  expect(completedLogin.status).toBe(200)
  expect((await completedLogin.json()) as { access_token?: string }).toHaveProperty("access_token")
  expect(usedTokens).toEqual(new Set([activationToken, loginToken]))

  const replay = await requestForm(
    form({
      device_identifier: "yubikey-login-device",
      two_factor_provider: String(twoFactorProviderType.yubikey),
      two_factor_token: loginToken,
    }),
  )
  expect(replay.status).toBe(400)
  expect(usedTokens).toEqual(new Set([activationToken, loginToken]))
})

const expectedTask12Routes = [
  ["POST", "/api/two-factor/get-authenticator"],
  ["POST", "/api/two-factor/authenticator"],
  ["PUT", "/api/two-factor/authenticator"],
  ["DELETE", "/api/two-factor/authenticator"],
  ["POST", "/api/two-factor/get-duo"],
  ["POST", "/api/two-factor/duo"],
  ["PUT", "/api/two-factor/duo"],
  ["POST", "/api/two-factor/send-email-login"],
  ["POST", "/api/two-factor/get-email"],
  ["POST", "/api/two-factor/send-email"],
  ["PUT", "/api/two-factor/email"],
  ["GET", "/api/two-factor"],
  ["POST", "/api/two-factor/get-recover"],
  ["POST", "/api/two-factor/disable"],
  ["PUT", "/api/two-factor/disable"],
  ["GET", "/api/two-factor/get-device-verification-settings"],
  ["POST", "/api/accounts/request-otp"],
  ["POST", "/api/accounts/verify-otp"],
  ["POST", "/api/two-factor/get-webauthn"],
  ["POST", "/api/two-factor/get-webauthn-challenge"],
  ["POST", "/api/two-factor/webauthn"],
  ["PUT", "/api/two-factor/webauthn"],
  ["DELETE", "/api/two-factor/webauthn"],
  ["POST", "/api/two-factor/get-yubikey"],
  ["POST", "/api/two-factor/yubikey"],
  ["PUT", "/api/two-factor/yubikey"],
]

function task12RouteIsTwoFactor(route: (typeof upstreamRouteManifest.routes)[number]): boolean {
  return (
    route.path.startsWith("/api/two-factor") ||
    route.path === "/api/accounts/request-otp" ||
    route.path === "/api/accounts/verify-otp"
  )
}

test("task 12 routes preserve upstream paths and methods", () => {
  const manifestRoutes = upstreamRouteManifest.routes
    .filter(task12RouteIsTwoFactor)
    .map((route) => [route.method, route.path])
  expect(manifestRoutes).toEqual(expectedTask12Routes)

  const localRoutes = new Set(
    serverRouteRegistrationIntrospect(serverAppCreate()).map((route) => `${route.method} ${route.path}`),
  )
  expect(expectedTask12Routes.every(([method, path]) => localRoutes.has(`${method} ${path}`))).toBe(true)
})

test("task 12 method aliases remain explicit in the upstream manifest", () => {
  const aliases = upstreamRouteManifest.aliases
  expect(aliases.find((alias) => alias.routeIds.includes("core.56.activate_authenticator"))?.routeIds).toEqual([
    "core.56.activate_authenticator",
    "core.96.activate_authenticator_put",
    "core.191.disable_authenticator",
  ])
  expect(aliases.find((alias) => alias.routeIds.includes("core.158.activate_duo"))?.routeIds).toEqual([
    "core.158.activate_duo",
    "core.196.activate_duo_put",
  ])
  expect(aliases.find((alias) => alias.routeIds.includes("core.137.disable_twofactor"))?.routeIds).toEqual([
    "core.137.disable_twofactor",
    "core.169.disable_twofactor_put",
  ])
  expect(aliases.find((alias) => alias.routeIds.includes("core.255.activate_webauthn"))?.routeIds).toEqual([
    "core.255.activate_webauthn",
    "core.306.activate_webauthn_put",
    "core.318.delete_webauthn",
  ])
  expect(aliases.find((alias) => alias.routeIds.includes("core.150.activate_yubikey"))?.routeIds).toEqual([
    "core.150.activate_yubikey",
    "core.209.activate_yubikey_put",
  ])
})

test("protected task 12 routes preserve the existing missing-token envelope", async () => {
  for (const [method, path] of [
    ["GET", "/api/two-factor"],
    ["POST", "/api/two-factor/get-authenticator"],
    ["POST", "/api/accounts/request-otp"],
    ["DELETE", "/api/two-factor/webauthn"],
  ]) {
    const response = await serverAppCreate().request(`https://vault.example${path}`, { method })
    expect(response.status).toBe(401)
  }
})

test("email two-factor setup, selection, token consumption, and password login stay compatible", async () => {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  databases.push(databaseResult.data)
  const database = databaseResult.data
  const salt = Uint8Array.from({ length: 64 }, (_, index) => index + 1)
  const passwordResult = await passwordHashCreate("correct-client-password-hash", salt, 100_000)
  if (!passwordResult.success) throw new Error(passwordResult.errorMessage)
  const user: IdentityUser = {
    uuid: "00000000-0000-4000-8000-000000000010",
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: "2026-08-27T00:00:00.000Z",
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "alice@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Alice Example",
    passwordHash: passwordResult.data,
    salt,
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "wrapped-user-key",
    privateKey: "encrypted-private-key",
    publicKey: "public-key",
    securityStamp: "00000000-0000-4000-8000-000000000011",
    stampException: null,
    equivalentDomains: "[]",
    excludedGlobals: "[]",
    clientKdfType: 0,
    clientKdfIter: 100_000,
    clientKdfMemory: null,
    clientKdfParallelism: null,
    apiKey: null,
    avatarColor: null,
    externalId: null,
  }
  const saveResult = identityUserSave(database, user)
  if (!saveResult.success) throw new Error(saveResult.errorMessage)
  const mail = identityMailAdapterCreate(clockTestCreate("2026-08-28T00:00:00.000Z"))
  const app = serverAppCreate({
    clock: clockTestCreate("2026-08-28T00:00:00.000Z"),
    database,
    identity: {
      clock: clockTestCreate("2026-08-28T00:00:00.000Z"),
      config: identityConfigCreate({
        ENABLE_EMAIL_2FA: true,
        MAIL_ENABLED: true,
        PASSWORD_ITERATIONS: 100_000,
      }),
      database,
      identifier: { uuid: () => "00000000-0000-4000-8000-000000000099" },
      mail,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      rateLimiter: { check: () => resultCreate(undefined) },
    },
  })
  const form = (overrides: Record<string, string> = {}) => ({
    grant_type: "password",
    client_id: "web",
    password: "correct-client-password-hash",
    scope: "api offline_access",
    username: user.email,
    device_identifier: "desktop-device",
    device_name: "Alice Desktop",
    device_type: "6",
    ...overrides,
  })
  const requestForm = (values: Record<string, string>) =>
    app.request("https://vault.example/identity/connect/token", {
      body: new URLSearchParams(values).toString(),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
    })
  const requestJson = (
    path: string,
    body: unknown,
    token?: string,
    method: "DELETE" | "GET" | "POST" | "PUT" = "POST",
  ) => {
    const headers = {
      "content-type": "application/json",
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
    }
    if (method === "GET") return app.request(`https://vault.example${path}`, { headers, method })
    return app.request(`https://vault.example${path}`, {
      body: JSON.stringify(body),
      headers,
      method,
    })
  }

  const initialLogin = await requestForm(form())
  expect(initialLogin.status).toBe(200)
  const initialLoginBody = (await initialLogin.json()) as { access_token: string }
  expect(typeof initialLoginBody.access_token).toBe("string")

  const sendSetup = await requestJson(
    "/api/two-factor/send-email",
    { email: "mfa@example.com", masterPasswordHash: "correct-client-password-hash" },
    initialLoginBody.access_token,
  )
  expect(sendSetup.status).toBe(200)
  const setupMessage = [...mail.messages].reverse().find((message) => message.kind === "twoFactorToken")
  expect(setupMessage?.recipient).toBe("mfa@example.com")
  expect(setupMessage?.token).toMatch(/^[0-9]{6}$/u)
  if (setupMessage?.token === null || setupMessage?.token === undefined) return

  const completeSetup = await requestJson(
    "/api/two-factor/email",
    {
      email: "mfa@example.com",
      masterPasswordHash: "correct-client-password-hash",
      token: setupMessage.token,
    },
    initialLoginBody.access_token,
    "PUT",
  )
  expect(completeSetup.status).toBe(200)
  expect(await completeSetup.json()).toMatchObject({ email: "mfa@example.com", enabled: "true" })
  const providers = await requestJson("/api/two-factor", {}, initialLoginBody.access_token, "GET")
  expect(providers.status).toBe(200)
  expect(await providers.json()).toMatchObject({ data: [{ enabled: true, type: twoFactorProviderType.email }] })

  const challenge = await requestForm(form({ device_identifier: "second-device" }))
  expect(challenge.status).toBe(400)
  expect(await challenge.json()).toMatchObject({
    TwoFactorProviders: [String(twoFactorProviderType.email)],
    TwoFactorProviders2: { [String(twoFactorProviderType.email)]: { Email: "***@example.com" } },
  })

  const sendLogin = await requestJson("/api/two-factor/send-email-login", {
    email: user.email,
    masterPasswordHash: "correct-client-password-hash",
  })
  expect(sendLogin.status).toBe(200)
  const loginMessage = [...mail.messages].reverse().find((message) => message.kind === "twoFactorToken")
  expect(loginMessage?.token).toMatch(/^[0-9]{6}$/u)
  if (loginMessage?.token === null || loginMessage?.token === undefined) return

  const completedLogin = await requestForm(
    form({
      device_identifier: "second-device",
      two_factor_provider: String(twoFactorProviderType.email),
      two_factor_token: loginMessage.token,
    }),
  )
  expect(completedLogin.status).toBe(200)
  expect((await completedLogin.json()) as { access_token?: string }).toHaveProperty("access_token")
  expect(
    database.query("SELECT COUNT(*) AS count FROM twofactor_incomplete WHERE user_uuid = ?").get(user.uuid),
  ).toEqual({ count: 0 })
  expect(
    database
      .query<{ data: string }, [string, number]>("SELECT data FROM twofactor WHERE user_uuid = ? AND atype = ?")
      .get(user.uuid, twoFactorProviderType.email),
  ).toMatchObject({ data: expect.stringContaining('"last_token":null') })
})

test("WebAuthn registration, assertion login, replay handling, and deletion stay compatible", async () => {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  databases.push(databaseResult.data)
  const database = databaseResult.data
  const salt = Uint8Array.from({ length: 64 }, (_, index) => index + 1)
  const passwordResult = await passwordHashCreate("correct-client-password-hash", salt, 100_000)
  if (!passwordResult.success) throw new Error(passwordResult.errorMessage)
  const user: IdentityUser = {
    uuid: "00000000-0000-4000-8000-000000000030",
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: "2026-08-27T00:00:00.000Z",
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "webauthn@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "WebAuthn Example",
    passwordHash: passwordResult.data,
    salt,
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "wrapped-user-key",
    privateKey: "encrypted-private-key",
    publicKey: "public-key",
    securityStamp: "00000000-0000-4000-8000-000000000031",
    stampException: null,
    equivalentDomains: "[]",
    excludedGlobals: "[]",
    clientKdfType: 0,
    clientKdfIter: 100_000,
    clientKdfMemory: null,
    clientKdfParallelism: null,
    apiKey: null,
    avatarColor: null,
    externalId: null,
  }
  const saveResult = identityUserSave(database, user)
  if (!saveResult.success) throw new Error(saveResult.errorMessage)
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const mail = identityMailAdapterCreate(clock)
  const adapterCalls: { registration: unknown[]; login: unknown[] } = { registration: [], login: [] }
  let identifierSequence = 0
  const identifier = {
    uuid: () => `00000000-0000-4000-8000-${String(identifierSequence++).padStart(12, "0")}`,
  }
  const app = serverAppCreate({
    clock,
    database,
    identity: {
      clock,
      config: identityConfigCreate({ PASSWORD_ITERATIONS: 100_000 }),
      database,
      identifier,
      mail,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      rateLimiter: { check: () => resultCreate(undefined) },
      twoFactor: {
        webauthn: {
          registrationValidate: async (response) => {
            adapterCalls.registration.push(response)
            return resultCreate({ counter: 0, id: "credential-id", publicKey: "AQ" })
          },
          loginValidate: async (response) => {
            adapterCalls.login.push(response)
            return resultCreate({ credentialId: "credential-id", newCounter: 3 })
          },
        },
      },
    },
  })
  const form = (overrides: Record<string, string> = {}) => ({
    grant_type: "password",
    client_id: "web",
    password: "correct-client-password-hash",
    scope: "api offline_access",
    username: user.email,
    device_identifier: "webauthn-device",
    device_name: "WebAuthn Device",
    device_type: "6",
    ...overrides,
  })
  const requestForm = (values: Record<string, string>) =>
    app.request("https://vault.example/identity/connect/token", {
      body: new URLSearchParams(values).toString(),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
    })
  const requestJson = (
    path: string,
    body: unknown,
    token?: string,
    method: "DELETE" | "GET" | "POST" | "PUT" = "POST",
  ) => {
    const headers = {
      "content-type": "application/json",
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
    }
    if (method === "GET") return app.request(`https://vault.example${path}`, { headers, method })
    return app.request(`https://vault.example${path}`, {
      body: JSON.stringify(body),
      headers,
      method,
    })
  }

  const initialLogin = await requestForm(form())
  expect(initialLogin.status).toBe(200)
  const initialLoginBody = (await initialLogin.json()) as { access_token: string }
  const challengeResponse = await requestJson(
    "/api/two-factor/get-webauthn-challenge",
    { masterPasswordHash: "correct-client-password-hash" },
    initialLoginBody.access_token,
  )
  expect(challengeResponse.status).toBe(200)
  const registrationChallenge = (await challengeResponse.json()) as { challenge: string }
  expect(registrationChallenge.challenge).toMatch(/^[A-Za-z0-9_-]+$/u)
  const deviceResponse = {
    id: "credential-id",
    rawId: "credential-id",
    response: { clientDataJson: "client-data", attestationObject: "attestation" },
    type: "public-key",
  }
  const activated = await requestJson(
    "/api/two-factor/webauthn",
    {
      id: 1,
      name: "Security key",
      deviceResponse,
      masterPasswordHash: "correct-client-password-hash",
    },
    initialLoginBody.access_token,
  )
  expect(activated.status).toBe(200)
  expect(await activated.json()).toMatchObject({
    enabled: true,
    keys: [{ id: 1, name: "Security key", migrated: false }],
    object: "twoFactorU2f",
  })
  expect(adapterCalls.registration).toHaveLength(1)

  const listed = await requestJson(
    "/api/two-factor/get-webauthn",
    { masterPasswordHash: "correct-client-password-hash" },
    initialLoginBody.access_token,
  )
  expect(listed.status).toBe(200)
  expect(await listed.json()).toMatchObject({ enabled: true, keys: [{ id: 1, name: "Security key" }] })
  const duplicateChallenge = await requestJson(
    "/api/two-factor/get-webauthn-challenge",
    { masterPasswordHash: "correct-client-password-hash" },
    initialLoginBody.access_token,
  )
  expect(duplicateChallenge.status).toBe(200)
  expect(await duplicateChallenge.json()).toMatchObject({
    excludeCredentials: [{ id: "credential-id", type: "public-key" }],
  })

  const loginChallenge = await requestForm(form({ device_identifier: "webauthn-login-device" }))
  expect(loginChallenge.status).toBe(400)
  const loginChallengeBody = (await loginChallenge.json()) as {
    TwoFactorProviders: string[]
    TwoFactorProviders2: Record<string, { allowCredentials: Array<{ id: string }> }>
  }
  expect(loginChallengeBody.TwoFactorProviders).toEqual([String(twoFactorProviderType.webauthn)])
  expect(loginChallengeBody.TwoFactorProviders2[String(twoFactorProviderType.webauthn)]).toMatchObject({
    allowCredentials: [{ id: "credential-id" }],
  })

  const assertion = {
    id: "credential-id",
    rawId: "credential-id",
    response: {
      authenticatorData: "authenticator-data",
      clientDataJson: "client-data",
      signature: "signature",
    },
    type: "public-key",
  }
  const completedLogin = await requestForm(
    form({
      device_identifier: "webauthn-login-device",
      two_factor_provider: String(twoFactorProviderType.webauthn),
      two_factor_token: JSON.stringify(assertion),
    }),
  )
  expect(completedLogin.status).toBe(200)
  expect((await completedLogin.json()) as { access_token?: string }).toHaveProperty("access_token")
  expect(adapterCalls.login).toHaveLength(1)
  expect(
    JSON.parse(
      database
        .query<{ data: string }, [string, number]>("SELECT data FROM twofactor WHERE user_uuid = ? AND atype = ?")
        .get(user.uuid, twoFactorProviderType.webauthn)?.data ?? "[]",
    ),
  ).toMatchObject([{ credential: { counter: 3 } }])
  expect(
    database.query("SELECT COUNT(*) AS count FROM twofactor_incomplete WHERE user_uuid = ?").get(user.uuid),
  ).toEqual({
    count: 0,
  })

  const replay = await requestForm(
    form({
      device_identifier: "webauthn-login-device",
      two_factor_provider: String(twoFactorProviderType.webauthn),
      two_factor_token: JSON.stringify(assertion),
    }),
  )
  expect(replay.status).toBe(400)
  expect(adapterCalls.login).toHaveLength(1)

  const migratedRegistrations = JSON.parse(
    database
      .query<{ data: string }, [string, number]>("SELECT data FROM twofactor WHERE user_uuid = ? AND atype = ?")
      .get(user.uuid, twoFactorProviderType.webauthn)?.data ?? "[]",
  ) as Array<Record<string, unknown>>
  migratedRegistrations[0] = { ...migratedRegistrations[0], migrated: true }
  database.run("UPDATE twofactor SET data = ? WHERE user_uuid = ? AND atype = ?", [
    JSON.stringify(migratedRegistrations),
    user.uuid,
    twoFactorProviderType.webauthn,
  ])
  database.run("INSERT INTO twofactor (uuid, user_uuid, atype, enabled, data, last_used) VALUES (?, ?, ?, ?, ?, ?)", [
    "legacy-u2f-provider",
    user.uuid,
    4,
    1,
    JSON.stringify([{ reg: { keyHandle: "credential-id" } }]),
    0,
  ])
  const deleted = await requestJson(
    "/api/two-factor/webauthn",
    { id: 1, masterPasswordHash: "correct-client-password-hash" },
    initialLoginBody.access_token,
    "DELETE",
  )
  expect(deleted.status).toBe(200)
  expect(await deleted.json()).toMatchObject({ enabled: false, keys: [], object: "twoFactorU2f" })
  const providers = await requestJson("/api/two-factor", {}, initialLoginBody.access_token, "GET")
  expect(await providers.json()).toMatchObject({ data: [] })
  expect(
    database
      .query("SELECT COUNT(*) AS count FROM twofactor WHERE user_uuid = ? AND atype IN (?, ?)")
      .get(user.uuid, 1003, 1004),
  ).toEqual({ count: 0 })
  expect(
    database.query<{ data: string }, [string]>("SELECT data FROM twofactor WHERE uuid = ?").get("legacy-u2f-provider"),
  ).toEqual({ data: "[]" })
  const disabled = await requestJson(
    "/api/two-factor/disable",
    { masterPasswordHash: "correct-client-password-hash", type: twoFactorProviderType.webauthn },
    initialLoginBody.access_token,
  )
  expect(disabled.status).toBe(200)
  expect(await disabled.json()).toMatchObject({ enabled: false, type: twoFactorProviderType.webauthn })
  const disabledProviders = await requestJson("/api/two-factor", {}, initialLoginBody.access_token, "GET")
  expect(await disabledProviders.json()).toMatchObject({ data: [] })
})

test("Duo setup aliases, provider challenge, adapter validation, and password login stay compatible", async () => {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  databases.push(databaseResult.data)
  const database = databaseResult.data
  const salt = Uint8Array.from({ length: 64 }, (_, index) => index + 1)
  const passwordResult = await passwordHashCreate("correct-client-password-hash", salt, 100_000)
  if (!passwordResult.success) throw new Error(passwordResult.errorMessage)
  const user: IdentityUser = {
    uuid: "00000000-0000-4000-8000-000000000040",
    enabled: true,
    createdAt: "2026-08-28T00:00:00.000Z",
    updatedAt: "2026-08-28T00:00:00.000Z",
    verifiedAt: "2026-08-27T00:00:00.000Z",
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "duo@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Duo Example",
    passwordHash: passwordResult.data,
    salt,
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "wrapped-user-key",
    privateKey: "encrypted-private-key",
    publicKey: "public-key",
    securityStamp: "00000000-0000-4000-8000-000000000041",
    stampException: null,
    equivalentDomains: "[]",
    excludedGlobals: "[]",
    clientKdfType: 0,
    clientKdfIter: 100_000,
    clientKdfMemory: null,
    clientKdfParallelism: null,
    apiKey: null,
    avatarColor: null,
    externalId: null,
  }
  const saveResult = identityUserSave(database, user)
  if (!saveResult.success) throw new Error(saveResult.errorMessage)
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const mail = identityMailAdapterCreate(clock)
  const calls: { credentials: unknown[]; login: unknown[] } = { credentials: [], login: [] }
  let loginResult: Result<void> = resultErrorCreate("duoLogin", "Duo signature is invalid", {
    code: "platform.invalid-request",
    statusCode: 400,
  })
  const app = serverAppCreate({
    clock,
    database,
    identity: {
      clock,
      config: identityConfigCreate({
        DUO_ENABLED: true,
        DUO_HOST: "api-global.duosecurity.com",
        DUO_IKEY: "DIglobal",
        DUO_SKEY: "global-secret",
        MAIL_ENABLED: true,
        PASSWORD_ITERATIONS: 100_000,
      }),
      database,
      identifier: { uuid: () => "00000000-0000-4000-8000-000000000099" },
      mail,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
      rateLimiter: { check: () => resultCreate(undefined) },
      twoFactor: {
        duo: {
          credentialsValidate: async (credentials) => {
            calls.credentials.push(credentials)
            return resultCreate(undefined)
          },
          loginValidate: async (login) => {
            calls.login.push(login)
            return loginResult
          },
        },
      },
    },
  })
  const form = (overrides: Record<string, string> = {}) => ({
    grant_type: "password",
    client_id: "web",
    password: "correct-client-password-hash",
    scope: "api offline_access",
    username: user.email,
    device_identifier: "duo-device",
    device_name: "Duo Device",
    device_type: "6",
    ...overrides,
  })
  const requestForm = (values: Record<string, string>) =>
    app.request("https://vault.example/identity/connect/token", {
      body: new URLSearchParams(values).toString(),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
    })
  const requestJson = (path: string, body: unknown, token: string, method: "POST" | "PUT" = "POST") =>
    app.request(`https://vault.example${path}`, {
      body: JSON.stringify(body),
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      method,
    })

  const initialLogin = await requestForm(form())
  expect(initialLogin.status).toBe(200)
  const initialLoginBody = (await initialLogin.json()) as { access_token: string }

  const activated = await requestJson(
    "/api/two-factor/duo",
    {
      Host: "api-user.duosecurity.com",
      client_id: "DIuser",
      client_secret: "user-secret",
      master_password_hash: "correct-client-password-hash",
    },
    initialLoginBody.access_token,
  )
  expect(activated.status).toBe(200)
  expect(await activated.json()).toMatchObject({
    clientId: "DIus************",
    clientSecret: "user************",
    enabled: true,
    host: "api-************",
    object: "twoFactorDuo",
  })
  expect(calls.credentials).toEqual([
    { clientId: "DIuser", clientSecret: "user-secret", host: "api-user.duosecurity.com" },
  ])

  const reactivated = await requestJson(
    "/api/two-factor/duo",
    {
      host: "api-user.duosecurity.com",
      clientId: "DIuser",
      clientSecret: "user-secret",
      masterPasswordHash: "correct-client-password-hash",
    },
    initialLoginBody.access_token,
    "PUT",
  )
  expect(reactivated.status).toBe(200)
  expect(calls.credentials).toHaveLength(2)

  const status = await requestJson(
    "/api/two-factor/get-duo",
    { master_password_hash: "correct-client-password-hash" },
    initialLoginBody.access_token,
  )
  expect(status.status).toBe(200)
  expect(await status.json()).toMatchObject({
    clientId: "DIus************",
    clientSecret: "user************",
    enabled: true,
    host: "api-************",
  })

  const challenge = await requestForm(form({ device_identifier: "duo-login-device" }))
  expect(challenge.status).toBe(400)
  expect(await challenge.json()).toMatchObject({
    TwoFactorProviders: [String(twoFactorProviderType.duo)],
    TwoFactorProviders2: { [String(twoFactorProviderType.duo)]: null },
  })

  const failedLogin = await requestForm(
    form({
      device_identifier: "duo-login-device",
      two_factor_provider: String(twoFactorProviderType.duo),
      two_factor_token: "invalid-signature|duo-state",
    }),
  )
  expect(failedLogin.status).toBe(400)
  expect(calls.login).toMatchObject([
    {
      credentials: { clientId: "DIuser", clientSecret: "user-secret", host: "api-user.duosecurity.com" },
      email: user.email,
      state: "duo-state",
      token: "invalid-signature|duo-state",
    },
  ])
  expect(
    database.query("SELECT COUNT(*) AS count FROM twofactor_incomplete WHERE user_uuid = ?").get(user.uuid),
  ).toEqual({ count: 1 })

  loginResult = resultCreate(undefined)
  const completedLogin = await requestForm(
    form({
      device_identifier: "duo-login-device",
      two_factor_provider: String(twoFactorProviderType.duo),
      two_factor_token: "valid-signature|duo-state",
    }),
  )
  expect(completedLogin.status).toBe(200)
  expect((await completedLogin.json()) as { access_token?: string }).toHaveProperty("access_token")
  expect(calls.login).toHaveLength(2)
  expect(
    database.query("SELECT COUNT(*) AS count FROM twofactor_incomplete WHERE user_uuid = ?").get(user.uuid),
  ).toEqual({ count: 0 })
})
