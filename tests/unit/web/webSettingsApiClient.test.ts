import { expect, test } from "bun:test"
import { webSettingsApiClientCreate } from "../../../src/web/settings/model/webSettingsApiClientCreate.js"

test("webSettingsApiClient handles profile, avatar, API key, password, KDF, devices, and import/export calls", async () => {
  const requests: Array<{ url: string; method: string; body: string }> = []

  const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input)
    const method = init?.method ?? "GET"
    const body = String(init?.body ?? "")
    requests.push({ url, method, body })

    if (url.endsWith("/api/accounts/profile") && method === "GET") {
      return new Response(
        JSON.stringify({
          id: "user-123",
          name: "Test User",
          email: "user@example.com",
          emailVerified: true,
          masterPasswordHint: "hint",
          premium: false,
          culture: "en-US",
          twoFactorEnabled: false,
          key: "2.iv|key|mac",
          privateKey: null,
          securityStamp: "stamp-123",
          avatarColor: "#3b82f6",
          forcePasswordReset: false,
          usesKeyConnector: false,
          object: "profile",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/accounts/profile") && method === "POST") {
      return new Response(
        JSON.stringify({
          id: "user-123",
          name: "Updated Name",
          email: "user@example.com",
          emailVerified: true,
          masterPasswordHint: "hint",
          premium: false,
          culture: "en-US",
          twoFactorEnabled: false,
          key: "2.iv|key|mac",
          privateKey: null,
          securityStamp: "stamp-123",
          avatarColor: "#3b82f6",
          forcePasswordReset: false,
          usesKeyConnector: false,
          object: "profile",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/accounts/avatar") && method === "PUT") {
      return new Response(
        JSON.stringify({
          id: "user-123",
          name: "Updated Name",
          email: "user@example.com",
          emailVerified: true,
          masterPasswordHint: "hint",
          premium: false,
          culture: "en-US",
          twoFactorEnabled: false,
          key: "2.iv|key|mac",
          privateKey: null,
          securityStamp: "stamp-123",
          avatarColor: "#ef4444",
          forcePasswordReset: false,
          usesKeyConnector: false,
          object: "profile",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/accounts/api-key")) {
      return new Response(
        JSON.stringify({
          apiKey: "api-secret-key-123",
          revisionDate: "2026-08-29T12:00:00.000Z",
          object: "apiKey",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/accounts/rotate-api-key")) {
      return new Response(
        JSON.stringify({
          apiKey: "new-api-secret-key-456",
          revisionDate: "2026-08-29T12:05:00.000Z",
          object: "apiKey",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/devices")) {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "device-1",
              name: "Chrome Browser",
              type: 2,
              identifier: "ident-1",
              creationDate: "2026-08-29T10:00:00.000Z",
              ip: "127.0.0.1",
              isCurrent: true,
              object: "device",
            },
          ],
          continuationToken: null,
          object: "list",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (
      url.endsWith("/api/accounts/password") ||
      url.endsWith("/api/accounts/kdf") ||
      url.endsWith("/api/accounts/key-management/rotate-user-account-keys") ||
      url.endsWith("/api/accounts/email-token") ||
      url.endsWith("/api/accounts/email") ||
      url.endsWith("/api/accounts/verify-email") ||
      url.endsWith("/api/accounts/security-stamp") ||
      url.endsWith("/api/accounts/delete") ||
      url.endsWith("/api/accounts/delete-recover")
    ) {
      return new Response(null, { status: 200 })
    }

    if (url.endsWith("/api/sync")) {
      return new Response(
        JSON.stringify({
          profile: { id: "user-123", email: "user@example.com" },
          folders: [{ id: "f1", name: "2.iv|folder|mac" }],
          ciphers: [{ id: "c1", type: 1, name: "2.iv|cipher|mac", notes: null, login: null }],
          collections: [],
          policies: [],
          sends: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/ciphers/import")) {
      return new Response(JSON.stringify({ revisionDate: "2026-08-29T12:00:00.000Z" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }

    return new Response("Not found", { status: 404 })
  }

  const client = webSettingsApiClientCreate({ fetch: fakeFetch })

  // Profile get & update
  const profileRes = await client.profileGet("token-123")
  expect(profileRes.success).toBe(true)
  if (profileRes.success) {
    expect(profileRes.data.email).toBe("user@example.com")
  }

  const updateRes = await client.profileUpdate("token-123", { name: "Updated Name" })
  expect(updateRes.success).toBe(true)

  const avatarRes = await client.avatarUpdate("token-123", "#ef4444")
  expect(avatarRes.success).toBe(true)

  // API Key get & rotate
  const keyRes = await client.apiKeyGet("token-123", "hash-xyz")
  expect(keyRes.success).toBe(true)
  if (keyRes.success) {
    expect(keyRes.data.apiKey).toBe("api-secret-key-123")
  }

  const rotateKeyRes = await client.apiKeyRotate("token-123", "hash-xyz")
  expect(rotateKeyRes.success).toBe(true)
  if (rotateKeyRes.success) {
    expect(rotateKeyRes.data.apiKey).toBe("new-api-secret-key-456")
  }

  // Password and KDF
  const pwdRes = await client.passwordChange("token-123", {
    masterPasswordHash: "old-hash",
    newMasterPasswordHash: "new-hash",
    key: "new-key",
  })
  expect(pwdRes.success).toBe(true)

  const kdfRes = await client.kdfChange("token-123", {
    masterPasswordHash: "hash",
    authenticationData: {
      masterPasswordAuthenticationHash: "new-hash",
      kdf: { kdfType: 0, kdfIterations: 600_000, kdfMemory: null, kdfParallelism: null },
      salt: "user@example.com",
    },
    unlockData: {
      masterKeyWrappedUserKey: "new-wrapped-key",
      kdf: { kdfType: 0, kdfIterations: 600_000, kdfMemory: null, kdfParallelism: null },
      salt: "user@example.com",
    },
  })
  expect(kdfRes.success).toBe(true)

  // Devices & security stamp
  const devRes = await client.devicesGet("token-123")
  expect(devRes.success).toBe(true)
  if (devRes.success) {
    expect(devRes.data.data.length).toBe(1)
    expect(devRes.data.data[0]?.name).toBe("Chrome Browser")
  }

  const stampRes = await client.securityStampRotate("token-123", "hash")
  expect(stampRes.success).toBe(true)

  // Email & deletion
  const emailTokRes = await client.emailTokenRequest("token-123", {
    masterPasswordHash: "hash",
    newEmail: "new@example.com",
    token: "",
  })
  expect(emailTokRes.success).toBe(true)

  const verifyEmailRes = await client.emailVerificationSend("token-123")
  expect(verifyEmailRes.success).toBe(true)

  const delRecoverRes = await client.accountDeleteRecover("user@example.com")
  expect(delRecoverRes.success).toBe(true)

  const delRes = await client.accountDelete("token-123", { masterPasswordHash: "hash" })
  expect(delRes.success).toBe(true)

  // Sync and import
  const syncRes = await client.syncGet("token-123")
  expect(syncRes.success).toBe(true)

  const importRes = await client.ciphersImport("token-123", {
    ciphers: [],
    folders: [],
    folderRelationships: [],
  })
  expect(importRes.success).toBe(true)
})

test("webSettingsApiClient validates the structured cipher import report", async () => {
  const client = webSettingsApiClientCreate({
    fetch: async () =>
      new Response(
        JSON.stringify({
          importedCipherCount: 2,
          importedFolderCount: 1,
          revisionDate: "2026-08-31T12:00:00.000Z",
          warnings: ["A folder was reused."],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  })

  const result = await client.ciphersImport("token-123", {
    ciphers: [],
    folders: [],
    folderRelationships: [],
  })
  expect(result).toEqual({
    success: true,
    data: {
      importedCipherCount: 2,
      importedFolderCount: 1,
      revisionDate: "2026-08-31T12:00:00.000Z",
      warnings: ["A folder was reused."],
    },
  })

  const malformedClient = webSettingsApiClientCreate({
    fetch: async () =>
      new Response(JSON.stringify({ revisionDate: "2026-08-31T12:00:00.000Z", warnings: [1] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  })
  const malformedResult = await malformedClient.ciphersImport("token-123", {
    ciphers: [],
    folders: [],
    folderRelationships: [],
  })
  expect(malformedResult.success).toBe(false)
})

test("webSettingsApiClient validates attachment metadata and preserves binary bytes", async () => {
  const requests: Array<{ url: string; headers: Headers }> = []
  const encryptedBytes = new Uint8Array([0, 255, 1, 254])
  const client = webSettingsApiClientCreate({
    baseUrl: "https://vault.example",
    fetch: async (input, init) => {
      requests.push({ url: String(input), headers: new Headers(init?.headers) })
      if (String(input).endsWith("/api/ciphers/cipher-1/attachments")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                fileName: "encrypted-name",
                id: "attachment-1",
                key: "encrypted-key",
                object: "attachment",
                size: "4",
              },
            ],
            object: "list",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }
      return new Response(encryptedBytes, { status: 200, headers: { "content-type": "application/octet-stream" } })
    },
  })

  const metadataResult = await client.attachmentMetadataGet("access-token", "cipher-1")
  expect(metadataResult.success).toBe(true)
  if (metadataResult.success) expect(metadataResult.data[0]?.id).toBe("attachment-1")

  const bytesResult = await client.attachmentBytesGet("access-token", "cipher-1", "attachment-1")
  expect(bytesResult).toEqual({ success: true, data: encryptedBytes })
  expect(requests).toHaveLength(2)
  for (const request of requests) {
    expect(request.headers.get("authorization")).toBe("Bearer access-token")
  }
  expect(requests[0]?.headers.get("accept")).toBe("application/json")
  expect(requests[1]?.headers.get("accept")).toBe("application/octet-stream")

  const malformedClient = webSettingsApiClientCreate({
    fetch: async () =>
      new Response(
        JSON.stringify({
          data: [{ fileName: "name", id: "attachment-1", key: "key", object: "attachment", size: "4", url: "/leak" }],
          object: "list",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  })
  const malformedResult = await malformedClient.attachmentMetadataGet("access-token", "cipher-1")
  expect(malformedResult.success).toBe(false)

  const failedClient = webSettingsApiClientCreate({
    fetch: async () => new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 }),
  })
  const failedResult = await failedClient.attachmentBytesGet("access-token", "cipher-1", "attachment-1")
  expect(failedResult.success).toBe(false)
})
