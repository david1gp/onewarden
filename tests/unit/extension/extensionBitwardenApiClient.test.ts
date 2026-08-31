import { expect, test } from "bun:test"
import { extensionBitwardenApiClientCreate } from "../../../src/extension/api/extensionBitwardenApiClientCreate.js"
import { extensionEnvironmentResolve } from "../../../src/extension/api/extensionEnvironmentResolve.js"

const environmentResult = extensionEnvironmentResolve("https://vault.example")
if (!environmentResult.success) throw new Error("Test environment is invalid.")

const tokenResponse = {
  access_token: "access-token",
  expires_in: 3600,
  token_type: "Bearer",
  refresh_token: "refresh-token",
  PrivateKey: null,
  Kdf: 0,
  KdfIterations: 600000,
  KdfMemory: null,
  KdfParallelism: null,
  ResetMasterPassword: false,
  ForcePasswordReset: false,
  MasterPasswordPolicy: { Object: "masterPasswordPolicy" },
  scope: "api offline_access",
  AccountKeys: null,
  UserDecryptionOptions: { HasMasterPassword: false, MasterPasswordUnlock: null, Object: "userDecryptionOptions" },
}

const cipher = {
  object: "cipherDetails",
  id: "cipher-id",
  type: 1,
  revisionDate: "2026-08-28T00:00:00.000Z",
  deletedDate: null,
  organizationId: null,
  folderId: null,
  name: "encrypted name",
  notes: null,
  login: { username: "encrypted username", password: "encrypted password", uris: [], totp: null },
  fields: [],
}

const sync = {
  profile: {},
  folders: [],
  collections: [],
  policies: [],
  ciphers: [cipher],
  sends: [],
  object: "sync",
}

test("extensionBitwardenApiClientCreate sends identity and API requests with typed responses", async () => {
  const calls: { input: string; init?: RequestInit }[] = []
  const client = extensionBitwardenApiClientCreate(environmentResult.data, {
    fetch: async (input, init) => {
      calls.push({ input: String(input), init })
      if (String(input).endsWith("/accounts/prelogin")) {
        return Response.json({
          kdf: 0,
          kdfIterations: 600000,
          kdfMemory: null,
          kdfParallelism: null,
          kdfSettings: { iterations: 600000, kdfType: 0, memory: null, parallelism: null },
          salt: null,
        })
      }
      if (String(input).endsWith("/connect/token")) return Response.json(tokenResponse)
      return Response.json(1756368000000)
    },
  })

  const prelogin = await client.prelogin({ email: "user@example.com" })
  const token = await client.passwordToken({
    grant_type: "password",
    client_id: "browser",
    password: "hash",
    scope: "api offline_access",
    username: "user@example.com",
    device_identifier: "device-id",
    device_name: "OneWarden",
    device_type: "14",
  })
  const revision = await client.revisionDate({ accessToken: "access-token" })

  expect(prelogin.success).toBe(true)
  expect(token.success).toBe(true)
  expect(revision).toEqual({ success: true, data: 1756368000000 })
  expect(calls[0]).toMatchObject({ input: "https://vault.example/identity/accounts/prelogin" })
  expect(calls[1]?.init?.body).toContain("grant_type=password")
  expect(calls[2]?.init?.headers).toMatchObject({ authorization: "Bearer access-token" })
})

test("extensionBitwardenApiClientCreate returns errors for invalid responses and fetch failures", async () => {
  const invalidClient = extensionBitwardenApiClientCreate(environmentResult.data, {
    fetch: async () => Response.json({ invalid: true }),
  })
  const invalidResult = await invalidClient.sync({ accessToken: "access-token" })
  expect(invalidResult).toMatchObject({ success: false, code: "platform.internal", statusCode: 500 })

  const malformedCipherClient = extensionBitwardenApiClientCreate(environmentResult.data, {
    fetch: async () => Response.json({ ...sync, ciphers: [{ ...cipher, revisionDate: 42 }] }),
  })
  const malformedCipherResult = await malformedCipherClient.sync({ accessToken: "access-token" })
  expect(malformedCipherResult).toMatchObject({ success: false, code: "platform.internal", statusCode: 500 })

  const failedClient = extensionBitwardenApiClientCreate(environmentResult.data, {
    fetch: async () => {
      throw new Error("network down")
    },
  })
  const failedResult = await failedClient.cipherList({ accessToken: "access-token" })
  expect(failedResult).toMatchObject({ success: false, code: "platform.unavailable", statusCode: 503 })
})

test("extensionBitwardenApiClientCreate creates an authenticated session handoff", async () => {
  let request: { input: string; init?: RequestInit } | undefined
  const client = extensionBitwardenApiClientCreate(environmentResult.data, {
    fetch: async (input, init) => {
      request = { input: String(input), init }
      return Response.json({ token: "A".repeat(43), expiresAt: "2026-08-31T12:00:45.000Z" })
    },
  })
  const result = await client.sessionHandoffCreate({
    accessToken: "access-token",
    operation: "create",
    cipherId: null,
    encryptedUserKey: { algorithm: "AES-GCM", iv: "A".repeat(16), ciphertext: "B".repeat(107) },
  })

  expect(result.success).toBe(true)
  expect(request).toMatchObject({
    input: "https://vault.example/api/extension/handoffs",
    init: { method: "POST", headers: { authorization: "Bearer access-token" } },
  })
  expect(request?.init?.body).not.toContain("access-token")
})

test("extensionBitwardenApiClientCreate covers refresh, sync, cipher read/list, create, and update", async () => {
  const client = extensionBitwardenApiClientCreate(environmentResult.data, {
    fetch: async (input, init) => {
      const url = String(input)
      if (url.endsWith("/connect/token")) return Response.json(tokenResponse)
      if (url.endsWith("/sync")) return Response.json(sync)
      if (url.endsWith("/ciphers") && init?.method === "POST") return Response.json(cipher)
      if (url.endsWith("/ciphers")) return Response.json({ data: [cipher], object: "list", continuationToken: null })
      return Response.json(cipher)
    },
  })

  const refresh = await client.refreshToken({ granttype: "refresh_token", refreshtoken: "refresh-token" })
  const synced = await client.sync({ accessToken: "access-token" })
  const listed = await client.cipherList({ accessToken: "access-token" })
  const read = await client.cipherRead("cipher-id", { accessToken: "access-token" })
  const created = await client.cipherCreate(
    {
      type: 1,
      name: "encrypted name",
      notes: null,
      fields: [],
      login: { username: "encrypted username", password: "encrypted password", uris: [], totp: null },
    },
    { accessToken: "access-token" },
  )
  const updated = await client.cipherUpdate(
    "cipher-id",
    {
      id: "cipher-id",
      type: 1,
      name: "encrypted name",
      notes: null,
      fields: [],
      login: { username: "encrypted username", password: "encrypted password", uris: [], totp: null },
    },
    { accessToken: "access-token" },
  )

  expect(refresh.success).toBe(true)
  expect(synced.success).toBe(true)
  expect(listed.success).toBe(true)
  expect(read.success).toBe(true)
  expect(created.success).toBe(true)
  expect(updated.success).toBe(true)
})
