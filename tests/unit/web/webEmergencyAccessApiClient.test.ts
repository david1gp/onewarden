import { expect, test } from "bun:test"
import { webEmergencyAccessApiClientCreate } from "../../../src/web/emergencyAccess/model/webEmergencyAccessApiClientCreate.js"

test("webEmergencyAccessApiClient handles trusted/granted listings, invite, confirm, initiate, approve, reject, view, takeover, and password", async () => {
  const requests: Array<{ url: string; method: string; body: string }> = []

  const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input)
    const method = init?.method ?? "GET"
    const body = String(init?.body ?? "")
    requests.push({ url, method, body })

    if (url.endsWith("/api/emergency-access/trusted") && method === "GET") {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "emer-1",
              status: 0,
              type: 0,
              waitTimeDays: 3,
              granteeId: "grantee-1",
              email: "trusted@example.com",
              name: "Trusted Contact",
              object: "emergencyAccessGranteeDetails",
            },
          ],
          continuationToken: null,
          object: "list",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/emergency-access/granted") && method === "GET") {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "emer-2",
              status: 2,
              type: 1,
              waitTimeDays: 7,
              grantorId: "grantor-1",
              email: "grantor@example.com",
              name: "Grantor User",
              object: "emergencyAccessGrantorDetails",
            },
          ],
          continuationToken: null,
          object: "list",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (
      url.endsWith("/api/emergency-access/invite") ||
      url.endsWith("/api/emergency-access/emer-1/reinvite") ||
      url.endsWith("/api/emergency-access/emer-2/accept") ||
      url.endsWith("/api/emergency-access/emer-1/reject") ||
      (url.endsWith("/api/emergency-access/emer-1") && method === "DELETE") ||
      url.endsWith("/api/emergency-access/emer-2/password")
    ) {
      return new Response(null, { status: 200 })
    }

    if (url.endsWith("/api/emergency-access/emer-1/confirm") && method === "POST") {
      return new Response(
        JSON.stringify({
          id: "emer-1",
          status: 2,
          type: 0,
          waitTimeDays: 3,
          email: "trusted@example.com",
          name: "Trusted Contact",
          object: "emergencyAccessGranteeDetails",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/emergency-access/emer-1") && method === "PUT") {
      return new Response(
        JSON.stringify({
          id: "emer-1",
          status: 0,
          type: 1,
          waitTimeDays: 5,
          email: "trusted@example.com",
          name: "Trusted Contact",
          object: "emergencyAccessGranteeDetails",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/emergency-access/emer-2/initiate") && method === "POST") {
      return new Response(
        JSON.stringify({
          id: "emer-2",
          status: 3,
          type: 1,
          waitTimeDays: 7,
          email: "grantor@example.com",
          name: "Grantor User",
          object: "emergencyAccessGrantorDetails",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/emergency-access/emer-1/approve") && method === "POST") {
      return new Response(
        JSON.stringify({
          id: "emer-1",
          status: 4,
          type: 0,
          waitTimeDays: 3,
          email: "trusted@example.com",
          name: "Trusted Contact",
          object: "emergencyAccessGranteeDetails",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/emergency-access/emer-2/view") && method === "POST") {
      return new Response(
        JSON.stringify({
          ciphers: [{ id: "c-1", name: "Grantor Login", type: 1 }],
          object: "list",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    if (url.endsWith("/api/emergency-access/emer-2/takeover") && method === "POST") {
      return new Response(
        JSON.stringify({
          kdf: 0,
          kdfIterations: 600000,
          object: "emergencyAccessTakeover",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    return new Response("Not found", { status: 404 })
  }

  const client = webEmergencyAccessApiClientCreate({ fetch: fakeFetch })

  // Trusted Get
  const trustedRes = await client.trustedGet("token-123")
  expect(trustedRes.success).toBe(true)
  if (trustedRes.success) {
    expect(trustedRes.data.length).toBe(1)
    expect(trustedRes.data[0]?.email).toBe("trusted@example.com")
    expect(trustedRes.data[0]?.status).toBe(0)
  }

  // Granted Get
  const grantedRes = await client.grantedGet("token-123")
  expect(grantedRes.success).toBe(true)
  if (grantedRes.success) {
    expect(grantedRes.data.length).toBe(1)
    expect(grantedRes.data[0]?.email).toBe("grantor@example.com")
  }

  // Invite
  const inviteRes = await client.invite("token-123", {
    email: "newcontact@example.com",
    type: 0,
    waitTimeDays: 3,
  })
  expect(inviteRes.success).toBe(true)

  // Reinvite
  const reinviteRes = await client.reinvite("token-123", "emer-1")
  expect(reinviteRes.success).toBe(true)

  // Confirm
  const confirmRes = await client.confirm("token-123", "emer-1", "encrypted-key-xyz")
  expect(confirmRes.success).toBe(true)
  if (confirmRes.success) {
    expect(confirmRes.data.status).toBe(2)
  }

  // Update
  const updateRes = await client.update("token-123", "emer-1", {
    type: 1,
    waitTimeDays: 5,
  })
  expect(updateRes.success).toBe(true)
  if (updateRes.success) {
    expect(updateRes.data.waitTimeDays).toBe(5)
  }

  // Accept
  const acceptRes = await client.accept("token-123", "emer-2", "invitation-token")
  expect(acceptRes.success).toBe(true)

  // Initiate
  const initiateRes = await client.initiate("token-123", "emer-2")
  expect(initiateRes.success).toBe(true)
  if (initiateRes.success) {
    expect(initiateRes.data.status).toBe(3)
  }

  // Approve
  const approveRes = await client.approve("token-123", "emer-1")
  expect(approveRes.success).toBe(true)
  if (approveRes.success) {
    expect(approveRes.data.status).toBe(4)
  }

  // Reject
  const rejectRes = await client.reject("token-123", "emer-1")
  expect(rejectRes.success).toBe(true)

  // View
  const viewRes = await client.view("token-123", "emer-2")
  expect(viewRes.success).toBe(true)
  if (viewRes.success) {
    expect(viewRes.data.length).toBe(1)
  }

  // Takeover & Password
  const takeoverRes = await client.takeover("token-123", "emer-2")
  expect(takeoverRes.success).toBe(true)

  const pwdRes = await client.password("token-123", "emer-2", {
    newMasterPasswordHash: "new-hash",
    key: "key-xyz",
  })
  expect(pwdRes.success).toBe(true)

  // Delete
  const delRes = await client.deleteAccess("token-123", "emer-1")
  expect(delRes.success).toBe(true)
})
