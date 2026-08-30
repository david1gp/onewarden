import { afterEach, expect, test } from "bun:test"
import type { HibpHttpAdapter } from "../../../src/server/contexts/hibp/hibpHttpAdapter.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import { identityTokenBundleCreate } from "../../../src/server/contexts/identity/identityTokenBundleCreate.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import { identityTestDeviceCreate } from "../../helpers/identityTestDeviceCreate.js"
import { identityTestUserCreate } from "../../helpers/identityTestUserCreate.js"

const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const databases: DatabaseConnection[] = []
const requestUrl = "https://vault.example"
const requestUsername = "connect#bwpm@simplelogin.co"

type HibpRequest = { init?: RequestInit; url: string }

type HibpTestContext = {
  app: ReturnType<typeof serverAppCreate>
  database: DatabaseConnection
  requests: HibpRequest[]
  token: string
}

async function contextCreate(options?: {
  apiKey?: string | null
  fetch?: HibpHttpAdapter["fetch"]
}): Promise<HibpTestContext> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)

  const user = identityTestUserCreate("hibp-user", { name: "HIBP User", passwordIterations: 600_000 })
  const device = identityTestDeviceCreate(user.uuid, {
    name: "HIBP Device",
    pushToken: null,
    pushUuid: null,
    uuid: "hibp-device",
  })
  expect(identityUserSave(database, user).success).toBe(true)
  expect(identityDeviceSave(database, device, clockTestCreate("2026-08-28T00:00:00.000Z"), false).success).toBe(true)

  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const tokenResult = await identityTokenBundleCreate(
    user,
    device,
    "hibp-client",
    requestUrl,
    keyPair.privateKey,
    clock,
    identityConfigCreate(),
  )
  if (!tokenResult.success) throw new Error(tokenResult.errorMessage)

  const requests: HibpRequest[] = []
  const http: HibpHttpAdapter = {
    fetch: async (url, init) => {
      requests.push({ init, url })
      if (options?.fetch !== undefined) return options.fetch(url, init)
      return new Response(JSON.stringify([{ Name: "Example", Domain: "example.com" }]), { status: 200 })
    },
  }
  const app = serverAppCreate({
    clock,
    database,
    hibp: { apiKey: options?.apiKey, http },
    identity: {
      clock,
      config: identityConfigCreate(),
      database,
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: requestUrl,
    },
  })

  return { app, database, requests, token: tokenResult.data.accessToken }
}

function requestHeaders(token: string): HeadersInit {
  return { authorization: `Bearer ${token}` }
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("HIBP route requires authentication and validates the username query", async () => {
  const context = await contextCreate()

  const unauthenticated = await context.app.request(`${requestUrl}/api/hibp/breach?username=user%40example.com`)
  expect(unauthenticated.status).toBe(401)
  expect(await unauthenticated.json()).toMatchObject({ message: "No access token provided" })

  const missingUsername = await context.app.request(`${requestUrl}/api/hibp/breach`, {
    headers: requestHeaders(context.token),
  })
  expect(missingUsername.status).toBe(400)
  expect(await missingUsername.json()).toMatchObject({
    message: "Invalid request.",
    validationErrors: { username: ['Invalid key: Expected "username" but received undefined'] },
  })

  const emptyUsername = await context.app.request(`${requestUrl}/api/hibp/breach?username=`, {
    headers: requestHeaders(context.token),
  })
  expect(emptyUsername.status).toBe(200)
  expect(await emptyUsername.json()).toMatchObject([{ name: "HaveIBeenPwned", title: "Manual HIBP Check" }])
})

test("HIBP route returns the synthetic manual-check breach without calling HIBP", async () => {
  const context = await contextCreate()
  const response = await context.app.request(
    `${requestUrl}/api/hibp/breach?username=${encodeURIComponent(requestUsername)}`,
    { headers: requestHeaders(context.token) },
  )

  expect(response.status).toBe(200)
  expect(context.requests).toHaveLength(0)
  expect(await response.json()).toMatchObject([
    {
      name: "HaveIBeenPwned",
      title: "Manual HIBP Check",
      domain: "haveibeenpwned.com",
      logoPath: "vw_static/hibp.png",
      pwnCount: 0,
      dataClasses: ["Error - No API key set!"],
    },
  ])
})

test("HIBP route forwards a configured key and passes through a successful HIBP response", async () => {
  const upstreamBody = [{ Name: "Adobe", Domain: "adobe.com", PwnCount: 1 }]
  const queryUsername = "person+name%2Btag%40example.com"
  const context = await contextCreate({
    apiKey: "secret-key",
    fetch: async () => new Response(JSON.stringify(upstreamBody), { status: 200 }),
  })
  const response = await context.app.request(`${requestUrl}/api/hibp/breach?username=${queryUsername}`, {
    headers: requestHeaders(context.token),
  })

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual(upstreamBody)
  expect(context.requests).toEqual([
    {
      init: { headers: { "hibp-api-key": "secret-key", "user-agent": "Vaultwarden" }, method: "GET" },
      url: "https://haveibeenpwned.com/api/v3/breachedaccount/person+name%2Btag%40example.com?truncateResponse=false&includeUnverified=false",
    },
  ])
})

test("HIBP route returns an empty 404 for an unbreached account", async () => {
  const context = await contextCreate({ apiKey: "secret-key", fetch: async () => new Response(null, { status: 404 }) })
  const response = await context.app.request(
    `${requestUrl}/api/hibp/breach?username=${encodeURIComponent(requestUsername)}`,
    { headers: requestHeaders(context.token) },
  )

  expect(response.status).toBe(404)
  expect(response.headers.get("content-type")).toBe("application/json")
  expect(await response.json()).toEqual({})
})

test("HIBP route converts upstream, network, and JSON failures to API errors", async () => {
  const upstreamContext = await contextCreate({
    apiKey: "secret-key",
    fetch: async () => new Response(null, { status: 429 }),
  })
  const upstreamResponse = await upstreamContext.app.request(
    `${requestUrl}/api/hibp/breach?username=${encodeURIComponent(requestUsername)}`,
    { headers: requestHeaders(upstreamContext.token) },
  )
  expect(upstreamResponse.status).toBe(400)
  expect(await upstreamResponse.json()).toMatchObject({ message: "Req" })

  const networkContext = await contextCreate({
    apiKey: "secret-key",
    fetch: async () => {
      throw new Error("network failure")
    },
  })
  const networkResponse = await networkContext.app.request(
    `${requestUrl}/api/hibp/breach?username=${encodeURIComponent(requestUsername)}`,
    { headers: requestHeaders(networkContext.token) },
  )
  expect(networkResponse.status).toBe(400)
  expect(await networkResponse.json()).toMatchObject({ message: "Req" })

  const jsonContext = await contextCreate({
    apiKey: "secret-key",
    fetch: async () => new Response("not-json", { status: 200 }),
  })
  const jsonResponse = await jsonContext.app.request(
    `${requestUrl}/api/hibp/breach?username=${encodeURIComponent(requestUsername)}`,
    { headers: requestHeaders(jsonContext.token) },
  )
  expect(jsonResponse.status).toBe(400)
  expect(await jsonResponse.json()).toMatchObject({ message: "Req" })
})
