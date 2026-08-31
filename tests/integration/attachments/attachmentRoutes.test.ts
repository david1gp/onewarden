import { afterEach, expect, test } from "bun:test"
import { attachmentFileStorageAdapterCreate } from "../../../src/server/contexts/attachments/attachmentFileStorageAdapterCreate.js"
import { attachmentFindById } from "../../../src/server/contexts/attachments/attachmentFindById.js"
import { identityConfigCreate } from "../../../src/server/contexts/identity/identityConfigCreate.js"
import type { IdentityDevice } from "../../../src/server/contexts/identity/identityDevice.js"
import { identityDeviceSave } from "../../../src/server/contexts/identity/identityDeviceSave.js"
import { identityTokenBundleCreate } from "../../../src/server/contexts/identity/identityTokenBundleCreate.js"
import type { IdentityUser } from "../../../src/server/contexts/identity/identityUser.js"
import { identityUserSave } from "../../../src/server/contexts/identity/identityUserSave.js"
import type { DatabaseConnection } from "../../../src/server/database/database.js"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { serverAppCreate } from "../../../src/server/serverAppCreate.js"
import { clockTestCreate } from "../../../src/shared/clock/clockTestCreate.js"
import { rsaKeyPairGenerate } from "../../../src/shared/crypto/rsaKeyPairGenerate.js"
import { identifierTestCreate } from "../../../src/shared/identifier/identifierTestCreate.js"

const date = "2026-08-28T00:00:00.000Z"
const keyPairResult = rsaKeyPairGenerate()
if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
const keyPair = keyPairResult.data
const databases: DatabaseConnection[] = []

function userCreate(): IdentityUser {
  return {
    uuid: "attachment-user",
    enabled: true,
    createdAt: date,
    updatedAt: date,
    verifiedAt: date,
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email: "attachment@example.com",
    emailNew: null,
    emailNewToken: null,
    name: "Attachment User",
    passwordHash: new Uint8Array([1]),
    salt: new Uint8Array([2]),
    passwordIterations: 100_000,
    passwordHint: null,
    akey: "akey",
    privateKey: null,
    publicKey: null,
    securityStamp: "attachment-stamp",
    stampException: null,
    equivalentDomains: "[]",
    excludedGlobals: "[]",
    clientKdfType: 0,
    clientKdfIter: 600_000,
    clientKdfMemory: null,
    clientKdfParallelism: null,
    apiKey: null,
    avatarColor: null,
    externalId: null,
  }
}

function deviceCreate(): IdentityDevice {
  return {
    uuid: "attachment-device",
    createdAt: date,
    updatedAt: date,
    userUuid: "attachment-user",
    name: "Attachment Device",
    type: 7,
    pushUuid: "attachment-push-device",
    pushToken: "attachment-push-token",
    refreshToken: "attachment-refresh-token",
    twoFactorRemember: null,
  }
}

async function contextCreate(options?: { identifiers?: string[]; quotaBytes?: number }): Promise<{
  app: ReturnType<typeof serverAppCreate>
  database: DatabaseConnection
  notifications: unknown[]
  pushes: unknown[]
  storage: ReturnType<typeof attachmentFileStorageAdapterCreate>
  token: string
}> {
  const databaseResult = databaseTestCreate()
  if (!databaseResult.success) throw new Error(databaseResult.errorMessage)
  const database = databaseResult.data
  databases.push(database)
  const user = userCreate()
  const device = deviceCreate()
  expect(identityUserSave(database, user).success).toBe(true)
  expect(identityDeviceSave(database, device, clockTestCreate(date), false).success).toBe(true)
  const clock = clockTestCreate(date)
  const tokenResult = await identityTokenBundleCreate(
    user,
    device,
    "attachment-client",
    "https://vault.example",
    keyPair.privateKey,
    clock,
    identityConfigCreate(),
  )
  if (!tokenResult.success) throw new Error(tokenResult.errorMessage)
  const notifications: unknown[] = []
  const pushes: unknown[] = []
  const storage = attachmentFileStorageAdapterCreate()
  const app = serverAppCreate({
    clock,
    database,
    attachments: {
      notification: {
        sendCipherUpdate: (notification) => {
          notifications.push(notification)
        },
      },
      push: {
        registerDevice: async () => ({ success: true, data: undefined }),
        unregisterDevice: async () => ({ success: true, data: undefined }),
        dispatch: async (notification) => {
          pushes.push(notification)
        },
      },
      quotaBytes: options?.quotaBytes,
      storage,
    },
    identity: {
      clock,
      config: identityConfigCreate(),
      database,
      identifier: identifierTestCreate(options?.identifiers ?? ["cipher-one", "attachment-one", "attachment-two"]),
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey,
      publicOrigin: "https://vault.example",
    },
  })
  return { app, database, notifications, pushes, storage, token: tokenResult.data.accessToken }
}

