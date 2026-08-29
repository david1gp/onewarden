import { expect, test } from "bun:test"
import { webSendApiClientCreate } from "../../../src/web/sends/model/webSendApiClientCreate.js"

test("webSendApiClient handles Send listing, creating, updating, deleting, password removal, and public access", async () => {
  const requests: Array<{ url: string; method: string; body: string }> = []

  const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input)
    const method = init?.method ?? "GET"
    const body = String(init?.body ?? "")
    requests.push({ url, method, body })

    if (url.endsWith("/api/sends") && method === "GET") {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "send-1",
              accessId: "acc-1",
              type: 0,
              name: "Secret Note",
              notes: "My notes",
              text: { text: "Secret content" },
              file: null,
              key: "key-123",
              maxAccessCount: 5,
              accessCount: 2,
              password: null,
              authType: 2,
              disabled: false,
              hideEmail: true,
              revisionDate: "2026-08-29T12:00:00.000Z",
              expirationDate: "2026-09-05T12:00:00.000Z",
              deletionDate: "2026-09-05T12:00:00.000Z",
              object: "send",
            },
          ],
          continuationToken: null,
          object: "list",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/sends") && method === "POST") {
      return new Response(
        JSON.stringify({
          id: "send-2",
          accessId: "acc-2",
          type: 0,
          name: "Created Send",
          notes: null,
          text: { text: "Created content" },
          file: null,
          key: null,
          maxAccessCount: null,
          accessCount: 0,
          password: null,
          authType: 2,
          disabled: false,
          hideEmail: false,
          revisionDate: "2026-08-29T12:00:00.000Z",
          expirationDate: null,
          deletionDate: null,
          object: "send",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/sends/file") && method === "POST") {
      return new Response(
        JSON.stringify({
          id: "send-3",
          accessId: "acc-3",
          type: 1,
          name: "File Send",
          notes: null,
          text: null,
          file: { id: "f-1", fileName: "document.pdf", size: 1024, sizeName: "1 KB" },
          key: null,
          maxAccessCount: 1,
          accessCount: 0,
          password: null,
          authType: 2,
          disabled: false,
          hideEmail: false,
          revisionDate: "2026-08-29T12:00:00.000Z",
          expirationDate: null,
          deletionDate: null,
          object: "send",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/sends/send-1") && method === "GET") {
      return new Response(
        JSON.stringify({
          id: "send-1",
          accessId: "acc-1",
          type: 0,
          name: "Secret Note",
          notes: "My notes",
          text: { text: "Secret content" },
          file: null,
          key: "key-123",
          maxAccessCount: 5,
          accessCount: 2,
          password: null,
          authType: 2,
          disabled: false,
          hideEmail: true,
          revisionDate: "2026-08-29T12:00:00.000Z",
          expirationDate: "2026-09-05T12:00:00.000Z",
          deletionDate: "2026-09-05T12:00:00.000Z",
          object: "send",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/sends/send-1") && method === "PUT") {
      return new Response(
        JSON.stringify({
          id: "send-1",
          accessId: "acc-1",
          type: 0,
          name: "Updated Secret Note",
          notes: "Updated notes",
          text: { text: "Secret content" },
          file: null,
          key: "key-123",
          maxAccessCount: 10,
          accessCount: 2,
          password: null,
          authType: 2,
          disabled: false,
          hideEmail: true,
          revisionDate: "2026-08-29T12:10:00.000Z",
          expirationDate: "2026-09-05T12:00:00.000Z",
          deletionDate: "2026-09-05T12:00:00.000Z",
          object: "send",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/sends/send-1/remove-password") && method === "PUT") {
      return new Response(
        JSON.stringify({
          id: "send-1",
          accessId: "acc-1",
          type: 0,
          name: "Secret Note",
          notes: null,
          text: { text: "Secret content" },
          file: null,
          key: null,
          maxAccessCount: null,
          accessCount: 2,
          password: null,
          authType: 2,
          disabled: false,
          hideEmail: false,
          revisionDate: "2026-08-29T12:15:00.000Z",
          expirationDate: null,
          deletionDate: null,
          object: "send",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/sends/send-1") && method === "DELETE") {
      return new Response(null, { status: 200 })
    }

    if (url.endsWith("/api/sends/access/acc-1") && method === "POST") {
      return new Response(
        JSON.stringify({
          id: "send-1",
          type: 0,
          name: "Secret Note",
          text: { text: "Secret content" },
          file: null,
          expirationDate: "2026-09-05T12:00:00.000Z",
          creatorIdentifier: "sender@example.com",
          object: "send-access",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/sends/send-3/access/file/f-1") && method === "POST") {
      return new Response(
        JSON.stringify({
          url: "/api/sends/send-3/f-1?t=download-token-xyz",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    return new Response("Not found", { status: 404 })
  }

  const client = webSendApiClientCreate({ fetch: fakeFetch })

  // Send List
  const listRes = await client.sendList("token-123")
  expect(listRes.success).toBe(true)
  if (listRes.success) {
    expect(listRes.data.length).toBe(1)
    expect(listRes.data[0]?.name).toBe("Secret Note")
    expect(listRes.data[0]?.accessId).toBe("acc-1")
  }

  // Send Get
  const getRes = await client.sendGet("token-123", "send-1")
  expect(getRes.success).toBe(true)
  if (getRes.success) {
    expect(getRes.data.id).toBe("send-1")
  }

  // Send Create (Text)
  const createRes = await client.sendCreate("token-123", {
    type: 0,
    name: "Created Send",
    text: { text: "Created content" },
    key: "send-key",
    disabled: false,
    deletionDate: "2026-09-05T12:00:00.000Z",
  })
  expect(createRes.success).toBe(true)

  // Send Create (File)
  const fileBlob = new Blob(["dummy content"], { type: "application/pdf" })
  const fileCreateRes = await client.sendFileCreate(
    "token-123",
    {
      type: 1,
      name: "File Send",
      key: "file-send-key",
      disabled: false,
      deletionDate: "2026-09-05T12:00:00.000Z",
    },
    fileBlob,
    "document.pdf",
  )
  expect(fileCreateRes.success).toBe(true)
  if (fileCreateRes.success) {
    expect(fileCreateRes.data.type).toBe(1)
    expect(fileCreateRes.data.file?.fileName).toBe("document.pdf")
  }

  // Send Update
  const updateRes = await client.sendUpdate("token-123", "send-1", {
    type: 0,
    name: "Updated Secret Note",
    key: "key-123",
    disabled: false,
    maxAccessCount: 10,
    deletionDate: "2026-09-05T12:00:00.000Z",
  })
  expect(updateRes.success).toBe(true)
  if (updateRes.success) {
    expect(updateRes.data.name).toBe("Updated Secret Note")
    expect(updateRes.data.maxAccessCount).toBe(10)
  }

  // Send Remove Password
  const removePwdRes = await client.sendRemovePassword("token-123", "send-1")
  expect(removePwdRes.success).toBe(true)

  // Send Access (Public)
  const accessRes = await client.sendAccess("acc-1", null)
  expect(accessRes.success).toBe(true)
  if (accessRes.success) {
    expect(accessRes.data.name).toBe("Secret Note")
    expect(accessRes.data.text?.text).toBe("Secret content")
    expect(accessRes.data.creatorIdentifier).toBe("sender@example.com")
  }

  // Send Access File
  const accessFileRes = await client.sendAccessFile("send-3", "f-1", null)
  expect(accessFileRes.success).toBe(true)
  if (accessFileRes.success) {
    expect(accessFileRes.data.url).toContain("download-token-xyz")
  }

  // Send Delete
  const delRes = await client.sendDelete("token-123", "send-1")
  expect(delRes.success).toBe(true)
})
