import { describe, expect, test } from "bun:test"
import { cipherApiClientCreate } from "../../../src/web/ciphers/actions/cipherApiClientCreate.js"
import type { CipherFormData } from "../../../src/web/ciphers/schemas/cipherFormDataSchema.js"

describe("cipherApiClientCreate", () => {
  test("lists ciphers using GET /api/ciphers", async () => {
    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      expect(url).toBe("https://vault.example.com/api/ciphers")
      expect(init?.method).toBe("GET")
      expect((init?.headers as any)?.authorization).toBe("Bearer test-token")

      return new Response(
        JSON.stringify({
          data: [
            {
              id: "cipher-1",
              type: 1,
              name: "Test Login",
              favorite: true,
              fields: [],
              login: { username: "user1", password: "pw1" },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    const client = cipherApiClientCreate({
      baseUrl: "https://vault.example.com",
      fetch: mockFetch,
      accessToken: () => "test-token",
    })

    const result = await client.list()
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0]?.name).toBe("Test Login")
    }
  })

  test("creates a cipher using POST /api/ciphers", async () => {
    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      expect(url).toBe("https://vault.example.com/api/ciphers")
      expect(init?.method).toBe("POST")
      const body = JSON.parse(String(init?.body))
      expect(body.name).toBe("New Login")
      expect(body.type).toBe(1)

      return new Response(
        JSON.stringify({
          id: "new-cipher-id",
          type: 1,
          name: "New Login",
          favorite: false,
          fields: [],
          login: { username: "newuser", password: "newpassword" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    const client = cipherApiClientCreate({
      baseUrl: "https://vault.example.com",
      fetch: mockFetch,
    })

    const formData: CipherFormData = {
      type: 1,
      name: "New Login",
      favorite: false,
      username: "newuser",
      password: "newpassword",
      fields: [],
    }

    const result = await client.create(formData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe("new-cipher-id")
      expect(result.data.name).toBe("New Login")
    }
  })

  test("updates a cipher using PUT /api/ciphers/:id", async () => {
    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      expect(url).toBe("https://vault.example.com/api/ciphers/cipher-99")
      expect(init?.method).toBe("PUT")

      return new Response(
        JSON.stringify({
          id: "cipher-99",
          type: 2,
          name: "Updated Note",
          notes: "Updated secret notes content",
          favorite: true,
          fields: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    const client = cipherApiClientCreate({
      baseUrl: "https://vault.example.com",
      fetch: mockFetch,
    })

    const formData: CipherFormData = {
      type: 2,
      name: "Updated Note",
      notes: "Updated secret notes content",
      favorite: true,
      fields: [],
    }

    const result = await client.update("cipher-99", formData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe("cipher-99")
      expect(result.data.notes).toBe("Updated secret notes content")
    }
  })

  test("updates favorite status using PUT /api/ciphers/:id/partial", async () => {
    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      expect(url).toBe("https://vault.example.com/api/ciphers/cipher-1/partial")
      expect(init?.method).toBe("PUT")
      const body = JSON.parse(String(init?.body))
      expect(body.favorite).toBe(true)

      return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } })
    }

    const client = cipherApiClientCreate({
      baseUrl: "https://vault.example.com",
      fetch: mockFetch,
    })

    const result = await client.favorite("cipher-1", true)
    expect(result.success).toBe(true)
  })

  test("soft deletes a cipher (moves to trash) using PUT /api/ciphers/:id/delete", async () => {
    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://vault.example.com/api/ciphers/cipher-del-1/delete")
      expect(init?.method).toBe("PUT")
      return new Response(null, { status: 200 })
    }

    const client = cipherApiClientCreate({ baseUrl: "https://vault.example.com", fetch: mockFetch })
    const result = await client.softDelete("cipher-del-1")
    expect(result.success).toBe(true)
  })

  test("hard deletes a cipher permanently using DELETE /api/ciphers/:id", async () => {
    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://vault.example.com/api/ciphers/cipher-del-2")
      expect(init?.method).toBe("DELETE")
      return new Response(null, { status: 200 })
    }

    const client = cipherApiClientCreate({ baseUrl: "https://vault.example.com", fetch: mockFetch })
    const result = await client.hardDelete("cipher-del-2")
    expect(result.success).toBe(true)
  })

  test("restores a soft-deleted cipher using PUT /api/ciphers/:id/restore", async () => {
    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://vault.example.com/api/ciphers/cipher-res-1/restore")
      expect(init?.method).toBe("PUT")
      return new Response(
        JSON.stringify({
          id: "cipher-res-1",
          type: 1,
          name: "Restored Login",
          deletedDate: null,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    const client = cipherApiClientCreate({ baseUrl: "https://vault.example.com", fetch: mockFetch })
    const result = await client.restore("cipher-res-1")
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Restored Login")
      expect(result.data.deletedDate).toBeNull()
    }
  })

  test("shares a cipher to an organization using POST /api/ciphers/:id/share", async () => {
    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://vault.example.com/api/ciphers/cipher-share-1/share")
      expect(init?.method).toBe("POST")
      const body = JSON.parse(String(init?.body))
      expect(body.collectionIds).toEqual(["col-1", "col-2"])
      expect(body.cipher.name).toBe("Shared Item")

      return new Response(
        JSON.stringify({
          id: "cipher-share-1",
          type: 1,
          name: "Shared Item",
          organizationId: "org-1",
          collectionIds: ["col-1", "col-2"],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      )
    }

    const client = cipherApiClientCreate({ baseUrl: "https://vault.example.com", fetch: mockFetch })
    const result = await client.share("cipher-share-1", "org-1", ["col-1", "col-2"], {
      type: 1,
      name: "Shared Item",
      favorite: false,
      fields: [],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.organizationId).toBe("org-1")
      expect(result.data.collectionIds).toEqual(["col-1", "col-2"])
    }
  })

  test("uploads and deletes attachments", async () => {
    let uploadCalled = false
    let deleteCalled = false

    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes("/attachment") && init?.method === "POST") {
        uploadCalled = true
        expect(init.body).toBeInstanceOf(FormData)
        return new Response(
          JSON.stringify({
            id: "cipher-att-1",
            type: 1,
            name: "Item with Att",
            attachments: [
              {
                id: "att-123",
                fileName: "secret.pdf",
                size: "1024",
                sizeName: "1.00 KB",
                url: "https://vault.example.com/attachments/cipher-att-1/att-123?token=xyz",
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }

      if (url.includes("/attachment/att-123") && init?.method === "DELETE") {
        deleteCalled = true
        return new Response(null, { status: 200 })
      }

      return new Response(null, { status: 404 })
    }

    const client = cipherApiClientCreate({ baseUrl: "https://vault.example.com", fetch: mockFetch })
    const uploadRes = await client.uploadAttachment("cipher-att-1", new Blob(["test data"]), "secret.pdf")
    expect(uploadRes.success).toBe(true)
    expect(uploadCalled).toBe(true)
    if (uploadRes.success) {
      expect(uploadRes.data.attachments).toHaveLength(1)
      expect(uploadRes.data.attachments?.[0]?.fileName).toBe("secret.pdf")
    }

    const deleteRes = await client.deleteAttachment("cipher-att-1", "att-123")
    expect(deleteRes.success).toBe(true)
    expect(deleteCalled).toBe(true)
  })

  test("clones a cipher", async () => {
    let getCalled = false
    let createCalled = false

    const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url === "https://vault.example.com/api/ciphers/cipher-orig" && init?.method === "GET") {
        getCalled = true
        return new Response(
          JSON.stringify({
            id: "cipher-orig",
            type: 1,
            name: "Original Secret",
            login: { username: "orig_user", password: "orig_password" },
            fields: [],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }

      if (url === "https://vault.example.com/api/ciphers" && init?.method === "POST") {
        createCalled = true
        const body = JSON.parse(String(init?.body))
        expect(body.name).toBe("Original Secret (Clone)")
        expect(body.login.username).toBe("orig_user")

        return new Response(
          JSON.stringify({
            id: "cipher-clone-new",
            type: 1,
            name: "Original Secret (Clone)",
            login: { username: "orig_user", password: "orig_password" },
            fields: [],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        )
      }

      return new Response(null, { status: 404 })
    }

    const client = cipherApiClientCreate({ baseUrl: "https://vault.example.com", fetch: mockFetch })
    const result = await client.clone("cipher-orig")
    expect(result.success).toBe(true)
    expect(getCalled).toBe(true)
    expect(createCalled).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe("cipher-clone-new")
      expect(result.data.name).toBe("Original Secret (Clone)")
    }
  })
})
