import { describe, expect, test } from "bun:test"
import { webAuthApiClientCreate } from "../../../src/web/auth/model/webAuthApiClientCreate.js"

describe("webAuthApiClient.setPassword", () => {
  test("posts the bitwarden-shaped payload to /api/accounts/set-password with a bearer token", async () => {
    const calls: Array<{ url: string; method: string; headers: Headers; body: string }> = []
    const apiClient = webAuthApiClientCreate({
      fetch: async (input, init) => {
        calls.push({
          url: String(input),
          method: String(init?.method),
          headers: new Headers(init?.headers),
          body: String(init?.body),
        })
        return Response.json({ object: "set-password", captchaBypassToken: "" })
      },
    })

    const result = await apiClient.setPassword({
      accessToken: "access-token-1",
      masterPasswordHash: "hash==",
      userSymmetricKey: "2.wrapped==",
      masterPasswordHint: "hint",
      kdf: 0,
      kdfIterations: 600_000,
      kdfMemory: null,
      kdfParallelism: null,
      keys: { encryptedPrivateKey: "2.private==", publicKey: "public==" },
    })

    expect(result.success).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe("/api/accounts/set-password")
    expect(calls[0]?.method).toBe("POST")
    expect(calls[0]?.headers.get("authorization")).toBe("Bearer access-token-1")
    expect(calls[0]?.headers.get("content-type")).toBe("application/json")
    expect(JSON.parse(calls[0]?.body ?? "{}")).toEqual({
      masterPasswordHash: "hash==",
      key: "2.wrapped==",
      masterPasswordHint: "hint",
      kdf: 0,
      kdfIterations: 600_000,
      kdfMemory: null,
      kdfParallelism: null,
      keys: { encryptedPrivateKey: "2.private==", publicKey: "public==" },
    })
  })

  test("rejects an invalid request before performing any fetch", async () => {
    let called = false
    const apiClient = webAuthApiClientCreate({
      fetch: async () => {
        called = true
        return Response.json({ object: "set-password" })
      },
    })

    const result = await apiClient.setPassword({
      accessToken: "",
      masterPasswordHash: "hash==",
      userSymmetricKey: "2.wrapped==",
      kdf: 0,
      kdfIterations: 600_000,
      keys: { encryptedPrivateKey: "2.private==", publicKey: "public==" },
    })

    expect(result.success).toBe(false)
    expect(called).toBe(false)
  })
})
