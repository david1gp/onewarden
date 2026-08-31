import { expect, test } from "bun:test"
import { extensionSessionHandoffCreate } from "../../../src/extension/handoff/extensionSessionHandoffCreate.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { sessionHandoffFragmentParse } from "../../../src/shared/sessionHandoff/sessionHandoffFragmentParse.js"

test("extension session handoff creates a fragment URL without transferring the local key to the server", async () => {
  const transferKey = new Uint8Array(32).fill(5)
  let apiRequest: unknown
  const result = await extensionSessionHandoffCreate({
    accessToken: "access-token",
    apiClient: {
      sessionHandoffCreate: (request) => {
        apiRequest = request
        return Promise.resolve(resultCreate({ token: "A".repeat(43), expiresAt: "2026-08-31T12:00:45.000Z" }))
      },
    },
    cipherId: null,
    operation: "create",
    prefillUrl: "https://current.example/login?from=extension",
    vaultSession: {
      sessionHandoffEncrypt: () =>
        Promise.resolve(
          resultCreate({
            transferKey,
            encryptedUserKey: { algorithm: "AES-GCM" as const, iv: "B".repeat(16), ciphertext: "C".repeat(107) },
          }),
        ),
    },
    webVaultOrigin: "https://vault.example",
  })

  expect(result.success).toBe(true)
  if (result.success) {
    const url = new URL(result.data)
    expect(`${url.origin}${url.pathname}`).toBe("https://vault.example/ciphers/new")
    expect(url.hash).toStartWith("#onewarden-handoff=")
    const fragmentResult = sessionHandoffFragmentParse(url.hash)
    expect(fragmentResult).toMatchObject({
      success: true,
      data: { operation: "create", prefillUrl: "https://current.example/login?from=extension" },
    })
  }
  expect(apiRequest).toMatchObject({
    accessToken: "access-token",
    operation: "create",
    cipherId: null,
    encryptedUserKey: { algorithm: "AES-GCM" },
  })
  expect(apiRequest).not.toHaveProperty("transferKey")
  expect(transferKey).toEqual(new Uint8Array(32))
})
