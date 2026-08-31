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

    if (url.endsWith("/identity/connect/token") && method === "POST") {
      const form = new URLSearchParams(body)
      expect(form.get("grant_type")).toBe("send_access")
      expect(form.get("send_id")).toBe("acc-email")
      expect(form.get("email")).toBe("recipient@example.com")
      expect(form.get("otp")).toBe("123456")
      return new Response(
        JSON.stringify({
          access_token: "recipient-access-token",
          expires_in: 120,
          token_type: "Bearer",
          scope: "api.send.access",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/sends/access") && method === "POST") {
      return new Response(
        JSON.stringify({
          id: "send-email",
          type: 0,
          name: "Email Send",
          text: { text: "Email content" },
          file: null,
          expirationDate: null,
          creatorIdentifier: null,
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

    if (url.endsWith("/api/sends/access/file/f-1") && method === "POST") {
      return new Response(JSON.stringify({ url: "/download/recipient-file" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
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
    emails: "recipient@example.com",
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
    emails: "updated@example.com",
    deletionDate: "2026-09-05T12:00:00.000Z",
  })
  expect(updateRes.success).toBe(true)
  if (updateRes.success) {
    expect(updateRes.data.name).toBe("Updated Secret Note")
    expect(updateRes.data.maxAccessCount).toBe(10)
  }
  expect(
    JSON.parse(
      requests.find((request) => request.url.endsWith("/api/sends") && request.method === "POST")?.body ?? "{}",
    ).emails,
  ).toBe("recipient@example.com")
  expect(
    JSON.parse(
      requests.find((request) => request.url.endsWith("/api/sends/send-1") && request.method === "PUT")?.body ?? "{}",
    ).emails,
  ).toBe("updated@example.com")

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

  const accessTokenRes = await client.sendAccessToken("acc-email", "recipient@example.com", "123456")
  expect(accessTokenRes.success).toBe(true)
  if (accessTokenRes.success) {
    expect(accessTokenRes.data.accessToken).toBe("recipient-access-token")
    expect(accessTokenRes.data.expiresIn).toBe(120)
  }

  const authenticatedAccessRes = await client.sendAccessAuthenticated("recipient-access-token")
  expect(authenticatedAccessRes.success).toBe(true)
  if (authenticatedAccessRes.success) expect(authenticatedAccessRes.data.name).toBe("Email Send")

  // Send Access File
  const accessFileRes = await client.sendAccessFile("send-3", "f-1", null)
  expect(accessFileRes.success).toBe(true)
  if (accessFileRes.success) {
    expect(accessFileRes.data.url).toContain("download-token-xyz")
  }

  const authenticatedFileRes = await client.sendAccessFileAuthenticated("recipient-access-token", "f-1")
  expect(authenticatedFileRes.success).toBe(true)
  if (authenticatedFileRes.success) expect(authenticatedFileRes.data.url).toBe("/download/recipient-file")

  // Send Delete
  const delRes = await client.sendDelete("token-123", "send-1")
  expect(delRes.success).toBe(true)
})

test("webSendApiClient preserves structured Send access errors", async () => {
  const client = webSendApiClientCreate({
    fetch: async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input)
      if (url.endsWith("/identity/connect/token"))
        return new Response(
          JSON.stringify({
            error: "invalid_request",
            error_description: "A verification code was sent.",
            send_access_error_type: "email_and_otp_required_otp_sent",
          }),
          { status: 400, headers: { "content-type": "application/json" } },
        )
      return new Response(JSON.stringify({ message: "Email is required.", validationErrors: {}, object: "error" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      })
    },
  })

  const tokenResult = await client.sendAccessToken("send-id", "recipient@example.com")
  expect(tokenResult.success).toBe(false)
  if (!tokenResult.success) {
    expect(tokenResult.errorMessage).toBe("A verification code was sent.")
    expect(tokenResult.errorData).toContain("email_and_otp_required_otp_sent")
  }

  const accessResult = await client.sendAccess("send-id")
  expect(accessResult.success).toBe(false)
  if (!accessResult.success) expect(accessResult.errorMessage).toBe("Email is required.")
})
