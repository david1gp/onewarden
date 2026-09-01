import { expect, test } from "bun:test"
import { extensionBitwardenApiClientCreate } from "../../../src/extension/api/extensionBitwardenApiClientCreate.js"
import { extensionEnvironmentResolve } from "../../../src/extension/api/extensionEnvironmentResolve.js"
import type { BitwardenEncryptedCipherMutationRequest } from "../../../src/shared/api/bitwardenEncryptedCipherMutationRequestSchema.js"

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

function encryptedCipherCreate(type: 1 | 2 | 3 | 4 | 5): BitwardenEncryptedCipherMutationRequest {
  const common = {
    id: `cipher-${type}`,
    type,
    name: `Encrypted ${type}`,
    notes: null,
    fields: [],
  }
  if (type === 1)
    return {
      ...common,
      login: { username: "encrypted user", password: "encrypted password", uris: [], totp: null },
    }
  if (type === 2) return { ...common, secureNote: { type: 0 } }
  if (type === 3) return { ...common, card: { cardholderName: "Encrypted User", number: "encrypted number" } }
  if (type === 4) return { ...common, identity: { firstName: "Encrypted", lastName: "User" } }
  return { ...common, sshKey: { privateKey: "encrypted private key", publicKey: "encrypted public key" } }
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

test("extensionBitwardenApiClientCreate uploads, downloads, and deletes attachments", async () => {
  const calls: { input: string; init?: RequestInit }[] = []
  const attachmentCipher = {
    ...cipher,
    attachments: [{ id: "attachment-id", fileName: "2.encrypted", key: "2.key", size: "4" }],
  }
  const client = extensionBitwardenApiClientCreate(environmentResult.data, {
    fetch: async (input, init) => {
      calls.push({ input: String(input), init })
      if (init?.method === "POST") return Response.json(attachmentCipher)
      if (init?.method === "DELETE") return Response.json({ cipher })
      return new Response(Uint8Array.from([2, 3, 4]))
    },
  })

  const uploaded = await client.attachmentUpload(
    "cipher/id",
    Uint8Array.from([1, 2, 3]),
    "2.encrypted-name",
    "2.encrypted-key",
    { accessToken: "access-token" },
  )
  const downloaded = await client.attachmentDownload("cipher/id", "attachment/id", { accessToken: "access-token" })
  const deleted = await client.attachmentDelete("cipher/id", "attachment/id", { accessToken: "access-token" })

  expect(uploaded.success).toBe(true)
  expect(downloaded).toEqual({ success: true, data: Uint8Array.from([2, 3, 4]) })
  expect(deleted.success).toBe(true)
  expect(calls.map((call) => call.input)).toEqual([
    "https://vault.example/api/ciphers/cipher%2Fid/attachment",
    "https://vault.example/api/ciphers/cipher%2Fid/attachment/attachment%2Fid/data",
    "https://vault.example/api/ciphers/cipher%2Fid/attachment/attachment%2Fid",
  ])
  expect(calls[0]?.init?.body).toBeInstanceOf(FormData)
  expect(calls[0]?.init?.headers).toMatchObject({ authorization: "Bearer access-token" })
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

test("extensionBitwardenApiClientCreate preserves collection assignments and mutation routes", async () => {
  const calls: { input: string; init?: RequestInit }[] = []
  const client = extensionBitwardenApiClientCreate(environmentResult.data, {
    fetch: async (input, init) => {
      calls.push({ input: String(input), init })
      if (init?.method === "POST" && String(input).endsWith("/ciphers/move")) return new Response(null, { status: 200 })
      if (init?.method === "PUT" && String(input).endsWith("/ciphers/cipher-id/delete"))
        return new Response(null, { status: 200 })
      return Response.json(cipher)
    },
  })
  const createResult = await client.cipherCreate(
    {
      type: 1,
      name: "encrypted name",
      notes: null,
      fields: [],
      login: { username: "encrypted username", password: "encrypted password", uris: [], totp: null },
      collectionIds: ["collection-id"],
    },
    { accessToken: "access-token" },
  )
  const partialResult = await client.cipherPartial("cipher-id", { favorite: true }, { accessToken: "access-token" })
  const softDeleteResult = await client.cipherDelete("cipher-id", false, { accessToken: "access-token" })
  const hardDeleteResult = await client.cipherDelete("cipher-id", true, { accessToken: "access-token" })
  const restoreResult = await client.cipherRestore("cipher-id", { accessToken: "access-token" })
  const archiveResult = await client.cipherArchive("cipher-id", true, { accessToken: "access-token" })
  const unarchiveResult = await client.cipherArchive("cipher-id", false, { accessToken: "access-token" })
  const moveResult = await client.cipherMove(["cipher-id"], null, { accessToken: "access-token" })
  const collectionsResult = await client.cipherCollectionsUpdate("cipher-id", ["collection-id"], {
    accessToken: "access-token",
  })

  expect(createResult.success).toBe(true)
  expect(partialResult.success).toBe(true)
  expect(softDeleteResult.success).toBe(true)
  expect(hardDeleteResult.success).toBe(true)
  expect(restoreResult.success).toBe(true)
  expect(archiveResult.success).toBe(true)
  expect(unarchiveResult.success).toBe(true)
  expect(moveResult.success).toBe(true)
  expect(collectionsResult.success).toBe(true)
  expect(calls[0]?.input).toBe("https://vault.example/api/ciphers/create")
  expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
    cipher: expect.objectContaining({ collectionIds: ["collection-id"] }),
    collectionIds: ["collection-id"],
  })
  expect(calls[2]).toMatchObject({
    input: "https://vault.example/api/ciphers/cipher-id/delete",
    init: { method: "PUT" },
  })
  expect(calls[3]).toMatchObject({
    input: "https://vault.example/api/ciphers/cipher-id",
    init: { method: "DELETE" },
  })
  expect(calls[7]).toMatchObject({
    input: "https://vault.example/api/ciphers/move",
    init: { method: "POST" },
  })
  expect(calls[8]?.init?.body).toBe(JSON.stringify({ collectionIds: ["collection-id"] }))
})

test("extensionBitwardenApiClientCreate matches organization create contracts with and without collections", async () => {
  const calls: { input: string; init?: RequestInit }[] = []
  const client = extensionBitwardenApiClientCreate(environmentResult.data, {
    fetch: async (input, init) => {
      calls.push({ input: String(input), init })
      return Response.json(cipher)
    },
  })
  const personal = encryptedCipherCreate(1)
  const organizationWithoutCollections = { ...personal, organizationId: "organization-id" }
  const organizationWithCollections = { ...organizationWithoutCollections, collectionIds: ["collection-id"] }

  expect((await client.cipherCreate(personal, { accessToken: "access-token" })).success).toBe(true)
  expect((await client.cipherCreate(organizationWithoutCollections, { accessToken: "access-token" })).success).toBe(
    true,
  )
  expect((await client.cipherCreate(organizationWithCollections, { accessToken: "access-token" })).success).toBe(true)

  expect(calls.map((call) => call.input)).toEqual([
    "https://vault.example/api/ciphers",
    "https://vault.example/api/ciphers/create",
    "https://vault.example/api/ciphers/create",
  ])
  expect(JSON.parse(String(calls[0]?.init?.body))).toEqual(personal)
  expect(JSON.parse(String(calls[1]?.init?.body))).toEqual({ cipher: organizationWithoutCollections })
  expect(JSON.parse(String(calls[2]?.init?.body))).toEqual({
    cipher: organizationWithCollections,
    collectionIds: ["collection-id"],
  })
})

test("extensionBitwardenApiClientCreate sends exact mutation contracts for cipher types 1 through 5", async () => {
  const calls: { input: string; init?: RequestInit }[] = []
  let currentCipher = encryptedCipherCreate(1)
  const client = extensionBitwardenApiClientCreate(environmentResult.data, {
    fetch: async (input, init) => {
      calls.push({ input: String(input), init })
      const path = String(input)
      if (path.endsWith("/delete") || path.endsWith("/ciphers/move")) return new Response(null, { status: 200 })
      return Response.json(currentCipher)
    },
  })

  for (const type of [1, 2, 3, 4, 5] as const) {
    currentCipher = { ...encryptedCipherCreate(type), organizationId: "organization-id" }
    const cipherId = currentCipher.id ?? `cipher-${type}`
    const start = calls.length
    expect((await client.cipherPartial(cipherId, { folderId: null }, { accessToken: "access-token" })).success).toBe(
      true,
    )
    expect((await client.cipherDelete(cipherId, false, { accessToken: "access-token" })).success).toBe(true)
    expect((await client.cipherDelete(cipherId, true, { accessToken: "access-token" })).success).toBe(true)
    expect((await client.cipherRestore(cipherId, { accessToken: "access-token" })).success).toBe(true)
    expect((await client.cipherArchive(cipherId, true, { accessToken: "access-token" })).success).toBe(true)
    expect((await client.cipherArchive(cipherId, false, { accessToken: "access-token" })).success).toBe(true)
    expect((await client.cipherMove([cipherId], null, { accessToken: "access-token" })).success).toBe(true)
    expect(
      (await client.cipherCollectionsUpdate(cipherId, ["collection-id"], { accessToken: "access-token" })).success,
    ).toBe(true)

    const mutationCalls = calls.slice(start)
    expect(mutationCalls.map((call) => `${call.init?.method} ${call.input}`)).toEqual([
      `PUT https://vault.example/api/ciphers/${cipherId}/partial`,
      `PUT https://vault.example/api/ciphers/${cipherId}/delete`,
      `DELETE https://vault.example/api/ciphers/${cipherId}`,
      `PUT https://vault.example/api/ciphers/${cipherId}/restore`,
      `PUT https://vault.example/api/ciphers/${cipherId}/archive`,
      `PUT https://vault.example/api/ciphers/${cipherId}/unarchive`,
      "POST https://vault.example/api/ciphers/move",
      `PUT https://vault.example/api/ciphers/${cipherId}/collections_v2`,
    ])
    expect(JSON.parse(String(mutationCalls[0]?.init?.body))).toEqual({ folderId: null })
    expect(mutationCalls[1]?.init?.body).toBeUndefined()
    expect(mutationCalls[2]?.init?.body).toBeUndefined()
    expect(JSON.parse(String(mutationCalls[6]?.init?.body))).toEqual({ ids: [cipherId], folderId: null })
    expect(JSON.parse(String(mutationCalls[7]?.init?.body))).toEqual({ collectionIds: ["collection-id"] })
  }
})

test("extensionBitwardenApiClientCreate bounds partial updates to favorite and folderId", async () => {
  let fetchCalls = 0
  let sentBody: unknown
  const client = extensionBitwardenApiClientCreate(environmentResult.data, {
    fetch: async (_input, init) => {
      fetchCalls += 1
      sentBody = JSON.parse(String(init?.body))
      return Response.json(cipher)
    },
  })

  const favorite = await client.cipherPartial("cipher-id", { favorite: true }, { accessToken: "access-token" })
  const unsupported = await client.cipherPartial(
    "cipher-id",
    { favorite: true, notes: "unsupported" } as { favorite?: boolean; folderId?: string | null },
    { accessToken: "access-token" },
  )
  const empty = await client.cipherPartial("cipher-id", {}, { accessToken: "access-token" })

  expect(favorite.success).toBe(true)
  expect(sentBody).toEqual({ favorite: true })
  expect(unsupported).toMatchObject({ success: false, code: "platform.invalid-request", statusCode: 400 })
  expect(empty).toMatchObject({ success: false, code: "platform.invalid-request", statusCode: 400 })
  expect(fetchCalls).toBe(1)
})

test("extensionBitwardenApiClientCreate sends authenticated folder CRUD requests with typed responses", async () => {
  const calls: { input: string; init?: RequestInit }[] = []
  const folder = { id: "folder-id", name: "2.encrypted-folder", object: "folder" as const }
  const client = extensionBitwardenApiClientCreate(environmentResult.data, {
    fetch: async (input, init) => {
      calls.push({ input: String(input), init })
      const url = String(input)
      if (init?.method === "DELETE") return new Response(null, { status: 200 })
      if (init?.method === "GET" && url.endsWith("/folders"))
        return Response.json({ data: [folder], object: "list", continuationToken: null })
      return Response.json(folder)
    },
  })

  const list = await client.folderList({ accessToken: "access-token" })
  const read = await client.folderRead("folder-id", { accessToken: "access-token" })
  const created = await client.folderCreate({ id: "folder-id", name: folder.name }, { accessToken: "access-token" })
  const updated = await client.folderUpdate(
    "folder-id",
    { id: "folder-id", name: folder.name },
    { accessToken: "access-token" },
  )
  const deleted = await client.folderDelete("folder-id", { accessToken: "access-token" })

  expect(list.success).toBe(true)
  expect(read.success).toBe(true)
  expect(created.success).toBe(true)
  expect(updated.success).toBe(true)
  expect(deleted.success).toBe(true)
  expect(calls.map((call) => `${call.init?.method} ${call.input}`)).toEqual([
    "GET https://vault.example/api/folders",
    "GET https://vault.example/api/folders/folder-id",
    "POST https://vault.example/api/folders",
    "PUT https://vault.example/api/folders/folder-id",
    "DELETE https://vault.example/api/folders/folder-id",
  ])
  expect(calls[2]?.init?.headers).toMatchObject({ authorization: "Bearer access-token" })
  expect(JSON.parse(String(calls[2]?.init?.body))).toEqual({ id: "folder-id", name: folder.name })
})

test("extensionBitwardenApiClientCreate sends authenticated collection CRUD requests with typed responses", async () => {
  const calls: { input: string; init?: RequestInit }[] = []
  const collection = {
    id: "collection-id",
    organizationId: "organization-id",
    name: "encrypted collection name",
    object: "collectionDetails" as const,
    assigned: true,
    hidePasswords: false,
    manage: true,
    readOnly: false,
    unmanaged: false,
  }
  const client = extensionBitwardenApiClientCreate(environmentResult.data, {
    fetch: async (input, init) => {
      calls.push({ input: String(input), init })
      if (init?.method === "DELETE") return new Response(null, { status: 200 })
      if (init?.method === "GET" && String(input).endsWith("/api/collections"))
        return Response.json({ data: [collection], object: "list", continuationToken: null })
      return Response.json(collection)
    },
  })

  const list = await client.collectionList({ accessToken: "access-token" })
  const read = await client.collectionRead("organization-id", "collection-id", { accessToken: "access-token" })
  const created = await client.collectionCreate(
    "organization-id",
    { id: "collection-id", name: collection.name },
    { accessToken: "access-token" },
  )
  const updated = await client.collectionUpdate(
    "organization-id",
    "collection-id",
    { id: "collection-id", name: collection.name },
    { accessToken: "access-token" },
  )
  const deleted = await client.collectionDelete("organization-id", "collection-id", { accessToken: "access-token" })

  expect(list.success).toBe(true)
  expect(read.success).toBe(true)
  expect(created.success).toBe(true)
  expect(updated.success).toBe(true)
  expect(deleted.success).toBe(true)
  expect(calls.map((call) => `${call.init?.method} ${call.input}`)).toEqual([
    "GET https://vault.example/api/collections",
    "GET https://vault.example/api/organizations/organization-id/collections/collection-id/details",
    "POST https://vault.example/api/organizations/organization-id/collections",
    "PUT https://vault.example/api/organizations/organization-id/collections/collection-id",
    "DELETE https://vault.example/api/organizations/organization-id/collections/collection-id",
  ])
  expect(calls[2]?.init?.headers).toMatchObject({ authorization: "Bearer access-token" })
  expect(JSON.parse(String(calls[2]?.init?.body))).toEqual({
    id: "collection-id",
    name: collection.name,
    groups: [],
    users: [],
  })
})
