import { expect, test } from "bun:test"
import { vaultCollectionApiFetch } from "../../../src/web/vault/api/vaultCollectionApiFetch.js"
import { vaultFolderApiFetch } from "../../../src/web/vault/api/vaultFolderApiFetch.js"
import { vaultSyncApiFetch } from "../../../src/web/vault/api/vaultSyncApiFetch.js"

test("vaultSyncApiFetch parses sync response successfully", async () => {
  const mockFetch = async () => {
    return new Response(
      JSON.stringify({
        profile: { id: "u-1", name: "User", email: "user@example.com", organizations: [] },
        folders: [{ id: "f-1", name: "General" }],
        collections: [],
        ciphers: [
          {
            id: "c-1",
            type: 1,
            name: "Login Item",
            login: { username: "user", password: "pwd" },
            favorite: false,
          },
        ],
        object: "sync",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )
  }

  const result = await vaultSyncApiFetch({ fetch: mockFetch })
  expect(result.success).toBe(true)
  if (result.success) {
    expect(result.data.profile.email).toBe("user@example.com")
    expect(result.data.folders.length).toBe(1)
    expect(result.data.ciphers?.length).toBe(1)
  }
})

test("vaultSyncApiFetch returns error on non-200 response", async () => {
  const mockFetch = async () => {
    return new Response("Unauthorized", { status: 401, statusText: "Unauthorized" })
  }

  const result = await vaultSyncApiFetch({ fetch: mockFetch })
  expect(result.success).toBe(false)
  if (!result.success) {
    expect(result.statusCode).toBe(401)
  }
})

test("vaultFolderApiFetch parses folder list successfully", async () => {
  const mockFetch = async () => {
    return new Response(
      JSON.stringify({
        data: [{ id: "f-1", name: "Work" }],
        object: "list",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )
  }

  const result = await vaultFolderApiFetch({ fetch: mockFetch })
  expect(result.success).toBe(true)
  if (result.success) {
    expect(result.data.length).toBe(1)
    expect(result.data[0]?.name).toBe("Work")
  }
})

test("vaultCollectionApiFetch parses collection list successfully", async () => {
  const mockFetch = async () => {
    return new Response(
      JSON.stringify({
        data: [{ id: "col-1", organizationId: "org-1", name: "Engineering" }],
        object: "list",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )
  }

  const result = await vaultCollectionApiFetch({ fetch: mockFetch })
  expect(result.success).toBe(true)
  if (result.success) {
    expect(result.data.length).toBe(1)
    expect(result.data[0]?.name).toBe("Engineering")
  }
})