function jsonHeaders(token: string): HeadersInit {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" }
}

function cipherData(): Record<string, unknown> {
  return {
    key: "encrypted-cipher-key",
    login: { password: "encrypted-password", uris: [{ uri: "https://example.com" }] },
    name: "Attachment Cipher",
    notes: "notes",
    type: 1,
  }
}

function uploadForm(bytes: Uint8Array, name: string, key?: string): { body: Uint8Array; contentType: string } {
  const boundary = "onewarden-task16-boundary"
  const text = new TextDecoder().decode(bytes)
  const fields = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="data"; filename="${name}"`,
    "Content-Type: text/plain",
    "",
    text,
  ]
  if (key !== undefined) fields.push(`--${boundary}`, 'Content-Disposition: form-data; name="key"', "", key)
  fields.push(`--${boundary}--`, "")
  return {
    body: new TextEncoder().encode(fields.join("\r\n")),
    contentType: `multipart/form-data; boundary=${boundary}`,
  }
}

function multipartForm(parts: string[]): { body: Uint8Array; contentType: string } {
  const boundary = "onewarden-task16-malformed-boundary"
  const fields = parts.flatMap((part) => [`--${boundary}`, part])
  fields.push(`--${boundary}--`, "")
  return {
    body: new TextEncoder().encode(fields.join("\r\n")),
    contentType: `multipart/form-data; boundary=${boundary}`,
  }
}

afterEach(() => {
  for (const database of databases.splice(0)) databaseClose(database)
})

test("attachment v2 upload/download, replacement, aliases, deletion, revision, and push behavior match", async () => {
  const context = await contextCreate()
  const cipherResponse = await context.app.request("https://vault.example/api/ciphers", {
    body: JSON.stringify(cipherData()),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(cipherResponse.status).toBe(200)

  const metadataResponse = await context.app.request("https://vault.example/api/ciphers/cipher-one/attachment/v2", {
    body: JSON.stringify({ fileName: "encrypted-name", fileSize: "5", key: "encrypted-key" }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(metadataResponse.status).toBe(200)
  const metadata = await metadataResponse.json()
  expect(metadata).toMatchObject({
    attachmentId: "attachment-one",
    fileUploadType: 0,
    object: "attachment-fileUpload",
    url: "/ciphers/cipher-one/attachment/attachment-one",
  })
  expect(metadata.cipherResponse.attachments[0]).toMatchObject({
    fileName: "encrypted-name",
    id: "attachment-one",
    key: "encrypted-key",
    object: "attachment",
    size: "5",
  })

  const upload = uploadForm(new TextEncoder().encode("hello"), "ignored.txt")
  const uploadResponse = await context.app.request(`https://vault.example/api${metadata.url}`, {
    body: upload.body as unknown as BodyInit,
    headers: { authorization: `Bearer ${context.token}`, "content-type": upload.contentType },
    method: "POST",
  })
  expect(uploadResponse.status).toBe(200)
  const attachmentResponse = await context.app.request(
    "https://vault.example/api/ciphers/cipher-one/attachment/attachment-one",
    { headers: { authorization: `Bearer ${context.token}` } },
  )
  expect(attachmentResponse.status).toBe(200)
  const attachment = await attachmentResponse.json()
  expect(attachment.size).toBe("5")
  expect(await (await context.app.request(attachment.url)).text()).toBe("hello")
  expect((await context.app.request(attachment.url.replace("attachment-one", "attachment-two"))).status).toBe(404)
  expect(
    (
      await context.app.request(
        `https://vault.example/attachments/cipher-one/attachment-one?token=${attachment.url.split("token=")[1]}x`,
      )
    ).status,
  ).toBe(404)

  const replacement = uploadForm(new TextEncoder().encode("world"), "replacement.txt", "replacement-key")
  const replacementResponse = await context.app.request(
    "https://vault.example/api/ciphers/cipher-one/attachment/attachment-one/share",
    {
      body: replacement.body as unknown as BodyInit,
      headers: { authorization: `Bearer ${context.token}`, "content-type": replacement.contentType },
      method: "POST",
    },
  )
  expect(replacementResponse.status).toBe(200)
  expect((await replacementResponse.json()).attachments[0]).toMatchObject({ id: "attachment-two", size: "5" })
  expect(attachmentFindById(context.database, "attachment-one")).toMatchObject({ success: true, data: null })
  expect(await context.storage.read("cipher-one", "attachment-one")).toEqual({ success: true, data: null })
  expect(await context.storage.read("cipher-one", "attachment-two")).toEqual({
    success: true,
    data: new TextEncoder().encode("world"),
  })

  const deleteResponse = await context.app.request(
    "https://vault.example/api/ciphers/cipher-one/attachment/attachment-two/delete-admin",
    { headers: { authorization: `Bearer ${context.token}` }, method: "POST" },
  )
  expect(deleteResponse.status).toBe(200)
  expect((await deleteResponse.json()).cipher.attachments).toBeNull()
  expect(await context.storage.read("cipher-one", "attachment-two")).toEqual({ success: true, data: null })
  expect(context.notifications.map((notification) => (notification as { type: number }).type)).toEqual([0, 0, 0, 0])
  expect(context.pushes.map((notification) => (notification as { type: number }).type)).toEqual([0, 0, 0, 0])
})

