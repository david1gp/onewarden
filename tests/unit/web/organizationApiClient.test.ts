import { describe, expect, test } from "bun:test"
import { organizationApiClientCreate } from "../../../src/web/organizations/api/organizationApiClientCreate.js"

describe("organizationApiClientCreate", () => {
  test("organizationList parses sync profile organizations", async () => {
    const mockFetch = (async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/api/sync")) {
        return new Response(
          JSON.stringify({
            profile: {
              organizations: [
                {
                  billingEmail: "org@example.com",
                  hasPublicAndPrivateKeys: true,
                  id: "org-1",
                  name: "Test Org",
                  seats: 5,
                  status: 2,
                  type: 0,
                },
              ],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }
      return new Response("Not found", { status: 404 })
    }) as unknown as typeof fetch

    const client = organizationApiClientCreate({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      token: () => "mock-token",
    })

    const res = await client.organizationList()
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data).toHaveLength(1)
      expect(res.data[0]?.id).toBe("org-1")
      expect(res.data[0]?.name).toBe("Test Org")
      expect(res.data[0]?.billingEmail).toBe("org@example.com")
    }
  })

  test("organizationCreate sends correct payload and parses response", async () => {
    let capturedBody = ""

    const mockFetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      capturedBody = (init?.body as string) ?? ""
      return new Response(
        JSON.stringify({
          billingEmail: "new@example.com",
          id: "org-new",
          name: "New Org",
          planType: 6,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }) as unknown as typeof fetch

    const client = organizationApiClientCreate({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      token: () => "auth-token-123",
    })

    const res = await client.organizationCreate({
      billingEmail: "new@example.com",
      name: "New Org",
    })

    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.id).toBe("org-new")
      expect(res.data.name).toBe("New Org")
    }
    expect(capturedBody).toBe(
      JSON.stringify({
        billingEmail: "new@example.com",
        collectionName: "Default Collection",
        key: "0|demo-org-key",
        name: "New Org",
        planType: 6,
      }),
    )
  })

  test("organizationExport fetches the authenticated organization export", async () => {
    let capturedUrl = ""
    let capturedAuthorization = ""
    const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input)
      capturedAuthorization = new Headers(init?.headers).get("authorization") ?? ""
      return new Response(
        JSON.stringify({
          ciphers: [{ collectionIds: ["collection-1"], id: "cipher-1", name: "Login", type: 1 }],
          collections: [{ id: "collection-1", name: "Shared" }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }) as unknown as typeof fetch

    const client = organizationApiClientCreate({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      token: () => "org-token",
    })

    const result = await client.organizationExport("org/123")

    expect(result.success).toBe(true)
    expect(capturedUrl).toBe("https://api.example.com/api/organizations/org%2F123/export")
    expect(capturedAuthorization).toBe("Bearer org-token")
    if (result.success) {
      expect(result.data.ciphers[0]?.id).toBe("cipher-1")
      expect(result.data.collections[0]?.id).toBe("collection-1")
    }
  })

  test("organizationExport rejects an invalid response envelope", async () => {
    const mockFetch = (async () =>
      new Response(JSON.stringify({ ciphers: [] }), { status: 200 })) as unknown as typeof fetch
    const client = organizationApiClientCreate({ fetchFn: mockFetch })

    const result = await client.organizationExport("org-1")

    expect(result.success).toBe(false)
    if (!result.success) expect(result.op).toBe("organizationExport")
  })

  test("organizationImport posts the normalized payload with the organization query", async () => {
    let capturedBody = ""
    let capturedUrl = ""
    const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input)
      capturedBody = (init?.body as string) ?? ""
      return new Response(null, { status: 200 })
    }) as unknown as typeof fetch
    const payload = {
      ciphers: [{ name: "Login", type: 1 }],
      collections: [{ id: "collection-1", name: "Shared" }],
      collectionRelationships: [{ key: 0, value: 0 }],
    }
    const client = organizationApiClientCreate({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      token: () => "org-token",
    })

    const result = await client.organizationImport("org/123", payload)

    expect(result.success).toBe(true)
    expect(capturedUrl).toBe("https://api.example.com/api/ciphers/import-organization?organizationId=org%2F123")
    expect(JSON.parse(capturedBody)).toEqual(payload)
  })

  test("organizationImport validates the request before posting", async () => {
    let fetchCount = 0
    const mockFetch = (async () => {
      fetchCount += 1
      return new Response(null, { status: 200 })
    }) as unknown as typeof fetch
    const client = organizationApiClientCreate({ fetchFn: mockFetch })

    const result = await client.organizationImport("org-1", {
      ciphers: [],
      collections: [],
      collectionRelationships: [{ key: 0, value: 0 }],
    })

    expect(result.success).toBe(false)
    expect(fetchCount).toBe(0)
    if (!result.success) {
      expect(result.op).toBe("organizationImport")
      expect(result.errorMessage).toContain("Invalid organization import request")
    }
  })

  test("organizationImport propagates HTTP and network errors", async () => {
    const httpClient = organizationApiClientCreate({
      fetchFn: (async () => new Response("Forbidden", { status: 403 })) as unknown as typeof fetch,
    })
    const httpResult = await httpClient.organizationImport("org-1", {
      ciphers: [],
      collections: [],
      collectionRelationships: [],
    })
    expect(httpResult.success).toBe(false)
    if (!httpResult.success) expect(httpResult.errorMessage).toBe("Forbidden")

    const networkClient = organizationApiClientCreate({
      fetchFn: (async () => {
        throw new Error("connection refused")
      }) as unknown as typeof fetch,
    })
    const networkResult = await networkClient.organizationImport("org-1", {
      ciphers: [],
      collections: [],
      collectionRelationships: [],
    })
    expect(networkResult.success).toBe(false)
    if (!networkResult.success) expect(networkResult.errorMessage).toBe("connection refused")
  })

  test("organizationMemberInvite formats collections and emails payload", async () => {
    let capturedBody = ""
    let capturedUrl = ""

    const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input)
      capturedBody = (init?.body as string) ?? ""
      return new Response(null, { status: 200 })
    }) as unknown as typeof fetch

    const client = organizationApiClientCreate({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      token: () => "auth-token",
    })

    const res = await client.organizationMemberInvite("org-123", {
      accessAll: false,
      collections: [{ hidePasswords: true, id: "col-1", manage: false, readOnly: true }],
      emails: ["invited@example.com"],
      type: 2,
    })

    expect(res.success).toBe(true)
    expect(capturedUrl).toBe("https://api.example.com/api/organizations/org-123/users/invite")
    const parsed = JSON.parse(capturedBody || "{}")
    expect(parsed.emails).toEqual(["invited@example.com"])
    expect(parsed.type).toBe(2)
    expect(parsed.collections).toEqual([{ hidePasswords: true, id: "col-1", manage: false, readOnly: true }])
  })

  test("organizationCollectionCreate and Delete perform correct endpoints", async () => {
    const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (init?.method === "POST" && url.endsWith("/collections")) {
        return new Response(
          JSON.stringify({
            id: "col-999",
            name: "New Col",
            organizationId: "org-1",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }
      if (init?.method === "DELETE" && url.includes("/collections/col-999")) {
        return new Response(null, { status: 200 })
      }
      return new Response("Not found", { status: 404 })
    }) as unknown as typeof fetch

    const client = organizationApiClientCreate({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
      token: () => "tok",
    })

    const createRes = await client.organizationCollectionCreate("org-1", {
      name: "New Col",
      users: [],
    })
    expect(createRes.success).toBe(true)
    if (createRes.success) {
      expect(createRes.data.id).toBe("col-999")
      expect(createRes.data.name).toBe("New Col")
    }

    const deleteRes = await client.organizationCollectionDelete("org-1", "col-999")
    expect(deleteRes.success).toBe(true)
  })

  test("group endpoints handle CRUD, members, and collection permissions", async () => {
    const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? "GET"

      if (url.endsWith("/groups/details") && method === "GET") {
        return new Response(
          JSON.stringify({
            data: [{ accessAll: true, id: "g-1", name: "Admins", organizationId: "org-1" }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }
      if (url.endsWith("/groups") && method === "POST") {
        const body = JSON.parse((init?.body as string) ?? "{}")
        return new Response(
          JSON.stringify({
            accessAll: body.accessAll,
            id: "g-created",
            name: body.name,
            organizationId: "org-1",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }
      if (url.includes("/groups/g-1/users") && method === "GET") {
        return new Response(JSON.stringify(["user-1", "user-2"]), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      }
      if (url.includes("/groups/g-1") && method === "DELETE") {
        return new Response(null, { status: 200 })
      }
      return new Response("Not found", { status: 404 })
    }) as unknown as typeof fetch

    const client = organizationApiClientCreate({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
    })

    const listRes = await client.organizationGroupList("org-1")
    expect(listRes.success).toBe(true)
    if (listRes.success) {
      expect(listRes.data).toHaveLength(1)
      expect(listRes.data[0]?.name).toBe("Admins")
    }

    const createRes = await client.organizationGroupCreate("org-1", {
      accessAll: true,
      name: "Developers",
    })
    expect(createRes.success).toBe(true)
    if (createRes.success) {
      expect(createRes.data.id).toBe("g-created")
      expect(createRes.data.name).toBe("Developers")
    }

    const membersRes = await client.organizationGroupMembersGet("org-1", "g-1")
    expect(membersRes.success).toBe(true)
    if (membersRes.success) {
      expect(membersRes.data).toEqual(["user-1", "user-2"])
    }

    const deleteRes = await client.organizationGroupDelete("org-1", "g-1")
    expect(deleteRes.success).toBe(true)
  })

  test("policy endpoints list, get, and update security policies", async () => {
    let capturedBody = ""
    const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith("/policies") && (init?.method ?? "GET") === "GET") {
        return new Response(
          JSON.stringify({
            data: [{ enabled: true, id: "pol-1", organizationId: "org-1", type: 0 }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }
      if (url.endsWith("/policies/1") && init?.method === "PUT") {
        capturedBody = (init?.body as string) ?? ""
        return new Response(
          JSON.stringify({
            data: { minLength: 16 },
            enabled: true,
            id: "pol-master",
            organizationId: "org-1",
            type: 1,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }
      return new Response("Not found", { status: 404 })
    }) as unknown as typeof fetch

    const client = organizationApiClientCreate({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
    })

    const listRes = await client.organizationPolicyList("org-1")
    expect(listRes.success).toBe(true)
    if (listRes.success) {
      expect(listRes.data).toHaveLength(1)
      expect(listRes.data[0]?.type).toBe(0)
    }

    const updateRes = await client.organizationPolicyUpdate("org-1", 1, {
      data: { minLength: 16 },
      enabled: true,
    })
    expect(updateRes.success).toBe(true)
    expect(JSON.parse(capturedBody)).toEqual({
      policy: {
        data: { minLength: 16 },
        enabled: true,
      },
    })
  })

  test("events and domain endpoints interact properly", async () => {
    const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes("/events") && (init?.method ?? "GET") === "GET") {
        return new Response(
          JSON.stringify({
            continuationToken: "tok-next",
            data: [{ date: "2026-08-28T00:00:00Z", type: 1000, userId: "u1" }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }
      if (url.endsWith("/domain") && (init?.method ?? "GET") === "GET") {
        return new Response(
          JSON.stringify({
            data: [{ domainName: "acme.com", id: "dom-1", organizationId: "org-1", txt: "token" }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }
      if (url.includes("/domain/dom-1/verify") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            domainName: "acme.com",
            id: "dom-1",
            organizationId: "org-1",
            txt: "token",
            verifiedDate: "2026-08-28T00:00:00Z",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }
      return new Response("Not found", { status: 404 })
    }) as unknown as typeof fetch

    const client = organizationApiClientCreate({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
    })

    const eventsRes = await client.organizationEventList("org-1")
    expect(eventsRes.success).toBe(true)
    if (eventsRes.success) {
      expect(eventsRes.data.data).toHaveLength(1)
      expect(eventsRes.data.continuationToken).toBe("tok-next")
    }

    const domainListRes = await client.organizationDomainList("org-1")
    expect(domainListRes.success).toBe(true)

    const verifyRes = await client.organizationDomainVerify("org-1", "dom-1")
    expect(verifyRes.success).toBe(true)
    if (verifyRes.success) {
      expect(verifyRes.data.verifiedDate).toBe("2026-08-28T00:00:00Z")
    }
  })

  test("sso endpoints get and save configuration", async () => {
    let savedBody = ""
    const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith("/sso") && (init?.method ?? "GET") === "GET") {
        return new Response(
          JSON.stringify({
            Data: { Authority: "https://login.example.com" },
            Enabled: true,
            Identifier: "acme",
            Urls: { CallbackPath: "https://vault.example.com/oidc-signin" },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }
      if (url.endsWith("/sso") && init?.method === "POST") {
        savedBody = (init?.body as string) ?? ""
        return new Response(
          JSON.stringify({
            Data: { Authority: "https://login.example.com" },
            Enabled: true,
            Identifier: "acme",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }
      return new Response("Not found", { status: 404 })
    }) as unknown as typeof fetch

    const client = organizationApiClientCreate({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
    })

    const ssoGetRes = await client.organizationSsoGet("org-1")
    expect(ssoGetRes.success).toBe(true)
    if (ssoGetRes.success) {
      expect(ssoGetRes.data.Enabled).toBe(true)
      expect(ssoGetRes.data.Identifier).toBe("acme")
    }

    const ssoSaveRes = await client.organizationSsoSave("org-1", {
      data: { Authority: "https://login.example.com" },
      enabled: true,
      identifier: "acme",
    })
    expect(ssoSaveRes.success).toBe(true)
    expect(JSON.parse(savedBody)).toEqual({
      data: { Authority: "https://login.example.com" },
      enabled: true,
      identifier: "acme",
    })
  })

  test("handles HTTP failure cleanly as Result error without throwing", async () => {
    const mockFetch = (async () => {
      return new Response("Unauthorized", { status: 401 })
    }) as unknown as typeof fetch

    const client = organizationApiClientCreate({
      baseUrl: "https://api.example.com",
      fetchFn: mockFetch,
    })

    const res = await client.organizationGet("org-invalid")
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.op).toBe("organizationGet")
      expect(res.errorMessage).toContain("401")
    }
  })
})