test("attachment quota, declared-size leeway, and hard cipher deletion clean up storage", async () => {
  const context = await contextCreate({
    identifiers: ["cipher-one", "attachment-one", "attachment-two", "attachment-three"],
    quotaBytes: 5,
  })
  const cipherResponse = await context.app.request("https://vault.example/api/ciphers", {
    body: JSON.stringify(cipherData()),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(cipherResponse.status).toBe(200)

  const legacy = uploadForm(new TextEncoder().encode("hello"), "legacy.txt", "legacy-key")
  const upload = await context.app.request("https://vault.example/api/ciphers/cipher-one/attachment", {
    body: legacy.body as unknown as BodyInit,
    headers: { authorization: `Bearer ${context.token}`, "content-type": legacy.contentType },
    method: "POST",
  })
  expect(upload.status).toBe(200)
  const tooLargeBody = uploadForm(new TextEncoder().encode("!"), "too-large.txt", "too-large-key")
  const tooLarge = await context.app.request("https://vault.example/api/ciphers/cipher-one/attachment", {
    body: tooLargeBody.body as unknown as BodyInit,
    headers: { authorization: `Bearer ${context.token}`, "content-type": tooLargeBody.contentType },
    method: "POST",
  })
  expect(tooLarge.status).toBe(400)
  expect((await tooLarge.json()).message).toContain("storage limit")

  const deleteLegacy = await context.app.request(
    "https://vault.example/api/ciphers/cipher-one/attachment/attachment-one",
    { headers: { authorization: `Bearer ${context.token}` }, method: "DELETE" },
  )
  expect(deleteLegacy.status).toBe(200)

  const mismatchContext = await contextCreate({ identifiers: ["cipher-mismatch", "attachment-mismatch"] })
  const mismatchCipher = await mismatchContext.app.request("https://vault.example/api/ciphers", {
    body: JSON.stringify(cipherData()),
    headers: jsonHeaders(mismatchContext.token),
    method: "POST",
  })
  expect(mismatchCipher.status).toBe(200)
  const mismatchMetadata = await mismatchContext.app.request(
    "https://vault.example/api/ciphers/cipher-mismatch/attachment/v2",
    {
      body: JSON.stringify({ fileName: "declared", fileSize: 0, key: "declared-key" }),
      headers: jsonHeaders(mismatchContext.token),
      method: "POST",
    },
  )
  const mismatchData = await mismatchMetadata.json()
  const mismatchBody = uploadForm(new Uint8Array(1024 * 1024 + 1).fill(97), "declared.txt")
  const mismatch = await mismatchContext.app.request(`https://vault.example/api${mismatchData.url}`, {
    body: mismatchBody.body as unknown as BodyInit,
    headers: { authorization: `Bearer ${mismatchContext.token}`, "content-type": mismatchBody.contentType },
    method: "POST",
  })
  expect(mismatch.status).toBe(400)
  expect((await mismatch.json()).message).toContain("size mismatch")

  const finalMetadataResponse = await context.app.request(
    "https://vault.example/api/ciphers/cipher-one/attachment/v2",
    {
      body: JSON.stringify({ fileName: "final", fileSize: 5, key: "final-key" }),
      headers: jsonHeaders(context.token),
      method: "POST",
    },
  )
  const finalMetadata = await finalMetadataResponse.json()
  const finalBody = uploadForm(new TextEncoder().encode("hello"), "final.txt")
  expect(
    (
      await context.app.request(`https://vault.example/api${finalMetadata.url}`, {
        body: finalBody.body as unknown as BodyInit,
        headers: { authorization: `Bearer ${context.token}`, "content-type": finalBody.contentType },
        method: "POST",
      })
    ).status,
  ).toBe(200)

  const hardDelete = await context.app.request("https://vault.example/api/ciphers/cipher-one", {
    headers: { authorization: `Bearer ${context.token}` },
    method: "DELETE",
  })
  expect(hardDelete.status).toBe(200)
  expect(await context.storage.read("cipher-one", "attachment-two")).toEqual({ success: true, data: null })
})

test("attachment multipart validation rejects malformed fields without changing storage", async () => {
  const context = await contextCreate()
  const cipherResponse = await context.app.request("https://vault.example/api/ciphers", {
    body: JSON.stringify(cipherData()),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(cipherResponse.status).toBe(200)

  const missingData = multipartForm(['Content-Disposition: form-data; name="key"\r\n\r\nattachment-key'])
  const stringData = multipartForm([
    'Content-Disposition: form-data; name="data"\r\n\r\nnot-a-file',
    'Content-Disposition: form-data; name="key"\r\n\r\nattachment-key',
  ])
  const fileKey = multipartForm([
    'Content-Disposition: form-data; name="data"; filename="attachment.bin"\r\nContent-Type: application/octet-stream\r\n\r\nhello',
    'Content-Disposition: form-data; name="key"; filename="key.txt"\r\nContent-Type: text/plain\r\n\r\nattachment-key',
  ])
  const missingKey = multipartForm([
    'Content-Disposition: form-data; name="data"; filename="attachment.bin"\r\nContent-Type: application/octet-stream\r\n\r\nhello',
  ])
  const emptyFilename = multipartForm([
    'Content-Disposition: form-data; name="data"; filename=""\r\nContent-Type: application/octet-stream\r\n\r\nhello',
    'Content-Disposition: form-data; name="key"\r\n\r\nattachment-key',
  ])

  const requests: Array<{ expectedMessage: string; init: RequestInit }> = [
    {
      expectedMessage: "Multipart data is not provided.",
      init: {
        body: missingData.body as unknown as BodyInit,
        headers: { "content-type": missingData.contentType },
        method: "POST",
      },
    },
    {
      expectedMessage: "Invalid request.",
      init: {
        body: stringData.body as unknown as BodyInit,
        headers: { "content-type": stringData.contentType },
        method: "POST",
      },
    },
    {
      expectedMessage: "Invalid request.",
      init: {
        body: fileKey.body as unknown as BodyInit,
        headers: { "content-type": fileKey.contentType },
        method: "POST",
      },
    },
    {
      expectedMessage: "No attachment key provided",
      init: {
        body: missingKey.body as unknown as BodyInit,
        headers: { "content-type": missingKey.contentType },
        method: "POST",
      },
    },
    {
      expectedMessage: "Attachment file is not provided.",
      init: {
        body: emptyFilename.body as unknown as BodyInit,
        headers: { "content-type": emptyFilename.contentType },
        method: "POST",
      },
    },
    {
      expectedMessage: "Invalid multipart request.",
      init: {
        body: "not multipart",
        headers: { "content-type": "text/plain" },
        method: "POST",
      },
    },
  ]
  for (const { expectedMessage, init } of requests) {
    const request = new Request("https://vault.example/api/ciphers/cipher-one/attachment", {
      ...init,
      headers: { authorization: `Bearer ${context.token}`, ...init.headers },
    })
    const response = await context.app.fetch(request)
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ message: expectedMessage, object: "error" })
  }

  expect(context.database.query<{ count: number }, []>("SELECT COUNT(*) AS count FROM attachments").get()).toEqual({
    count: 0,
  })
  expect(await context.storage.read("cipher-one", "attachment-one")).toEqual({ success: true, data: null })
})

test("organization members can attach files to organization-owned ciphers", async () => {
  const context = await contextCreate({ identifiers: ["org-attachment"] })
  context.database.run("INSERT INTO organizations (uuid, name, billing_email) VALUES (?, ?, ?)", [
    "attachment-org",
    "Attachment Organization",
    "org@example.com",
  ])
  context.database.run(
    `INSERT INTO users_organizations (uuid, user_uuid, org_uuid, access_all, akey, status, atype)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ["org-membership", "attachment-user", "attachment-org", 1, "org-akey", 2, 2],
  )
  context.database.run(
    `INSERT INTO ciphers
      (uuid, created_at, updated_at, user_uuid, organization_uuid, key, atype, name, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ["org-cipher", date, date, null, "attachment-org", "org-cipher-key", 1, "Organization Cipher", "{}"],
  )

  const metadataResponse = await context.app.request("https://vault.example/api/ciphers/org-cipher/attachment/v2", {
    body: JSON.stringify({ fileName: "org-name", fileSize: 5, key: "org-key" }),
    headers: jsonHeaders(context.token),
    method: "POST",
  })
  expect(metadataResponse.status).toBe(200)
  const metadata = await metadataResponse.json()
  expect(metadata.cipherResponse.attachments[0]).toMatchObject({ id: "org-attachment", key: "org-key" })

  const upload = uploadForm(new TextEncoder().encode("hello"), "org.txt")
  const uploadResponse = await context.app.request(`https://vault.example/api${metadata.url}`, {
    body: upload.body as unknown as BodyInit,
    headers: { authorization: `Bearer ${context.token}`, "content-type": upload.contentType },
    method: "POST",
  })
  expect(uploadResponse.status).toBe(200)
})
